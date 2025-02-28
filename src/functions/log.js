'use strict';

const { util: coreUtil, enums } = require('middleware-util');

async function init(context, correlationId, requestId, uniqueIds = []) {
    context.correlationId = correlationId;
    context.requestId = `${requestId}`;
    context.uniqueIds = uniqueIds.concat([correlationId, requestId, context?.invocationId]);
    context.payloads = [];
    context.monProToken = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.MONITOR_PRO_LOG_PWD);
    console.log('Initialized monitor-pro logging'); 
}

function publish(context, message) {
    try {
        console.log('Publishing monitor-pro log', message);
        const url = `${process.env.MONITOR_PRO_LOG_URL}/${coreUtil.generateUuid()}`;
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-api-key': context.monProToken
        };
        coreUtil.http(context, url, 'PUT', headers, message).then();
        console.log('Published monitor-pro log', message);
    } catch (error) {
        console.error('Encountered error while pushing log to monitor-pro', error);
        context.error('Encountered error while pushing log to monitor-pro', error);
    }
}

function getCommonLogProperties(context) {
    return {
        Source_App: 'Azure',
        Service_Name: 'FourKites_Integration',
        Component_Name: `fn-${process.env.STAGE}-fourkites-integration`,
        Method: context?.functionName,
        Unique_ID: context?.uniqueIds,
        Correlation_Id: context?.correlationId,
        Request_Id: context?.requestId,
        Timestamp: coreUtil.getTime("yyyy-mm-dd HH:MM:ss.l")
    };
}

async function info(context, msg = null, payload = null, isPublish = false) {
    if (!isPublish) {
        if (!coreUtil.isPresent(context.payloads)) {
            context.payloads = [];
        }
        context.payloads.push(`${msg} :: ${coreUtil.stringifyObj(payload)} \n`);
    }
    else {
        const logProps = getCommonLogProperties(context);
        const logDetails = {};
        payload = [payload, ...context.payloads];
        coreUtil.addIfPresent(logDetails, 'Payload', coreUtil.stringifyObj(payload));
        coreUtil.addIfPresent(logDetails, 'SuccessMessage', msg);
        coreUtil.addIfPresent(logProps, 'Log_Details', Object.keys(logDetails).length > 0 ? logDetails : null);
        coreUtil.addIfPresent(logProps, 'Log_Level', enums.LOG_LEVEL.INFO);
        publish(context, logProps);
        context.payloads = [];
    }
}

async function debug(context, msg = null, payload = null, isPublish = false) {
    const DEBUG = process.env.DEBUG || false;
    if (!DEBUG) {
        return;
    };

    if (!isPublish) {
        if (!coreUtil.isPresent(context.payloads)) {
            context.payloads = [];
        }
        context.payloads.push(`${msg} :: ${coreUtil.stringifyObj(payload)} \n`);
    }
    else {
        const logProps = getCommonLogProperties(context);
        const logDetails = {};
        payload = [payload, ...context.payloads];
        coreUtil.addIfPresent(logDetails, 'Payload', coreUtil.stringifyObj(payload));
        coreUtil.addIfPresent(logDetails, 'SuccessMessage', msg);
        coreUtil.addIfPresent(logProps, 'Log_Details', Object.keys(logDetails).length > 0 ? logDetails : null);
        coreUtil.addIfPresent(logProps, 'Log_Level', enums.LOG_LEVEL.DEBUG);
        publish(context, logProps);
        context.payloads = [];
    }
}

async function error(context, error = null, payload = null, errorMsg = null, code = null) {
    const logProps = getCommonLogProperties(context);
    const logDetails = {};
    payload = [payload, ...context.payloads];
    coreUtil.addIfPresent(logDetails, 'Payload', coreUtil.stringifyObj(payload));
    coreUtil.addIfPresent(logDetails, 'ErrorMessage', coreUtil.isPresent(errorMsg) ? errorMsg : error?.message || error?.toString());
    coreUtil.addIfPresent(logDetails, 'StatusCode', coreUtil.isPresent(code) ? code : error?.statusCode);
    coreUtil.addIfPresent(logDetails, 'FlowTrace', error?.stack);
    coreUtil.addIfPresent(logProps, 'Log_Details', Object.keys(logDetails).length > 0 ? logDetails : null);
    coreUtil.addIfPresent(logProps, 'Log_Level', enums.LOG_LEVEL.ERROR);
    publish(context, logProps);
    context.payloads = [];
}

module.exports = {
    init,
    getCommonLogProperties,
    info,
    debug,
    error
};
