'use strict';

const { HttpResponse } = require('@azure/functions');
const validator = require('tv4');
const error = require("./error");
const variable = require('./variable');
const commonUtil = require('./commonUtil');
const enums = require('./enum');
const axios = require("axios");
const handlebars = require('handlebars');
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");
const { TableClient, odata } = require("@azure/data-tables");


const isArray = commonUtil.isArray;
const isObject = commonUtil.isObject;
const isPresent = commonUtil.isPresent;
const hasProperties = commonUtil.hasProperties;
const generateUuid = commonUtil.generateUuid;
const addIfPresent = commonUtil.addIfPresent;
const getPstTime = commonUtil.getPstTime;
const sleep = commonUtil.sleep;
const isCyclicObj = commonUtil.isCyclicObj;
const stringifyObj = commonUtil.stringifyObj;
const getTime = commonUtil.getTime;
const isValidDate = commonUtil.isValidDate;
const xml2js = commonUtil.xml2js;
const getTextFromXmlObj = commonUtil.getTextFromXmlObj;

async function validateRequest(request, paramsToCheck = []) {

    const requestBody = await request.json();

    let validation = {
        status: false,
        props: paramsToCheck
    };

    if (isPresent(paramsToCheck) && isArray(paramsToCheck) && paramsToCheck.length > 0) {
        validation = hasProperties(requestBody, paramsToCheck);
    }

    if (validation.status === false) {
        throw new error.ValidationError('Missing params: (' + validation.props.toString() + ')');
    }
}

function validateSchema(object, schema, errorOnFailure = true) {
    const result = validator.validate(object, schema);
    let message = '';
    if (result === false) {
        try {
            if (isPresent(validator.error.dataPath) && validator.error.dataPath.length !== 0) {
                message = validator.error.message + ' -> ' + validator.error.dataPath;
            }
            else {
                message = validator.error.message;
            }
        } catch (err) {
            console.error(err);
            message = 'Unable to compose error message.';
        }

        if (errorOnFailure === true) {
            throw new error.ValidationError(message);
        }
    }

    return {
        successful: result,
        message
    }
}

async function generateSuccessResponse(context, data, status = 200) {
    const response = {
        status
    };

    addIfPresent(response, 'jsonBody', data);
    context.info('Sending response', response);
    return new HttpResponse(response);
}

async function generateErrorResponse(context, error, code, data) {

    const statusCode = isPresent(code) ? code : isPresent(error.statusCode) ? error.statusCode : 500;
    const errorMessage = isPresent(error.message) ? error.message : 'Internal Server Error';
    const errorCode = error.code;
    const body = data || { message: `${errorCode} : ${errorMessage}` };

    const response = {
        status: statusCode,
        jsonBody: body
    };

    context.error('Sending error response', response);

    return new HttpResponse(response);
}

async function registerRequest(request, context, requestSource = enums.REQUEST_SOURCE.HTTP) {
    context.log('context: ', JSON.stringify(context));

    switch (requestSource) {
        case enums.REQUEST_SOURCE.HTTP: {
            request = request.clone();  // Azure function app (4.x) doesn't allow to parse the body twice
            context.log('query: ', request.query);
            context.log('params: ', request.params);
            context.log('headers: ', request.headers);
            context.log('body: ', await request.text());

            if (isPresent(request.headers) && request.headers.get('client-ip')) {
                context.log('Incoming request IP: ', request.headers.get('client-ip'));
            }
            break;
        }
        case enums.REQUEST_SOURCE.SERVICE_BUS: {
            context.log('Message: ', JSON.stringify(request));
            break;
        }
        default: {
            context.log(`Couldn't determine the request-type : `, request);
            break;
        }
    }

    registerRequestId(context);
    registerFunctionName(context);
}

function registerRequestId(context) {
    const reqId = isPresent(context) && isPresent(context.invocationId) ? context.invocationId : generateUuid();
    variable.setInstanceRequestId(reqId);
    const requestId = variable.getInstanceRequestId();
    context.log('InvocationId: ' + requestId);

    return requestId;
}

function registerFunctionName(context) {
    const name = isPresent(context) && isPresent(context.functionName) ? context.functionName : '';
    variable.setFunctionName(name);
    const functionName = variable.getFunctionName();
    context.log('Function Name: ' + functionName);

    return functionName;
}

async function http(context, url, method = enums.API_METHOD.GET, headers = null, payload = null, validateStatusFn = null, timeout) {
    const req = {
        url,
        method
    };

    commonUtil.addIfPresent(req, 'headers', headers);
    commonUtil.addIfPresent(req, 'data', payload);
    commonUtil.addIfPresent(req, 'validateStatus', validateStatusFn);
    commonUtil.addIfPresent(req, 'timeout', timeout ?? (5 * 60 * 1000));    /* default response timeout 5 min */

    context.info(`Calling ${method} : ${url}`, headers, payload);
    const res = await axios(req);
    context.info(`Received reponse from (${method} : ${url})`, res);
    return res;
}

async function httpWithRetry(context, url, method = enums.API_METHOD.GET, headers = null, payload = null, maxRetry = 1, retryDelayMs = 0, retryDelayType = enums.RETRY_DELAY_TYPE.INCREMENTAL, userErrorsToRetry = [], throwError = false, userErrorsToIgnore = [], timeout = null) {
    let isHttpCallSuccessful = false;
    let res = null;
    let retryCounter = 0;
    do {
        try {
            retryCounter++;
            context.info(`Attempt: ${retryCounter} (${method} : ${url})`);

            const validateStatusFn = (status) => {
                return (status >= 200 && status < 300) || userErrorsToIgnore.includes(status);
            }

            res = await http(context, url, method, headers, payload, validateStatusFn, timeout);

            isHttpCallSuccessful = true;
        } catch (error) {
            context.warn(`HTTP call failed (${method} : ${url})`, error);
            isHttpCallSuccessful = false;
            res = res || error?.response;

            if (retryCounter < maxRetry) {
                const delayTimeFactor = (retryDelayType === enums.RETRY_DELAY_TYPE.STATIC) ? 1 : retryCounter;
                const delayTimeMs = retryDelayMs * delayTimeFactor;
                await commonUtil.sleep(delayTimeMs);
            }
            else {
                if (throwError === true) {
                    throw error;
                }
            }

            if (commonUtil.isArray(userErrorsToRetry) && userErrorsToRetry.length > 0 && !userErrorsToRetry.includes(res?.status)) {
                if (throwError === true) {
                    throw error;
                }
                break;
            }
        }
    } while (retryCounter < maxRetry && isHttpCallSuccessful === false);
    return res;
}

function handlebarCompile(template, data) {
    /* Ref Doc: https://handlebarsjs.com/guide/ */
    handlebars.registerHelper('convert_to_string', function (value) {
        return commonUtil.isObject(value) || commonUtil.isArray(value) ? JSON.stringify(value, null, 2) : value;
    });
    let compiledTemplate = handlebars.compile(template);
    return compiledTemplate(data);
}

async function getSecretValue(vaultName, secretName) {
    const vaultUrl = `https://${vaultName}.vault.azure.net`;

    // Authenticate using Managed Identity
    const credential = new DefaultAzureCredential();

    // Create a client to interact with Key Vault
    const client = new SecretClient(vaultUrl, credential);

    try {
        // Retrieve the secret from Key Vault
        const secret = await client.getSecret(secretName);
        return secret.value;
    } catch (error) {
        throw new Error(`Error retrieving secret '${secretName}' from Key Vault '${vaultName}': ${error.message}`);
    }
}

async function getStorageTableEntity(accountName, tableName, partitionKey, rowKey) {
    const credential = new DefaultAzureCredential();
    const client = new TableClient(`https://${accountName}.table.core.windows.net`, tableName, credential);
    return await client.getEntity(partitionKey, rowKey);
}

async function queryStorageTable(accountName, tableName, query) {
    const entities = [];
    const credential = new DefaultAzureCredential();
    const client = new TableClient(`https://${accountName}.table.core.windows.net`, tableName, credential);
    const entityList = client.listEntities({
        queryOptions: {
            filter: odata(query)
        }
    });

    for await (const entity of entityList) {
        entities.push(entity);
    }

    return entities;
}


module.exports = {
    isArray,
    isObject,
    isPresent,
    hasProperties,
    generateUuid,
    addIfPresent,
    validateRequest,
    validateSchema,
    generateSuccessResponse,
    generateErrorResponse,
    registerRequest,
    getPstTime,
    sleep,
    http,
    httpWithRetry,
    handlebarCompile,
    getSecretValue,
    stringifyObj,
    isCyclicObj,
    getTime,
    isValidDate,
    xml2js,
    getTextFromXmlObj,
    getStorageTableEntity,
    queryStorageTable
};
