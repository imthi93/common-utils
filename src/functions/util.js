'use strict';

const { util: coreUtil, enums: coreEnum, cosmos_mongo, cosmos } = require('middleware-util');
const oracledb = require('oracledb');
const xmlPayloads = require('./xmlPayloads');
const dbXML = require('./dbXML');
let log;
if (process?.env?.USE_APP_INSIGHTS === 'true') {
    log = require('./insights-app');
} else {
    log = require('./log');
}


const TRANSACTION_STATUS_CODE = {
    IN_PROGRESS: 'In Progress',
    IN_TRANSIT: 'In Transit',
    SUCCESS: 'Success',
    ERROR: 'Error'
};

const TRANSACTION_STATUS_LEVEL = {
    GET_SHIPMENT: 'GET_SHIPMENT',
    FETCH_SLOT: 'FETCH_SLOT',
    FIND_SLOT: 'FIND_SLOT',
    RESERVE_SLOT: 'RESERVE_SLOT',
    PULL_TENDER: 'PULL_TENDER',
    BOOK_SLOT: 'BOOK_SLOT'
};

const TRANSACTION_STATUS_FLAG = {
    N: 'N',
    I: 'I',
    P: 'P',
    E: 'E',
    S: 'S'
};

const LOAD_TYPE = {
    CPU: 'CPU',
    VDE: 'VDE'
};

const INCIDENT_TYPE = {
    PICKUP: 'pickup',
    SCHEDULE: 'schedule',
    RESCHEDULE: 'reschedule'
};

const APPOINTMENT_TYPE = {
    PL: 'PL',
    NP: 'NP'
};

const dbDetails = {
    SHIPMENT_LOG_DB: {
        NAME: 'fourkites-integration',
        URL: process.env.SHIPMENT_LOG_DB_URL,
        COLLECTIONS: {
            SHIPMENT_LOGS: 'shipment-logs'
        }
    }
};

let pool;
let connection = null;

async function initializeOracleClient(context) {
    try {
        log.info(context, "Initializing Oracle client");
        oracledb.initOracleClient();
    } catch (err) {
        log.error(context, err, null, "Error initializing Oracle client:");
        throw err; // Fail the function if client cannot be initialized
    }
}

async function getPool(context, dbConfig) {
    if (!pool) {
        await initializeOracleClient(context);
        log.info(context, "Initializing new connection pool");
        pool = await oracledb.createPool({
            user: dbConfig.user,
            password: dbConfig.password,
            connectString: dbConfig.connectString,
            poolMin: 5,
            poolMax: 20,
            poolIncrement: 5,
            // poolTimeout: 10
        });
    }
    return pool;
}

function composeShipmentLogRecord(shipmentDetail) {
    const shipmentRecord = {
        id: '' + shipmentDetail.TRANSACTION_ID,
        TRANSACTION_ID: shipmentDetail.TRANSACTION_ID
    };
    coreUtil.addIfPresent(shipmentRecord, 'SCAC_CODE', shipmentDetail.SCAC_CODE, true);
    coreUtil.addIfPresent(shipmentRecord, 'DELIVERY', shipmentDetail.DELIVERY, true);
    coreUtil.addIfPresent(shipmentRecord, 'ORDER_RELEASE_GID', shipmentDetail.ORDER_RELEASE_GID, true);
    coreUtil.addIfPresent(shipmentRecord, 'TRIP_ID', shipmentDetail.TRIP_ID, true);
    coreUtil.addIfPresent(shipmentRecord, 'CUSTOMER_PO', shipmentDetail.CUSTOMER_PO, true);
    coreUtil.addIfPresent(shipmentRecord, 'SHIPMENT_GID', shipmentDetail.SHIPMENT_GID, true);
    coreUtil.addIfPresent(shipmentRecord, 'SALES_ORDER_NUMBER', shipmentDetail.SALES_ORDER_NUMBER, true);
    coreUtil.addIfPresent(shipmentRecord, 'APPOINTMENT_DATE', shipmentDetail.APPOINTMENT_DATE, true);
    coreUtil.addIfPresent(shipmentRecord, 'SHIPMENT_STATUS', shipmentDetail.SHIPMENT_STATUS, true);
    coreUtil.addIfPresent(shipmentRecord, 'WMS_STATUS', shipmentDetail.WMS_STATUS, true);
    coreUtil.addIfPresent(shipmentRecord, 'DELIVERY_APPOINTMENT', shipmentDetail.DELIVERY_APPOINTMENT, true);
    coreUtil.addIfPresent(shipmentRecord, 'IS_PRELOAD', shipmentDetail.IS_PRELOAD, true);
    coreUtil.addIfPresent(shipmentRecord, 'DEST_LOCATION_GID', shipmentDetail.DEST_LOCATION_GID, true);
    coreUtil.addIfPresent(shipmentRecord, 'CUSTOMER_NAME', shipmentDetail.CUSTOMER_NAME, true);
    coreUtil.addIfPresent(shipmentRecord, 'STOP_LOCATION', shipmentDetail.STOP_LOCATION, true);
    coreUtil.addIfPresent(shipmentRecord, 'ROUTE_CODE_GID', shipmentDetail.ROUTE_CODE_GID, true);
    coreUtil.addIfPresent(shipmentRecord, 'SOURCE', shipmentDetail.SOURCE, true);
    coreUtil.addIfPresent(shipmentRecord, 'SHIPMENT_APPT_START_TIME', shipmentDetail.SHIPMENT_APPT_START_TIME, true);
    coreUtil.addIfPresent(shipmentRecord, 'SHIPMENT_APPT_END_TIME', shipmentDetail.SHIPMENT_APPT_END_TIME, true);
    coreUtil.addIfPresent(shipmentRecord, 'SHIPMENT_LOCATION_RESOURCE_GID', shipmentDetail.SHIPMENT_LOCATION_RESOURCE_GID, true);
    coreUtil.addIfPresent(shipmentRecord, 'PAYMENT_METHOD', shipmentDetail.LOAD_TYPE, true);
    coreUtil.addIfPresent(shipmentRecord, 'SOURCE_OF_API_CALL', shipmentDetail.SOURCE_OF_API_CALL, true);
    coreUtil.addIfPresent(shipmentRecord, 'EMAIL', shipmentDetail.EMAIL, true);
    coreUtil.addIfPresent(shipmentRecord, 'WEIGHT', shipmentDetail.WEIGHT, true);
    coreUtil.addIfPresent(shipmentRecord, 'INDICATOR', shipmentDetail.INDICATOR, true);
    coreUtil.addIfPresent(shipmentRecord, 'TRX_STATUS_FLAG', shipmentDetail.TRX_STATUS_FLAG, true);
    coreUtil.addIfPresent(shipmentRecord, 'TRX_STATUS_CODE', shipmentDetail.TRX_STATUS_CODE, true);
    coreUtil.addIfPresent(shipmentRecord, 'TRX_ERROR_MESSAGE', shipmentDetail.TRX_ERROR_MESSAGE, true);
    coreUtil.addIfPresent(shipmentRecord, 'SCHEDULE_INDICATOR', shipmentDetail.SCHEDULE_INDICATOR, true);
    coreUtil.addIfPresent(shipmentRecord, 'REASON_CODE', shipmentDetail.REASON_CODE, true);
    coreUtil.addIfPresent(shipmentRecord, 'SHIPMENT_INDICATOR', shipmentDetail.SHIPMENT_INDICATOR, true);
    coreUtil.addIfPresent(shipmentRecord, 'REF_VALUE', shipmentDetail.REF_VALUE, true);
    coreUtil.addIfPresent(shipmentRecord, 'PICKUP_ADDRESS', shipmentDetail.PICKUP_ADDRESS, true);
    coreUtil.addIfPresent(shipmentRecord, 'DESTINATION_ADDRESS', shipmentDetail.DESTINATION_ADDRESS, true);
    coreUtil.addIfPresent(shipmentRecord, 'TOT_PALLET', shipmentDetail.TOT_PALLET, true);
    coreUtil.addIfPresent(shipmentRecord, 'RATE_OFFERING_GID', shipmentDetail.RATE_OFFERING_GID, true);
    coreUtil.addIfPresent(shipmentRecord, 'LATE_PICKUP_DATE', shipmentDetail.LATE_PICKUP_DATE, true);
    coreUtil.addIfPresent(shipmentRecord, 'INCIDENT_TYPE', shipmentDetail.INCIDENT_TYPE, true);
    coreUtil.addIfPresent(shipmentRecord, 'TRANSACTION_NUMBER', shipmentDetail.TRANSACTION_NUMBER, true);

    /* loop through the custom attributes */
    const customAttributesArray = shipmentDetail?.CUSTOM_ATTRIBUTES?.CUSTOM_ATTRIBUTES_ITEM || shipmentDetail?.CUSTOM_ATTRIBUTES || [];
    for (const customAttribute of customAttributesArray) {
        coreUtil.addIfPresent(shipmentRecord, customAttribute.ATTRIBUTE_NAME, customAttribute.ATTRIBUTE_VALUE, true);
    }

    return shipmentRecord;
}

function composeShipmentResponse(shipmentDetail) {
    const shipmentRecord = {
        TransactionId: shipmentDetail.TRANSACTION_ID
    };
    coreUtil.addIfPresent(shipmentRecord, 'Delivery', shipmentDetail.DELIVERY, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'OrderReleaseGID', shipmentDetail.ORDER_RELEASE_GID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'TripID', shipmentDetail.TRIP_ID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'CustomerPO', shipmentDetail.CUSTOMER_PO, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ShipmentGID', shipmentDetail.SHIPMENT_GID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'SalesOrderNumber', shipmentDetail.SALES_ORDER_NUMBER, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ShipmentStatus', shipmentDetail.SHIPMENT_STATUS, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'WMSStatus', shipmentDetail.WMS_STATUS, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'IsPreload', shipmentDetail.IS_PRELOAD, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'CustomerName', shipmentDetail.CUSTOMER_NAME, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'StopLocation', shipmentDetail.STOP_LOCATION, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Rate_Geo_GID', shipmentDetail.ROUTE_CODE_GID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Source', shipmentDetail.SOURCE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'LoadType', shipmentDetail.LOAD_TYPE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'SourceOfApICall', shipmentDetail.SOURCE_OF_API_CALL, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Email', shipmentDetail.EMAIL, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Weight', shipmentDetail.WEIGHT, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Indicator', shipmentDetail.INDICATOR, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'TransactionStatusCode', shipmentDetail.TRX_STATUS_CODE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ErrorDescription', shipmentDetail.TRX_ERROR_MESSAGE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ScheduleIndicator', shipmentDetail.SCHEDULE_INDICATOR, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ReasonCode', shipmentDetail.REASON_CODE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ShipmentIndicator', shipmentDetail.SHIPMENT_INDICATOR, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'RefValue', shipmentDetail.REF_VALUE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'PickupAddress', shipmentDetail.PICKUP_ADDRESS, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'DestinationAddress', shipmentDetail.DESTINATION_ADDRESS, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'TotalPallet', shipmentDetail.TOT_PALLET, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'RateOfferingGid', shipmentDetail.RATE_OFFERING_GID, true, true);

    /* convert to string */
    shipmentRecord.Weight = shipmentRecord?.Weight?.toString();

    /* convert date to 12 hours format */
    shipmentRecord.AppointmentDate = convertTo12HourDateFormat(shipmentDetail.APPOINTMENT_DATE);
    shipmentRecord.DeliveryAppointment = convertTo12HourDateFormat(shipmentDetail.DELIVERY_APPOINTMENT);
    shipmentRecord.OrderLatePickupDate = convertTo12HourDateFormat(shipmentDetail.LATE_PICKUP_DATE);

    /* loop through the custom attributes */
    const customAttributesArray = shipmentDetail?.CUSTOM_ATTRIBUTES?.CUSTOM_ATTRIBUTES_ITEM || shipmentDetail?.CUSTOM_ATTRIBUTES || [];
    let newCustArray = [];
    for (const cusObj of customAttributesArray) {
        newCustArray.push({ attributeName: cusObj.ATTRIBUTE_NAME ?? '', attributeType: cusObj.ATTRIBUTE_TYPE ?? '', attributeValue: cusObj.ATTRIBUTE_VALUE ?? '' })
    }
    coreUtil.addIfPresent(shipmentRecord, 'customAttributes', newCustArray.length > 0 ? newCustArray : null);

    return shipmentRecord;
}

async function consumeShipmentLogs_old(context, shipmentDetail, isNewRecord) {

    let shipmentLogRecord = composeShipmentLogRecord(shipmentDetail);
    shipmentLogRecord = addTransactionStatusLevel(shipmentLogRecord, coreEnum.TRX_STATUS_LEVEL.GET_SHIPMENT);
    /* ToDo: TRX status flag yet to be implemented */
    shipmentLogRecord = addTransactionStatusFlag(shipmentLogRecord, null);
    shipmentLogRecord = addAuditAttributes(shipmentLogRecord, isNewRecord);
    log.info(context, "Before upsert", shipmentLogRecord)
    return await upsertShipmentLog(shipmentLogRecord);
}

async function upsertShipmentLog(shipmentLogRecord) {
    const SHIPMENT_LOG_TABLE = new cosmos_mongo.db(dbDetails.SHIPMENT_LOG_DB.URL, dbDetails.SHIPMENT_LOG_DB.NAME, dbDetails.SHIPMENT_LOG_DB.COLLECTIONS.SHIPMENT_LOGS);
    SHIPMENT_LOG_TABLE.connect();

    const updateParams = {
        query: {
            TRANSACTION_ID: shipmentLogRecord.TRANSACTION_ID
        },
        update: {
            $set: shipmentLogRecord
        },
        options: {
            upsert: true
        }
    };
    return await SHIPMENT_LOG_TABLE.update(updateParams);
}

async function consumeShipmentLogs(context, shipmentDetail, isNewRecord) {

    let shipmentLogRecord = composeShipmentLogRecord(shipmentDetail);
    shipmentLogRecord = addAuditAttributes(shipmentLogRecord, isNewRecord);

    if (isNewRecord) {
        return await writeShipmentLog(shipmentLogRecord);
    }
    else {
        return await updateApptLog(context, shipmentLogRecord.TRANSACTION_ID, shipmentLogRecord);
    }
}

async function updateApptLog(context, transactionId, shipmentLogRecord) {
    const existingShipmentLogRecord = await getShipmentLogByTransactionId(context, transactionId);

    if (coreUtil.isPresent(existingShipmentLogRecord)) {
        return await updateShipmentLog(transactionId, shipmentLogRecord, existingShipmentLogRecord);
    }
    else {
        shipmentLogRecord.id = `${transactionId}`;
        return await writeShipmentLog(shipmentLogRecord);
    }
}

async function getShipmentLogByTransactionId(context, transactionId) {
    let result = null;
    try {
        log.info(context, `Fetching record for id: ${transactionId}`);
        const SHIPMENT_LOG_TABLE = new cosmos.db(process.env.APPOINTMENT_LOG_TABLE_ENDPOINT, cosmos.db.connectionType.CONNECTION_STRING, process.env.APPOINTMENT_LOG_TABLE_KEY);
        SHIPMENT_LOG_TABLE.connect(process.env.APPOINTMENT_LOG_TABLE_DB_NAME, process.env.APPOINTMENT_LOG_TABLE_COLLECTION_NAME);
        /* transactionId is both id and partitionKey */
        result = await SHIPMENT_LOG_TABLE.read(transactionId, transactionId);
        log.info(context, `Fetched record for id: ${transactionId}`, result);
    } catch (error) {
        log.error(context, `Error occurred while fetching appointment log record by transaction id(${transactionId})`, error);
    }
    return result;
}

async function writeShipmentLog(shipmentLogRecord) {
    const SHIPMENT_LOG_TABLE = new cosmos.db(process.env.APPOINTMENT_LOG_TABLE_ENDPOINT, cosmos.db.connectionType.CONNECTION_STRING, process.env.APPOINTMENT_LOG_TABLE_KEY);
    SHIPMENT_LOG_TABLE.connect(process.env.APPOINTMENT_LOG_TABLE_DB_NAME, process.env.APPOINTMENT_LOG_TABLE_COLLECTION_NAME);
    return await SHIPMENT_LOG_TABLE.insert(shipmentLogRecord);
}

async function updateShipmentLog(id, newShipmentLogData, existingShipmentLogData) {
    const SHIPMENT_LOG_TABLE = new cosmos.db(process.env.APPOINTMENT_LOG_TABLE_ENDPOINT, cosmos.db.connectionType.CONNECTION_STRING, process.env.APPOINTMENT_LOG_TABLE_KEY);
    SHIPMENT_LOG_TABLE.connect(process.env.APPOINTMENT_LOG_TABLE_DB_NAME, process.env.APPOINTMENT_LOG_TABLE_COLLECTION_NAME);
    const operations = composePatchOperations(newShipmentLogData, existingShipmentLogData);
    return await SHIPMENT_LOG_TABLE.patch(id, id, operations);
}

function composePatchOperations(data, oldData, operations = [], path = "") {

    if (coreUtil.addIfPresent(data) && coreUtil.isObject(data)) {
        for (const [key, val] of Object.entries(data)) {
            if (coreUtil.isObject(val)) {
                if (!coreUtil.isPresent(oldData[key])) {
                    operations.push({ op: 'set', path: `${path}/${key}`, value: val });
                }
                else {
                    composePatchOperations(val, oldData[key], operations, `${path}/${key}`);
                }
            }
            else {
                if (!coreUtil.isPresent(oldData[key]) || oldData[key] !== val) {
                    operations.push({ op: 'set', path: `${path}/${key}`, value: val });
                }
            }
        }
    }
    return operations;
}

function addAuditAttributes(data, isNewRecord) {
    coreUtil.addIfPresent(data, 'LAST_UPDATE_DATE', coreUtil.getTime('yyyy-mm-dd"T"HH:MM:ss'));
    coreUtil.addIfPresent(data, 'LAST_UPDATED_BY', data.SOURCE_OF_API_CALL);

    if (isNewRecord) {
        coreUtil.addIfPresent(data, 'CREATION_DATE', coreUtil.getTime('yyyy-mm-dd"T"HH:MM:ss'));
        coreUtil.addIfPresent(data, 'CREATED_BY', data.SOURCE_OF_API_CALL);
    }
    return data;
}

async function execStoredProcedure(context, dbConfig, plsql, bindVars = null, isSqlQuery = false) {
    let result = null;

    try {
        log.info(context, 'Initializing DB connection');
        //oracledb.initOracleClient();
        //const pool = await getPool(dbConfig);
        // connection = await oracledb.getConnection(dbConfig);
        //connection = await pool.getConnection();
        await initializeOracleClient(context);
        connection = await oracledb.getConnection(dbConfig);
        log.info(context, 'Successfully connected to DB');
        log.info(context, `Executing PL/SQL query(${plsql}) for Oracle package, bind-vars in payload`, bindVars);
        const response = await connection.execute(plsql, bindVars);
        log.info(context, 'Received response from DB', response);

        result = isSqlQuery ? response : { ...response?.outBinds };
    } catch (error) {
        log.error(context, error, bindVars, 'Encountered error while executing stored procedure.');
        /* Send email notification */
        log.info(context, `Sending email notifiication for the failed OTM operation.`);

        const notificationObj = {
            payload: bindVars,
            errorMsg: 'Encountered error while executing stored procedure.',
            code: error?.code,
            stack: error?.stacktrace
        }
        await sendFailedEventNotification(context, notificationObj, error);
    }
    finally {
        // if (connection) {
        //     await connection.close();
        // }
    }
    return result;
}

async function getShipmentDetailsFromOTM(context, params) {

    const plsql = 'CALL NBL_DIMITRI_AGENT_HELPER.GET_SHIPMENT_DETAILS(:p_transaction_id, :p_transaction_num, :p_source_of_api_call, :p_scac_code, :p_email, :p_incident_type, :p_ref_value, :p_shipment_detail_tbl, :p_status_code, :p_message)';

    const bindVars = {
        p_transaction_id: { dir: oracledb.BIND_IN, type: oracledb.NUMBER, val: params.p_transaction_id },
        p_transaction_num: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: params.p_transaction_num },
        p_source_of_api_call: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: params.p_source_of_api_call },
        p_scac_code: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: params.p_scac_code },
        p_email: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: params.p_email },
        p_incident_type: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: params.p_incident_type },
        p_ref_value: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: params.p_ref_value },
        p_org_id: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: params.p_org_id },
        p_shipment_detail_tbl: { dir: oracledb.BIND_OUT, type: "XXNBL_DIMITRI_SHIPMENT_DETAILS_TBL" },
        p_status_code: { dir: oracledb.BIND_OUT, maxSize: 255 },
        p_message: { dir: oracledb.BIND_OUT, maxSize: 255 }
    };

    const otmDBConfig = await getOTMDBConfig();

    const result = await execStoredProcedure(context, otmDBConfig, plsql, bindVars);

    return {
        status: result?.p_status_code,
        message: result?.p_message,
        shipmentDetails: result?.p_shipment_detail_tbl
    };
}

async function getShipmentDetailsFromOIC(context, transactionNumber, transactionId, email, incidentType, refValue, sourceOfApICall, scacCode, orgCode) {
    const getShipmentPayload = {
        P_TRANSACTION_NUM: transactionNumber
    };
    coreUtil.addIfPresent(getShipmentPayload, 'P_TRANSACTION_ID', transactionId);
    coreUtil.addIfPresent(getShipmentPayload, 'P_EMAIL', email);
    coreUtil.addIfPresent(getShipmentPayload, 'P_INCIDENT_TYPE', incidentType);
    coreUtil.addIfPresent(getShipmentPayload, 'P_REF_VALUE', refValue);
    coreUtil.addIfPresent(getShipmentPayload, 'P_SOURCE_OF_API_CALL', sourceOfApICall);
    coreUtil.addIfPresent(getShipmentPayload, 'P_SCAC_CODE', scacCode);
    coreUtil.addIfPresent(getShipmentPayload, 'P_ORG_ID', orgCode);

    const username = process.env.OIC_USERNAME;
    const authToken = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.OIC_AUTH_KEY);
    const usernameColonKey = `${username}:${authToken}`;
    const basicAuth = `Basic ${Buffer.from(usernameColonKey).toString('base64')}`
    const url = `${process.env.OIC_BASE_URL}/ic/api/integration/v1/flows/rest/NBL_OTM_FK_GETSHIPM/1.0/getShipmentDetails`;
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': basicAuth
    };
    const timeout = 110 * 1000; /* total = 110 sec = 01:50 min */
    log.info(context, 'OIC URL', url);
    const response = await coreUtil.httpWithRetry(context, url, coreEnum.API_METHOD.POST, headers, getShipmentPayload, 3, 5000, coreEnum.RETRY_DELAY_TYPE.INCREMENTAL, [500, 502, 504], true, [], timeout);
    log.info(context, 'Received response from OIC getShipment', response);
    return response?.data;
}

function addTransactionStatusLevel(data, statusLevel) {
    coreUtil.addIfPresent(data, 'TRX_STATUS_LEVEL', statusLevel);
    return data;
}

function addTransactionStatusFlag(data, statusFlag) {
    /* ToDo: function logic yet to be discussed with Rajesh */

    return data;
}

async function sendFailedEventNotification(context, notificationObj, error = null) {

    const errorData = {
        Timestamp: coreUtil.getPstTime(),
        Log_Level: 'ERROR',
        Source_App: 'azure',
        Service_Name: 'FourKites_Integration',
        Component_Name: `fn-${process.env.STAGE}-fourkites-integration`,
        Method: context?.functionName,
        Instance_Id: context?.invocationId,
        Correlation_Id: context?.correlationId,
        Request_Id: context?.transactionNumber
    };

    const logDetails = {};
    coreUtil.addIfPresent(logDetails, 'Payload', notificationObj.payload);
    coreUtil.addIfPresent(logDetails, 'SuccessMessage', notificationObj.msg);
    coreUtil.addIfPresent(logDetails, 'ErrorMessage', coreUtil.isPresent(notificationObj.errorMsg) ? notificationObj.errorMsg : error?.message || error?.toString());
    coreUtil.addIfPresent(logDetails, 'StatusCode', coreUtil.isPresent(notificationObj.code) ? notificationObj.code : error?.response?.status || error?.cause?.code || error?.code);
    coreUtil.addIfPresent(logDetails, 'FlowTrace', coreUtil.isPresent(notificationObj.stack) ? notificationObj.stack : error?.stack);
    coreUtil.addIfPresent(errorData, 'Log_Details', Object.keys(logDetails).length > 0 ? logDetails : null);

    /* Call error notifier to send email */
    /* ERROR_NOTIFIER_URL should be added in the function configurations */
    const url = process.env.ERROR_NOTIFIER_URL;
    const headers = { 'Content-Type': 'application/json' };
    await coreUtil.httpWithRetry(context, url, coreEnum.API_METHOD.POST, headers, errorData, 3, 3000);
}

async function getOTMDBConfig() {
    try {
        let token = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.OTM_DB_PSWD);
        let connectionString = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.OTM_DB_CONN_STRING);
        return {
            user: process.env.OTM_DB_USER,
            password: token,
            connectString: connectionString
        };
    } catch (error) {
        throw error;
    }
}

async function getEBSDBConfig() {
    try {
        let token = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.EBS_DB_PSWD);
        let connectionString = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.EBS_DB_CONN_STRING);
        return {
            user: process.env.EBS_DB_USER,
            password: token,
            connectString: connectionString
        };
    } catch (error) {
        throw error;
    }
}

async function querySlotsFromFourKites(context, load_number, appointment_date, shipping_type = 'outbound') {
    const authToken = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.FOURKITES_AUTH_TOKEN);
    const url = `${process.env.FOURKITES_BASE_URL}/api/v1/fetch_slots?load_number=${load_number}&appointment_date=${appointment_date}&shipping_type=${shipping_type}`;
    log.info(context, 'FourKites URL', url);
    const response = await coreUtil.httpWithRetry(context, url, coreEnum.API_METHOD.GET, { Authorization: authToken });
    log.info(context, 'Received response from FourKites', response);
    return response?.data;
}

async function reserveSlotFourKites(context, loadNum, apptStartTime, apptEndTime, expiryInMins = 5, shippingType = 'outbound') {
    const authToken = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.FOURKITES_AUTH_TOKEN);
    const url = `${process.env.FOURKITES_BASE_URL}/api/v1/reserve_slot`;
    log.info(context, 'Reserve slot URL', url);

    const payload = {
        startTime: apptStartTime,
        endTime: apptEndTime,
        expiryInMins: expiryInMins,
        reservedSlotName: `Dimitri - ${loadNum}`,
        loadNumber: loadNum,
        shippingType: shippingType
    }

    const response = await coreUtil.httpWithRetry(context, url, coreEnum.API_METHOD.POST, { Authorization: authToken }, payload);
    log.info(context, 'Reserve slot response from FourKites', response);
    return response.data;
}

async function bookSlotFourKites(context, loadNum, reservedSlotId, shippingType = 'outbound') {
    const authToken = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.FOURKITES_AUTH_TOKEN);
    const url = `${process.env.FOURKITES_BASE_URL}/api/v1/update_appointment`;
    log.info(context, 'Book slot URL', url);

    const payload = {
        loadNumber: loadNum,
        reservedSlotId: reservedSlotId,
        shippingType: shippingType
    }

    const response = await coreUtil.httpWithRetry(context, url, coreEnum.API_METHOD.PUT, { Authorization: authToken }, payload);
    log.info(context, 'Book slot response from FourKites', response);
    return response.data;
}

async function getShipmentLogByTransactionId_old(context, transactionId) {
    const SHIPMENT_LOG_TABLE = new cosmos_mongo.db(dbDetails.SHIPMENT_LOG_DB.URL, dbDetails.SHIPMENT_LOG_DB.NAME, dbDetails.SHIPMENT_LOG_DB.COLLECTIONS.SHIPMENT_LOGS);
    SHIPMENT_LOG_TABLE.connect();

    const getParams = {
        query: {
            TRANSACTION_ID: transactionId
        }
    };
    log.info(context, 'Fetching shipment appointment log', getParams);
    const apptLog = await SHIPMENT_LOG_TABLE.findOne(getParams);
    log.info(context, 'Fetched shipment appointment log', apptLog);
    return apptLog;
}

async function getProductAvailability(context, deliveryId) {
    const sql = `SELECT MAX(DECODE( NVL( (SELECT mc.segment1 FROM mtl_categories mc ,mtl_category_sets mcs ,mtl_item_categories mtc
        WHERE 1 = 1 AND mcs.category_set_name = 'NBL Make Type' AND mtc.category_set_id = mcs.category_set_id AND mtc.category_id = mc.category_id
        AND mtc.inventory_item_id = msi.inventory_item_id AND mtc.organization_id = msi.organization_id AND ROWNUM < 2 ),'MTO' ),'MTS',
        (lgt.ord_avail_date_time + 3/24),(lgt.ord_avail_date_time + 12/24)) ) AVAILABLE_DATE_TIME FROM mtl_system_items_b msi ,oe_order_headers_all ooh ,
        oe_order_lines_all ool ,wsh_delivery_details wdd ,wsh_delivery_assignments wda ,wsh_new_deliveries wnd ,xxnbl_atp_lgt_stg lgt
        WHERE 1 = 1AND msi.organization_id = ool.SHIP_FROM_ORG_ID AND msi.inventory_item_id = ool.inventory_item_id AND lgt.ord_nbr = ooh.order_number
        AND lgt.ord_line_nbr = ool.line_number AND wda.delivery_id = wnd.delivery_id AND wda.delivery_detail_id = wdd.delivery_detail_id AND
        wdd.source_line_id = ool.line_id AND ooh.header_id = ool.header_id AND wnd.delivery_id = :deliveryId`;

    const ebsDBConfig = await getEBSDBConfig();
    const response = await execStoredProcedure(context, ebsDBConfig, sql, [deliveryId], true);
    log.info(context, 'Received product availability respoonse', response);
    return response;
}

function requestDateValidation(context, origApptDate, apptStartDate, apptEndDate, plantTimezone) {
    let validation = {
        isSuccess: true,
        message: ''
    };
    const isEndDateGreaterThanStartDate = new Date(apptStartDate) <= new Date(apptEndDate);
    if (!isEndDateGreaterThanStartDate) {
        validation.message = 'Requested Pickup appointment start time should be less than Requested Pickup appointment end time and vice versa.';
        validation.isSuccess = false;
        log.info(context, validation.message, { apptStartDate, apptEndDate });
    }

    if (coreUtil.isPresent(origApptDate) && origApptDate !== '') {
        const now = new Date(coreUtil.getTime('yyyy-mm-dd"T"HH:MM:ss', null, plantTimezone));
        const apptDate = new Date(coreUtil.getTime('yyyy-mm-dd"T"HH:MM:ss', origApptDate));
        if (apptDate < now) {
            validation.message = 'The pickup appointment time is in the past and cannot be changed. Please confirm if its shipped already or driver missed the appointment.';
            validation.isSuccess = false;
            log.info(context, validation.message, { origApptDate, apptStartDate, apptEndDate });
        }
    }
    else {
        log.info(context, `Original Appointment date is not available (${origApptDate})`);
    }

    return validation;
}

function validateShipmentGid(apptLogShipmentGid, shipmentGidParam) {
    const result = {
        message: null,
        isSuccess: false
    }

    if (!coreUtil.isPresent(apptLogShipmentGid)) {
        result.message = 'This Transation ID or Shipment GID does not exist, please provide the correct details to process.';
        result.isSuccess = false;
    }
    else if (apptLogShipmentGid !== shipmentGidParam) {
        result.message = 'Combination of Transation ID and Shipment GID is wrong, please provide the correct details to process.';
        result.isSuccess = false;
    }
    else {
        result.isSuccess = true;
    }

    return result;
}

function parseProductAvailability(productAvailabilityRawRes) {

    if (coreUtil.isPresent(productAvailabilityRawRes?.rows)) {
        for (let row of productAvailabilityRawRes?.rows) {
            for (let item of row) {
                return item;
            }
        }
    }
    else {
        return null;
    }
}

function isPostponeRequest(origiinalApptDate, requestedApptStartDate) {
    /* ToDo: check if timezone convrsion required */
    const origApptDate = new Date(origiinalApptDate);
    const requestedApptDate = new Date(requestedApptStartDate);
    return origApptDate <= requestedApptDate;
}

async function updateAppointmentLog_old(trxId, apptStartDate, apptEndDate, trxStatusLevel, trxStatusCode, trxErrorMsg, productAvailableDate, pullTenderRef, fkFetchSlotRef, fkReserveSlotRef, fkBookSlotRef) {

    let updateObj = {};
    coreUtil.addIfPresent(updateObj, 'REQ_APPT_STARTTIME_WINDOW', apptStartDate);
    coreUtil.addIfPresent(updateObj, 'REQ_APPT_ENDTIME_WINDOW', apptEndDate);
    coreUtil.addIfPresent(updateObj, 'TRX_STATUS_LEVEL', trxStatusLevel);
    coreUtil.addIfPresent(updateObj, 'TRX_STATUS_CODE', trxStatusCode);
    coreUtil.addIfPresent(updateObj, 'TRX_ERROR_MESSAGE', trxErrorMsg);
    coreUtil.addIfPresent(updateObj, 'PRODUCT_AVAILABLE_DATE', productAvailableDate);
    coreUtil.addIfPresent(updateObj, 'PULL_TENDER_REFERENCE_TRANSMISSION_NO', pullTenderRef);
    coreUtil.addIfPresent(updateObj, 'FOURKITES_FETCH_SLOT_REQ_ID', fkFetchSlotRef);
    coreUtil.addIfPresent(updateObj, 'FOURKITES_RESERVE_SLOT_REQ_ID', fkReserveSlotRef);
    coreUtil.addIfPresent(updateObj, 'FOURKITES_BOOK_SLOT_REQ_ID', fkBookSlotRef);
    updateObj = addAuditAttributes(updateObj, false);

    const SHIPMENT_LOG_TABLE = new cosmos_mongo.db(dbDetails.SHIPMENT_LOG_DB.URL, dbDetails.SHIPMENT_LOG_DB.NAME, dbDetails.SHIPMENT_LOG_DB.COLLECTIONS.SHIPMENT_LOGS);
    await SHIPMENT_LOG_TABLE.connect();

    const updateParams = {
        query: {
            TRANSACTION_ID: trxId
        },
        update: {
            $set: updateObj
        }
    };
    return await SHIPMENT_LOG_TABLE.update(updateParams);
}

async function updateAppointmentLog(context, trxId, apptStartDate, apptEndDate, trxStatusLevel, trxStatusCode, trxStatusFlag, trxErrorMsg, productAvailableDate, pullTenderRef, fkFetchSlotRef, fkReserveSlotRef, fkBookSlotRef, genRefnumUpdateReqId) {
    try {
        let updateObj = {};
        coreUtil.addIfPresent(updateObj, 'REQ_APPT_STARTTIME_WINDOW', apptStartDate);
        coreUtil.addIfPresent(updateObj, 'REQ_APPT_ENDTIME_WINDOW', apptEndDate);
        coreUtil.addIfPresent(updateObj, 'TRX_STATUS_LEVEL', trxStatusLevel);
        coreUtil.addIfPresent(updateObj, 'TRX_STATUS_CODE', trxStatusCode);
        coreUtil.addIfPresent(updateObj, 'TRX_STATUS_FLAG', trxStatusFlag);
        coreUtil.addIfPresent(updateObj, 'TRX_ERROR_MESSAGE', trxErrorMsg);
        coreUtil.addIfPresent(updateObj, 'PRODUCT_AVAILABLE_DATE', productAvailableDate);
        coreUtil.addIfPresent(updateObj, 'PULL_TENDER_REFERENCE_TRANSMISSION_NO', pullTenderRef);
        coreUtil.addIfPresent(updateObj, 'FOURKITES_FETCH_SLOT_REQ_ID', fkFetchSlotRef);
        coreUtil.addIfPresent(updateObj, 'FOURKITES_RESERVE_SLOT_REQ_ID', fkReserveSlotRef);
        coreUtil.addIfPresent(updateObj, 'FOURKITES_BOOK_SLOT_REQ_ID', fkBookSlotRef);
        coreUtil.addIfPresent(updateObj, 'GEN_REFNUM_UPDATE_REQ_ID', genRefnumUpdateReqId);
        updateObj = addAuditAttributes(updateObj, false);
        return await updateApptLog(context, trxId, updateObj);
    } catch (error) {
        log.error(context, `Failed to update appointment log record for transactioon id`);
    }
}

async function updateAppointmentLogWithObj(context, trxId, updateObj) {
    try {
        updateObj = addAuditAttributes(updateObj, false);
        return await updateApptLog(context, trxId, updateObj);
    } catch (error) {
        log.error(context, `Failed to update appointment log record for transactioon id`);
    }
}

function isProductAvailable(productAvailableDate, reqApptStartDate, reqApptEndDate) {
    const productAvlDate = new Date(productAvailableDate);
    const rApptStartDate = new Date(reqApptStartDate);
    const rApptEndDate = new Date(reqApptEndDate);

    return rApptStartDate > productAvlDate && rApptEndDate > productAvlDate;
}

async function fetchLateDelivery(context, shipmentGid) {
    // const sql = `SELECT 'Y' FROM shipment_refnum
    // WHERE shipment_refnum_qual_gid = 'NBL.ACCEPT_LATE_DELIVERY'
    // AND NVL(shipment_refnum_value,'Y') NOT LIKE '%N%'
    // AND shipment_gid = :id`;

    // const sql = 'select sysdate from dual';

    const sql = `SELECT NVL(sr.shipment_refnum_value,'Y') as product_available
    FROM shipment_refnum sr
    WHERE sr.shipment_refnum_qual_gid = 'NBL.ACCEPT_LATE_DELIVERY'
    AND sr.shipment_gid = :id`;

    const otmDBConfig = await getOTMDBConfig();
    const response = await execStoredProcedure(context, otmDBConfig, sql, [shipmentGid]);
    log.info(context, 'Received latte delivery flag', response);
    return response;
}

function validateTransactionStatus(trxStatusFlag, trxStatusLevel, sourceOfApiCall) {
    const result = {
        message: null,
        isSuccess: true
    }
    if (trxStatusFlag === TRANSACTION_STATUS_FLAG.E && trxStatusLevel === TRANSACTION_STATUS_LEVEL.GET_SHIPMENT) {
        result.isSuccess = false;
        result.message = 'Failed at 1st API, reprocess 1st API and try again';
    }
    else if (trxStatusFlag === TRANSACTION_STATUS_FLAG.P && trxStatusLevel === TRANSACTION_STATUS_LEVEL.FIND_SLOT && sourceOfApiCall !== 'DIMITRI') {
        /* return same slots */
    }
    else if (trxStatusFlag === TRANSACTION_STATUS_FLAG.S && trxStatusLevel === TRANSACTION_STATUS_LEVEL.BOOK_SLOT && sourceOfApiCall !== 'DIMITRI') {
        result.isSuccess = false;
        result.message = 'This shipment is already booked.';
    }
    else if (trxStatusFlag === TRANSACTION_STATUS_FLAG.E && trxStatusLevel === TRANSACTION_STATUS_LEVEL.BOOK_SLOT && sourceOfApiCall !== 'DIMITRI') {
        result.isSuccess = false;
        result.message = 'Already slots are provided for this shipment but failed at appointment booking.';
    }

    return result;
}

function validateDeliveryAppt(loadType, reqApptStartTime, deliveryAppt) {
    const result = {
        message: null,
        isSuccess: true
    }

    const reqStartApptDate = new Date(reqApptStartTime);
    const deliveryApptDate = new Date(deliveryAppt);

    if (coreUtil.addIfPresent(deliveryAppt) && loadType !== LOAD_TYPE.CPU && reqStartApptDate > deliveryApptDate) {
        result.isSuccess = false;
        result.message = 'The pickup appointment time cannot be later than delivery appointment time, please reach out to Niagara execution team for assistance.';
    }

    return result;
}

function evaluateTransitTime(context, transitTimeInHours, reqAppointmentStartTime, reqAppointmentEndTime, deliveryAppointmentTime, slotIntervalInMinutes) {
    let estimatedApptEndTime = null;
    let isEnoughTransitTime = false;
    let deliveryAppt = new Date(deliveryAppointmentTime);
    log.info(context, `deliveryAppt: ${deliveryAppt}`);
    const transitTimeInMinutes = Math.round(transitTimeInHours * 60);
    deliveryAppt.setMinutes(deliveryAppt.getMinutes() - transitTimeInMinutes);
    const deliveryMinusTransit = new Date(deliveryAppt);
    deliveryAppt.setMinutes(deliveryAppt.getMinutes() - slotIntervalInMinutes);
    const deliveryMinusTransitMinusInterval = new Date(deliveryAppt);
    const reqApptStartTime = new Date(reqAppointmentStartTime);
    const reqApptEndTime = new Date(reqAppointmentEndTime);

    log.info(context, `slotIntervalInMinutes: ${slotIntervalInMinutes}`);
    log.info(context, `transitTimeInMinutes: ${transitTimeInMinutes}`);
    log.info(context, `deliveryMinusTransit: ${deliveryMinusTransit}`);
    log.info(context, `deliveryMinusTransitMinusInterval: ${deliveryMinusTransitMinusInterval}`);
    log.info(context, `reqApptStartTime: ${reqApptStartTime}`);
    log.info(context, `reqApptEndTime: ${reqApptEndTime}`);

    /* determine if transit time enough */
    if (deliveryMinusTransitMinusInterval < reqApptStartTime) {
        isEnoughTransitTime = false;
    }
    else {
        isEnoughTransitTime = true;
    }

    /* determine new slot end time */
    if (deliveryMinusTransit < reqApptEndTime) {
        estimatedApptEndTime = deliveryMinusTransit;
    }
    else {
        estimatedApptEndTime = reqApptEndTime;
    }

    log.info(context, `isEnoughTransitTime: ${isEnoughTransitTime}`);
    log.info(context, `estimatedApptEndTime: ${estimatedApptEndTime}`);

    estimatedApptEndTime = coreUtil.getTime('yyyy-mm-dd"T"HH:MM:ss', estimatedApptEndTime);

    return { isEnoughTransitTime, estimatedApptEndTime };
}

function sameDayPickupValidation(origApptDate, reqApptStartDate, reqApptEndDate) {
    const result = {
        message: null,
        isSuccess: true
    }

    const origApptTime = new Date(origApptDate);
    const reqApptStartTime = new Date(reqApptStartDate);
    const reqApptEndTime = new Date(reqApptEndDate);

    const isApptStartDateSame = origApptTime.getFullYear() === reqApptStartTime.getFullYear() && origApptTime.getMonth() === reqApptStartTime.getMonth() && origApptTime.getDay() === reqApptStartTime.getDay();
    const isApptEndDateNotSame = origApptTime.getFullYear() === reqApptEndTime.getFullYear() && origApptTime.getMonth() === reqApptEndTime.getMonth() && origApptTime.getDay() === reqApptEndTime.getDay();

    if (!isApptStartDateSame || !isApptEndDateNotSame) {
        result.isSuccess = false;
        result.message = 'Pickup request cannot be processed, please escalate to Niagara Execution.';
    }

    return result;
}

function getAvailableSlots(context, slotDetails, reqApptStartTime, reqApptEndTime, sortAsc = true) {
    let slots = [];
    const reqAppointmentStartTime = new Date(reqApptStartTime);
    const reqAppointmentEndTime = new Date(reqApptEndTime);
    if (coreUtil.isPresent(slotDetails?.data?.Slots) && coreUtil.isArray(slotDetails.data.Slots)) {
        slots = slotDetails.data.Slots.filter(slot => slot.numberOfSlots > 0 && reqAppointmentStartTime <= new Date(slot.startTime) && reqAppointmentEndTime >= new Date(slot.startTime));
        if (sortAsc) {
            slots.sort((slotA, slotB) => new Date(slotA.startTime) - new Date(slotB.startTime));
        }
        else {
            slots.sort((slotA, slotB) => new Date(slotB.startTime) - new Date(slotA.startTime));
        }
    }
    log.info(context, 'Slot search start time', reqAppointmentStartTime);
    log.info(context, 'Slot search end time range', reqAppointmentEndTime);
    log.info(context, 'Selected slots', slots);
    return slots;
}

// for +- 2 hours logic for CPU
function getRescheduleTimeWithTwoHours(originalAppointmentDate, earliestRescheduleTime, latestRescheduleTime, productAvailableDate) {
    let newCheckRangeStart, newCheckRangeEnd;

    const originalTime = parseDateTime(originalAppointmentDate);
    const latestTime = latestRescheduleTime ? parseDateTime(latestRescheduleTime) : null;
    const earliestTime = earliestRescheduleTime ? parseDateTime(earliestRescheduleTime) : latestTime;

    // If one of them is null, make both the same
    if (!earliestTime) earliestTime = latestTime;
    if (!latestTime) latestTime = earliestTime;

    const isRangeRequest = latestTime && earliestTime && latestTime.getTime() !== earliestTime.getTime();
    const requestedDuration = latestTime && earliestTime ? latestTime - earliestTime : 0;

    if (isRangeRequest && requestedDuration >= 4 * 60 * 60 * 1000) {
        // Case: Requested time range is 4 hours or more, no additional slots needed
        newCheckRangeStart = earliestTime;
        newCheckRangeEnd = latestTime;
    } else if (isRangeRequest) {
        // Extend latest time by 2 hours
        newCheckRangeEnd = addHours(latestTime, 2);

        // Calculate the additional hours needed to make the range 4 hours
        const additionalHoursNeeded = 4 - (newCheckRangeEnd - earliestTime) / (60 * 60 * 1000);
        if (additionalHoursNeeded > 0) {
            newCheckRangeStart = subtractHours(earliestTime, additionalHoursNeeded);
        } else {
            newCheckRangeStart = earliestTime;
        }
    } else if ((originalTime - earliestTime) / (60 * 60 * 1000) < 2) {
        // Case: If requested time is less than 2 hours away from the original time
        if (((latestTime - originalTime) / (60 * 60 * 1000) < 2) && latestTime >= originalTime) {
            newCheckRangeStart = earliestTime;
            newCheckRangeEnd = addHours(latestTime, 2);
        } else {
            newCheckRangeStart = subtractHours(earliestTime, 2);
            newCheckRangeEnd = originalTime;
        }

    } else {
        // Single time request, checking within +-2 hours of the requested time
        newCheckRangeStart = subtractHours(earliestTime, 2);
        newCheckRangeEnd = addHours(latestTime, 2);
    }

    // Prevent new check range from crossing into the next day
    const endOfDay = new Date(originalTime);
    endOfDay.setHours(23, 59, 59, 999);
    if (newCheckRangeEnd > endOfDay) {
        newCheckRangeEnd = endOfDay;
    }

    // Prevent new check range from starting before the beginning of the same day
    const startOfDay = new Date(originalTime);
    startOfDay.setHours(0, 0, 0, 0);
    if (newCheckRangeStart < startOfDay) {
        newCheckRangeStart = startOfDay;
    }

    if (originalTime <= earliestTime) {
        /* postpone */
        /* start time should not be earlier than original appointment */
        if (newCheckRangeStart < originalTime) {
            newCheckRangeStart = originalTime;
        }
    }
    else {
        /* prepone */
        /* end time should not be later than original appointment */
        if (newCheckRangeEnd > originalTime) {
            newCheckRangeEnd = originalTime;
        }

        /* start time should not be earlier than product availability */
        const productAvailable = parseDateTime(productAvailableDate);
        if (newCheckRangeStart < productAvailable) {
            newCheckRangeStart = productAvailable;
        }
    }

    return {
        newCheckRangeStart: newCheckRangeStart,
        newCheckRangeEnd: newCheckRangeEnd
    };
}

// for +- 2 hours logic for VDE
function getRescheduleTimeWithTwoHoursForVDE(context, originalAppointmentDate, earliestRescheduleTime, latestRescheduleTime, estimatedTransitTimeInHour, deliveryAppointment, slotIntervalMinutes, productAvailableDate) {
    let newCheckRangeStart, newCheckRangeEnd;

    const originalTime = parseDateTime(originalAppointmentDate);
    const latestTime = latestRescheduleTime ? parseDateTime(latestRescheduleTime) : null;
    const earliestTime = earliestRescheduleTime ? parseDateTime(earliestRescheduleTime) : latestTime;

    // If one of them is null, make both the same
    if (!earliestTime) earliestTime = latestTime;
    if (!latestTime) latestTime = earliestTime;

    // Adding +-2 hours of the requested time
    newCheckRangeStart = subtractHours(earliestTime, 2);
    newCheckRangeEnd = addHours(latestTime, 2);

    if (originalTime <= earliestTime) {
        /* postpone */
        /* start time should not be earlier than original appointment */
        if (newCheckRangeStart < originalTime) {
            newCheckRangeStart = adjustTimeByInterval(originalTime, slotIntervalMinutes, 'add');
        }
    }
    else {
        /* prepone */
        /* end time should not be later than original appointment */
        if (newCheckRangeEnd > originalTime) {
            newCheckRangeEnd = adjustTimeByInterval(originalTime, slotIntervalMinutes, 'subtract');
        }

        /* start time should not be earlier than product availability */
        const productAvailable = parseDateTime(productAvailableDate);
        if (newCheckRangeStart < productAvailable) {
            newCheckRangeStart = productAvailable;
        }
    }

    log.info(context, `newCheckRangeStart: ${newCheckRangeStart}`);
    log.info(context, `newCheckRangeEnd: ${newCheckRangeEnd}`);

    //Transit time check
    const { isEnoughTransitTime, estimatedApptEndTime } = evaluateTransitTime(context, estimatedTransitTimeInHour, newCheckRangeStart, newCheckRangeEnd, deliveryAppointment, slotIntervalMinutes);
    newCheckRangeEnd = parseDateTime(estimatedApptEndTime);

    return {
        isEnoughTransitTime,
        newCheckRangeStart,
        newCheckRangeEnd
    };
}

function parseDateTime(dateTime) {
    return new Date(dateTime);
}

function adjustTimeByInterval(originalTime, slotIntervalMinutes, operation = 'add') {
    const date = new Date(originalTime);
    const minutes = operation === 'add' ? slotIntervalMinutes : -slotIntervalMinutes;
    return new Date(date.setMinutes(date.getMinutes() + minutes));
}

function formatDateTime(date, originalDateTime) {
    // Preserve the original timezone offset
    const offset = new Date(originalDateTime).getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, -1);
}

function addHours(date, hours) {
    // Create a new Date object to avoid mutating the original
    const newDate = new Date(date.getTime());
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
}

function subtractHours(date, hours) {
    // Create a new Date object to avoid mutating the original
    const newDate = new Date(date.getTime());
    newDate.setHours(newDate.getHours() - hours);
    return newDate;
}

async function pullTender(context, shipmentGid, transactionId) {
    const genAPIAuthKey = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.GEN_API_KEY);
    const url = `${process.env.GEN_API_BASE_URL}/api/${process.env.STAGE}/generic/v1/otmagentcall`;
    log.info(context, 'Pull tender URL', url);

    const payload = {
        TransactionId: transactionId,
        StatusValueGid: 'DIMITRI KEEP REQUEST - PICKUP_APPT_CHANGE',
        StatusTypeGid: 'DIMITRI WITHDRAW KEEP REQUEST',
        ShipmentGid: shipmentGid,
        Remark: [
            {
                RemarkQualifierGid: 'DIMITRI WITHDRAW TENDER REQUEST',
                RemarkText: `PICKUP_APPT_CHANGE - ${coreUtil.getTime('yyyy-mm-dd HH:MM:ss')}`
            }
        ],
        Source: "DIMITRI"
    }

    const response = await coreUtil.httpWithRetry(context, url, coreEnum.API_METHOD.POST, { "x-api-key": genAPIAuthKey }, payload);
    log.info(context, 'Pull tender response', response);
    return response.data;
}

function composeBookAppointmentResponse(apptLogRec) {
    let response = {};

    coreUtil.addIfPresent(response, 'TransactionID', apptLogRec?.TRANSACTION_ID, true, true);
    coreUtil.addIfPresent(response, 'Delivery', apptLogRec?.DELIVERY, true, true);
    coreUtil.addIfPresent(response, 'OrderReleaseGid', apptLogRec?.ORDER_RELEASE_GID, true, true);
    coreUtil.addIfPresent(response, 'TripId', apptLogRec?.TRIP_ID, true, true);
    coreUtil.addIfPresent(response, 'CustomerPo', apptLogRec?.CUSTOMER_PO, true, true);
    coreUtil.addIfPresent(response, 'CustomerName', apptLogRec?.CUSTOMER_NAME, true, true);
    coreUtil.addIfPresent(response, 'Source', apptLogRec?.SOURCE, true, true);
    coreUtil.addIfPresent(response, 'Rate_Geo_GID', apptLogRec?.ROUTE_CODE_GID, true, true);
    coreUtil.addIfPresent(response, 'ShipmentGid', apptLogRec?.SHIPMENT_GID, true, true);
    coreUtil.addIfPresent(response, 'SalesOrderNumber', apptLogRec?.SALES_ORDER_NUMBER, true, true);
    coreUtil.addIfPresent(response, 'ShipmentStatus', apptLogRec?.SHIPMENT_STATUS, true, true);
    coreUtil.addIfPresent(response, 'WMSStatus', apptLogRec?.WMS_STATUS, true, true);
    coreUtil.addIfPresent(response, 'IsPreload', apptLogRec?.IS_PRELOAD, true, true);

    /* convert date to 12 hours format */
    response.DeliveryAppointment = convertTo12HourDateFormat(apptLogRec?.DELIVERY_APPOINTMENT);

    return response;
}

function composeFetchSlotMessage(isFindSlotSuccessful, data) {
    let msg = null;
    if (isFindSlotSuccessful) {
        msg = 'Fourkites fetch-slots API call successful.';
    }
    else {
        const code = data?.code;
        if (code === 500) {
            msg = 'FourKites internal servr error.';
        }
        else {
            const error = data?.error;
            if (coreUtil.isPresent(error)) {
                if (typeof error === 'object' &&
                    coreUtil.isPresent(error.errors) &&
                    coreUtil.isArray(error.errors) &&
                    error.errors.length > 0 &&
                    error.errors.some(e => coreUtil.isPresent(e.reason))) {
                    msg = error.errors.map(e => `${e.message} - ${e.reason}`).join(',');
                }
                else {
                    msg = error;
                }
            }
            else {
                msg = 'Technical fault has occurred. please contact Niagara Integration team.';
            }
        }
    }
    return msg;
}

function composePullTenderMessage(isPullTenderSuccessful) {
    return isPullTenderSuccessful ? 'Pull tender successful.' : 'Technical fault has occurred. please contact Niagara Integration team.';
}

function composeReserveSlotMessage(isReserveSlotSuccessful, data) {
    let msg = null;
    if (isReserveSlotSuccessful) {
        msg = 'Fourkites reserve slot successful';
    }
    else {
        if (coreUtil.isPresent(data?.error?.errors) &&
            coreUtil.isArray(data?.error?.errors) &&
            data?.error?.errors.length > 0 &&
            data?.error?.errors.some(e => coreUtil.isPresent(e.reason))) {
            msg = data?.error?.errors.map(e => `${e.message} - ${e.reason}`).join(',');
        }
        else {
            msg = 'Fourkites reserve slot failed';
        }
    }
    return msg;
}

function composeBookSlotMessage(isBookSlotSuccesssful, data) {
    let msg = null;
    if (isBookSlotSuccesssful) {
        msg = 'Successfully Booked the Pickup Appointment.';
    }
    else {
        if (coreUtil.isPresent(data?.error?.errors) &&
            coreUtil.isArray(data?.error?.errors) &&
            data?.error?.errors.length > 0 &&
            data?.error?.errors.some(e => coreUtil.isPresent(e.reason))) {
            msg = data?.error?.errors.map(e => e.reason).join(',');
        }
        else {
            msg = 'Fourkites Appointment Booking failed.';
        }
    }
    return msg;
}

function isBookApptRetry(context, msg) {
    let isRetry = false;
    const retryableErrors = [
        'Reserved Slot Expired, Appointment cannot be booked on this reserved slot',
        'This slot is no longer available, please select a different slot'
    ]

    isRetry = retryableErrors.some(e => msg.includes(e));

    if (isRetry) {
        log.info(context, `Error occurred, book appointment needs to be retried. Error: ${msg}`);
    }

    return isRetry;
}

function convertTo12HourDateFormat(time) {
    let newFormatedDate = '';
    if (coreUtil.isPresent(time)) {
        if (typeof time === 'string' && !coreUtil.isValidDate(time)) {
            newFormatedDate = '';
        }
        else {
            newFormatedDate = coreUtil.getTime('mm/dd/yyyy hh:MM TT', time);
        }
    }
    return newFormatedDate;
}

async function executeDBXml(context, query) {
    const result = {
        isSuccess: false,
        msg: null,
        data: null
    };

    try {
        const otmUsername = process.env.OTM_CLOUD_USER;
        const otmKey = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.OTM_CLOUD_KEY);
        const otmUsernameKey = `${otmUsername}:${otmKey}`;
        const headers = {
            Authorization: `Basic ${Buffer.from(otmUsernameKey).toString('base64')}`,
            "Content-Type": "application/xml",
            Accept: "application/xml"
        }
        const url = process.env.OTM_CLOUD_URL;
        log.info(context, `OTM Cloud URL: ${url}`);

        const payload = xmlPayloads.dbXMLShell(query);
        const timeout = 110 * 1000; /* total = 110 sec = 01:50 min */
        const response = await coreUtil.httpWithRetry(context, url, coreEnum.API_METHOD.POST, headers, payload, 1, 0, coreEnum.RETRY_DELAY_TYPE.INCREMENTAL, [], false, [], timeout);
        log.info(context, 'OTM Cloud response', response?.data);
        const jsonResponse = coreUtil.xml2js(response.data);
        log.info(context, 'OTM Cloud JSON response', jsonResponse);
        result.data = jsonResponse;
        result.isSuccess = true;
        result.msg = 'DB xml executed successfully.';
    } catch (error) {
        log.error(context, error, query);
        result.isSuccess = false;
        result.msg = 'DB xml execution failed.';
    }

    return result;
}

function getDBXmlQuery1(transactionNumber) {
    return dbXML.dbXMLQuery1(transactionNumber);
}

function getDBXmlQuery2(shipmentGids, plantCode, appointmentType) {
    return dbXML.dbXMLQuery2(shipmentGids, plantCode, appointmentType);
}

function getDBXmlQuery2_1(shipmentGids, orderReleaseGid, plantCode, appointmentType) {
    return dbXML.dbXMLQuery2_1(shipmentGids, orderReleaseGid, plantCode, appointmentType);
}

function getDBXmlQuery3(releaseGid, plantCode, appointmentType) {
    return dbXML.dbXMLQuery3(releaseGid, plantCode, appointmentType);
}

function getDBXmlQuery4(releaseGid, appointmentType) {
    return dbXML.dbXMLQuery4(releaseGid, appointmentType);
}

async function getShipmentsByShipmentGids(context, shipmentGids, plantCode, appointmentType) {
    const result = {
        isSuccess: false,
        msg: null,
        data: null
    };

    try {
        const shipmentGidsStr = [...shipmentGids].map(shipmentGid => `'${shipmentGid}'`).join(',');
        const query2 = getDBXmlQuery2(shipmentGidsStr, plantCode, appointmentType);
        const otmResponse = await executeDBXml(context, query2);
        const base64EncodedResponse2 = otmResponse?.data?.['dbxml:xml2sql']?.['dbxml:TRANSACTION_SET']?.['DMITRI']?.['_attributes']?.['SHIPMENT_DETAILS'];
        const xmlResponse2 = Buffer.from(base64EncodedResponse2, 'base64').toString('utf-8');
        result.data = coreUtil.xml2js(xmlResponse2);
        result.isSuccess = true;
        result.msg = '2nd DB xml executed successfully.';
    } catch (error) {
        log.error(context, error, shipmentGids);
        result.isSuccess = false;
        result.msg = '2nd DB xml execution failed.';
    }

    return result;
}

async function getShipmentsByShipmentGidsAndOrderReleaseGid(context, shipmentGids, orderReleaseGid, plantCode, appointmentType) {
    const result = {
        isSuccess: false,
        msg: null,
        data: null
    };

    try {
        const shipmentGidsStr = [...shipmentGids].map(shipmentGid => `'${shipmentGid}'`).join(',');
        const query2 = getDBXmlQuery2_1(shipmentGidsStr, orderReleaseGid, plantCode, appointmentType);
        const otmResponse = await executeDBXml(context, query2);
        const base64EncodedResponse2 = otmResponse?.data?.['dbxml:xml2sql']?.['dbxml:TRANSACTION_SET']?.['DMITRI']?.['_attributes']?.['SHIPMENT_DETAILS'];
        const xmlResponse2 = Buffer.from(base64EncodedResponse2, 'base64').toString('utf-8');
        result.data = coreUtil.xml2js(xmlResponse2);
        result.isSuccess = true;
        result.msg = '2.1 DB xml executed successfully.';
    } catch (error) {
        log.error(context, error, shipmentGids);
        result.isSuccess = false;
        result.msg = '2.1 DB xml execution failed.';
    }

    return result;
}

async function getShipmentsByReleaseGids(context, orderReleaseGids, plantCode, appointmentType) {
    const result = {
        isSuccess: false,
        msg: null,
        data: null
    };

    try {
        const orderReleaseGidsStr = [...orderReleaseGids].map(releaseGid => `'${releaseGid}'`).join(',');
        const query3 = getDBXmlQuery3(orderReleaseGidsStr, plantCode, appointmentType);
        const otmResponse = await executeDBXml(context, query3);
        const base64EncodedResponse3 = otmResponse?.data?.['dbxml:xml2sql']?.['dbxml:TRANSACTION_SET']?.['DMITRI']?.['_attributes']?.['SHIPMENT_DETAILS'];
        const xmlResponse3 = Buffer.from(base64EncodedResponse3, 'base64').toString('utf-8');
        result.data = coreUtil.xml2js(xmlResponse3);
        result.isSuccess = true;
        result.msg = '3rd DB xml executed successfully.';
    } catch (error) {
        log.error(context, error, orderReleaseGids);
        result.isSuccess = false;
        result.msg = '3rd DB xml execution failed.';
    }

    return result;
}

async function getOrderReleasesByReleaseGids(context, orderReleaseGids, appointmentType) {
    const result = {
        isSuccess: false,
        msg: null,
        data: null
    };

    try {
        const orderReleaseGidsStr = [...orderReleaseGids].map(releaseGid => `'${releaseGid}'`).join(',');
        const query4 = getDBXmlQuery4(orderReleaseGidsStr, appointmentType);
        const otmResponse = await executeDBXml(context, query4);
        const base64EncodedResponse4 = otmResponse?.data?.['dbxml:xml2sql']?.['dbxml:TRANSACTION_SET']?.['DMITRI']?.['_attributes']?.['SHIPMENT_DETAILS'];
        const xmlResponse4 = Buffer.from(base64EncodedResponse4, 'base64').toString('utf-8');
        result.data = coreUtil.xml2js(xmlResponse4);
        result.isSuccess = true;
        result.msg = '4th DB xml executed successfully.';
    } catch (error) {
        log.error(context, error, orderReleaseGids);
        result.isSuccess = false;
        result.msg = '4th DB xml execution failed.';
    }

    return result;
}

function composeShipmentData(shipmentDetailsXmlObj) {
    const shipmentData = {};

    coreUtil.addIfPresent(shipmentData, 'SHIPMENT_GID', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.SHIPMENT_GID), true);
    coreUtil.addIfPresent(shipmentData, 'PAYMENT_METHOD', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.LOAD_TYPE), true);
    coreUtil.addIfPresent(shipmentData, 'WMS_STATUS', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.WMS_STATUS), true);
    coreUtil.addIfPresent(shipmentData, 'TRIP_ID', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.TRIP_ID), true);
    coreUtil.addIfPresent(shipmentData, 'IS_PRELOAD', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.IS_PRELOAD), true);
    coreUtil.addIfPresent(shipmentData, 'SHIPMENT_APPT_START_TIME', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.APPT_START_TIME), true);
    coreUtil.addIfPresent(shipmentData, 'SHIPMENT_APPT_END_TIME', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.APPT_END_TIME), true);
    coreUtil.addIfPresent(shipmentData, 'SHIPMENT_LOCATION_RESOURCE_GID', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.LOCATION_RESOURCE_GID), true);
    coreUtil.addIfPresent(shipmentData, 'APPOINTMENT_DATE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.APPOINTMENT_DATE), true);
    coreUtil.addIfPresent(shipmentData, 'DELIVERY_APPOINTMENT', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.DELIVERY_APPOINTMENT), true);
    coreUtil.addIfPresent(shipmentData, 'SALES_ORDER_NUMBER', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.SALES_ORDER_NUM), true);
    coreUtil.addIfPresent(shipmentData, 'CUSTOMER_PO', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.CUSTOMER_PO), true);
    coreUtil.addIfPresent(shipmentData, 'DEST_LOCATION_GID', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.DEST_LOCATION_GID), true);
    coreUtil.addIfPresent(shipmentData, 'ROUTE_CODE_GID', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.RATE_GEO_GID), true);
    coreUtil.addIfPresent(shipmentData, 'CUSTOMER_NAME', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.CUSTOMER_NAME), true);
    coreUtil.addIfPresent(shipmentData, 'SOURCE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.SOURCE_NAME), true);
    coreUtil.addIfPresent(shipmentData, 'SHIPMENT_INDICATOR', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.SHPMENT_INDICATOR), true);
    coreUtil.addIfPresent(shipmentData, 'LOADED_DISTANCE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.LOADED_DISTANCE), true);
    coreUtil.addIfPresent(shipmentData, 'TRANSFER_FLAG', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.TRANSFER_FLAG), true);
    coreUtil.addIfPresent(shipmentData, 'PLANT_TIME_ZONE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.PLANT_TIME_ZONE), true);
    coreUtil.addIfPresent(shipmentData, 'DTS_LOCATION_TYPE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.DTS_LOCATION_TYPE), true);
    coreUtil.addIfPresent(shipmentData, 'TRANSPORT_MODE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.TRANSPORT_MODE), true);
    coreUtil.addIfPresent(shipmentData, 'ORIGINAL_REQUEST_DATE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.ORIGINAL_REQUEST_DATE), true);
    coreUtil.addIfPresent(shipmentData, 'SOURCE_ORG_TYPE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.SOURCE_ORG_TYPE), true);
    coreUtil.addIfPresent(shipmentData, 'DESTINATION_ORG_ID', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.DESTINATION_ORG_ID), true);
    coreUtil.addIfPresent(shipmentData, 'DESTINATION_ADDRESS', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.DESTINATION_ADDRESS), true);
    coreUtil.addIfPresent(shipmentData, 'PICKUP_ADDRESS', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.PICKUP_ADDRESS), true);
    coreUtil.addIfPresent(shipmentData, 'SHIPMENT_STATUS', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.SHIPMENT_STATUS), true);
    coreUtil.addIfPresent(shipmentData, 'STOP_LOCATION', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.STOP_LOCATION), true);
    coreUtil.addIfPresent(shipmentData, 'OPTIMAL', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.OPTIMAL_COUNT), true);
    coreUtil.addIfPresent(shipmentData, 'RATE_OFFERING_GID', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.RATE_OFFERING_GID), true);
    coreUtil.addIfPresent(shipmentData, 'APPOINTMENT_TYPE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.P_APPOINTMENT_TYPE), true);
    coreUtil.addIfPresent(shipmentData, 'SERVICE_PROVIDER_NAME', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.SERVICE_PROVIDER_NAME), true);
    coreUtil.addIfPresent(shipmentData, 'DEST_ORG_TYPE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.DESTINATION_ORG_TYPE), true);
    coreUtil.addIfPresent(shipmentData, 'ORG_ID', shipmentDetailsXmlObj.ORG_ID, true);

    /* input */
    coreUtil.addIfPresent(shipmentData, 'INCIDENT_TYPE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.INCIDENT_TYPE), true);
    coreUtil.addIfPresent(shipmentData, 'TRANSACTION_NUMBER', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.TRANSACTION_NUMBER), true);
    coreUtil.addIfPresent(shipmentData, 'SOURCE_OF_API_CALL', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.SOURCE_OF_API_CALL), true);
    coreUtil.addIfPresent(shipmentData, 'SCAC_CODE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.SCAC_CODE), true);

    /* error flags */
    coreUtil.addIfPresent(shipmentData, 'TRX_STATUS_FLAG', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.TRX_STATUS_FLAG), true);
    coreUtil.addIfPresent(shipmentData, 'TRX_STATUS_CODE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.TRX_STATUS_CODE), true);
    coreUtil.addIfPresent(shipmentData, 'TRX_ERROR_MESSAGE', coreUtil.getTextFromXmlObj(shipmentDetailsXmlObj.TRX_ERROR_MESSAGE), true);

    return shipmentData;
}

function composeReleaseData(releaseDetailResponse) {
    const transaction_id = coreUtil.isPresent(releaseDetailResponse.TRANSACTION_ID) ? releaseDetailResponse.TRANSACTION_ID : coreUtil.generateUuid();
    const releaseData = {
        id: transaction_id,
        TRANSACTION_ID: transaction_id
    };

    coreUtil.addIfPresent(releaseData, 'DELIVERY', coreUtil.getTextFromXmlObj(releaseDetailResponse.DELIVERY), true);
    coreUtil.addIfPresent(releaseData, 'ORDER_RELEASE_GID', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_RELEASE_GID), true);
    coreUtil.addIfPresent(releaseData, 'WEIGHT', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_TOTAL_WEIGHT), true);
    coreUtil.addIfPresent(releaseData, 'INDICATOR', coreUtil.getTextFromXmlObj(releaseDetailResponse.INDICATOR), true);
    coreUtil.addIfPresent(releaseData, 'SCHEDULE_INDICATOR', coreUtil.getTextFromXmlObj(releaseDetailResponse.SCHEDULE_INDICATOR), true);
    coreUtil.addIfPresent(releaseData, 'RATE_OFFERING_GID', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_RATE_OFFERING), true);
    coreUtil.addIfPresent(releaseData, 'LATE_PICKUP_DATE', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_LATE_PICKUP_DATE), true);
    coreUtil.addIfPresent(releaseData, 'EMAIL', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_EMAIL), true);
    coreUtil.addIfPresent(releaseData, 'REF_VALUE', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_REF_VALUE), true);
    coreUtil.addIfPresent(releaseData, 'TOT_PALLET', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_TOT_PALLET), true);
    coreUtil.addIfPresent(releaseData, 'LATE_DELIVERY_FLAG', coreUtil.getTextFromXmlObj(releaseDetailResponse.LATE_DELIVERY_FLAG), true);
    coreUtil.addIfPresent(releaseData, 'REASON_CODE', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_REASON_CODE), true);
    coreUtil.addIfPresent(releaseData, 'ORDER_CUSTOMER_REMARK', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_CUSTOMER_REMARK), true);
    coreUtil.addIfPresent(releaseData, 'ITEM_DESC_AND_COUNT', coreUtil.getTextFromXmlObj(releaseDetailResponse.ITEM_DESC_AND_COUNT), true);
    coreUtil.addIfPresent(releaseData, 'PENDING_REASON', coreUtil.getTextFromXmlObj(releaseDetailResponse.PENDING_REASON), true);

    /* common properties with shipment */
    coreUtil.addIfPresent(releaseData, 'CUSTOMER_PO', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_CUSTOMER_PO), true);
    coreUtil.addIfPresent(releaseData, 'SALES_ORDER_NUMBER', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_SALES_ORDER_NO), true);
    coreUtil.addIfPresent(releaseData, 'DEST_LOCATION_GID', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_DEST_LOCATION_GID), true);
    coreUtil.addIfPresent(releaseData, 'CUSTOMER_NAME', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_CUSTOMER_NAME), true);
    coreUtil.addIfPresent(releaseData, 'PAYMENT_METHOD', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_LOAD_TYPE), true);
    coreUtil.addIfPresent(releaseData, 'DESTINATION_ADDRESS', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_DESTINATION_ADDRESS), true);
    coreUtil.addIfPresent(releaseData, 'PICKUP_ADDRESS', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_PICKUP_ADDRESS), true);
    coreUtil.addIfPresent(releaseData, 'DEST_ORG_TYPE', coreUtil.getTextFromXmlObj(releaseDetailResponse.ORDER_DESTINATION_ORG_TYPE), true);

    return releaseData;
}

function composeShipmentResponseOTMCloud(shipmentDetail) {
    const shipmentRecord = {
        TransactionId: shipmentDetail.TRANSACTION_ID
    };
    coreUtil.addIfPresent(shipmentRecord, 'Delivery', shipmentDetail.DELIVERY, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'OrderReleaseGID', shipmentDetail.ORDER_RELEASE_GID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'TripID', shipmentDetail.TRIP_ID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'CustomerPO', shipmentDetail.CUSTOMER_PO, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ShipmentGID', shipmentDetail.SHIPMENT_GID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'SalesOrderNumber', shipmentDetail.SALES_ORDER_NUMBER, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ShipmentStatus', shipmentDetail.SHIPMENT_STATUS, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'WMSStatus', shipmentDetail.WMS_STATUS, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'IsPreload', shipmentDetail.IS_PRELOAD, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'CustomerName', shipmentDetail.CUSTOMER_NAME, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'StopLocation', shipmentDetail.STOP_LOCATION, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Rate_Geo_GID', shipmentDetail.ROUTE_CODE_GID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Source', shipmentDetail.SOURCE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'LoadType', shipmentDetail.PAYMENT_METHOD, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'SourceOfApICall', shipmentDetail.SOURCE_OF_API_CALL, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Email', shipmentDetail.EMAIL, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Weight', shipmentDetail.WEIGHT, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Indicator', shipmentDetail.INDICATOR, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'TransactionStatusCode', shipmentDetail.TRX_STATUS_CODE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ErrorDescription', shipmentDetail.TRX_ERROR_MESSAGE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ScheduleIndicator', shipmentDetail.SCHEDULE_INDICATOR, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ReasonCode', shipmentDetail.REASON_CODE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ShipmentIndicator', shipmentDetail.SHIPMENT_INDICATOR, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'RefValue', shipmentDetail.REF_VALUE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'PickupAddress', shipmentDetail.PICKUP_ADDRESS, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'DestinationAddress', shipmentDetail.DESTINATION_ADDRESS, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'TotalPallet', shipmentDetail.TOT_PALLET, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'RateOfferingGid', shipmentDetail.RATE_OFFERING_GID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'AppointmentDate', shipmentDetail.APPOINTMENT_DATE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'DeliveryAppointment', shipmentDetail.DELIVERY_APPOINTMENT, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'OrderLatePickupDate', shipmentDetail.LATE_PICKUP_DATE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'LoadedDistance', shipmentDetail.LOADED_DISTANCE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'LateDeliveryFlag', shipmentDetail.LATE_DELIVERY_FLAG, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'TransferFlag', shipmentDetail.TRANSFER_FLAG, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'PlantTimeZone', shipmentDetail.PLANT_TIME_ZONE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'DestinationOrgId', shipmentDetail.DESTINATION_ORG_ID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'DtsLocationType', shipmentDetail.DTS_LOCATION_TYPE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'SourceOrgType', shipmentDetail.SOURCE_ORG_TYPE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'TransportMode', shipmentDetail.TRANSPORT_MODE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'OriginalRequestDate', shipmentDetail.ORIGINAL_REQUEST_DATE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'OrderCustomerRemark', shipmentDetail.ORDER_CUSTOMER_REMARK, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ItemDescAndCount', shipmentDetail.ITEM_DESC_AND_COUNT, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'PendingReason', shipmentDetail.PENDING_REASON, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'Optimal', shipmentDetail.OPTIMAL, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'AppointmentType', shipmentDetail.APPOINTMENT_TYPE, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'OrgId', shipmentDetail.ORG_ID, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'ServiceProviderName', shipmentDetail.SERVICE_PROVIDER_NAME, true, true);
    coreUtil.addIfPresent(shipmentRecord, 'DestOrgType', shipmentDetail.DEST_ORG_TYPE, true, true);

    return shipmentRecord;
}

async function genericRefnumUpdate(context, orderReleases) {
    const result = {
        isSuccess: false,
        data: null,
        msg: null
    };

    try {
        const genRefnumUpdateUser = process.env.REFNUM_UPDATE_USERNAME;
        const genRefnumUpdatePwd = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.REFNUM_UPDATE_PWD)
        const genericRefnumUpdateTemplate = xmlPayloads.genRefnumUpdatePayload();
        const genericRefnumUpdatePayload = coreUtil.handlebarCompile(genericRefnumUpdateTemplate, orderReleases);

        const usernameColonKey = `${genRefnumUpdateUser}:${genRefnumUpdatePwd}`;
        const basicAuth = `Basic ${Buffer.from(usernameColonKey).toString('base64')}`

        const headers = {
            "Content-Type": "application/xml",
            Accept: "application/xml",
            'Authorization': basicAuth
        }
        const url = process.env.REFNUM_UPDATE_URL;
        log.info(context, `Generic refnum update URL: ${url}`);
        const timeout = 110 * 1000; /* total = 110 sec = 01:50 min */
        const response = await coreUtil.httpWithRetry(context, url, coreEnum.API_METHOD.POST, headers, genericRefnumUpdatePayload, 1, 0, coreEnum.RETRY_DELAY_TYPE.INCREMENTAL, [], false, [], timeout);
        log.info(context, `Received generic refnum update response`, response?.data);
        result.isSuccess = true;
        result.data = coreUtil.xml2js(response?.data);
        result.msg = 'Generic refnum update successful.';
    } catch (error) {
        log.error(context, error, orderReleases);
        result.msg = 'Generic refnum update failed.';
    }
    return result;
}

function shipmentAndWMSStatusValidation(shipmentLog) {
    const validation = {
        isSuccess: true,
        msg: ''
    };

    if (coreUtil.isPresent(shipmentLog.WMS_STATUS) && ['NBL.WMS_SH_LOCKED', 'NBL/MX.WMS_SH_LOCKED'].includes(shipmentLog.WMS_STATUS)) {
        validation.isSuccess = false;
        validation.msg = 'This shipment is showing "LOCKED" in OTM and pickup change is not feasible.';
    }

    if (coreUtil.isPresent(shipmentLog.SHIPMENT_STATUS) && shipmentLog.SHIPMENT_STATUS === 'NBL.SHIP_CONFIRMED') {
        validation.isSuccess = false;
        validation.msg = 'This shipment seems shipped already and not qualified for pickup change, please verify the load identifier and try again. If you find this information incorrect, please reach out to Niagara execution team.';
    }

    return validation;
}

function appointmentAndDeliveryDateValidation(shipmentLog) {
    const validation = {
        isSuccess: true,
        msg: ''
    };

    if (!coreUtil.isPresent(shipmentLog.DELIVERY_APPOINTMENT) && shipmentLog.PAYMENT_METHOD !== LOAD_TYPE.CPU) {
        validation.isSuccess = false;
        validation.msg = 'Delivery Date is not available for this Shipment/Order Release.';
    }

    if (!coreUtil.isPresent(shipmentLog.APPOINTMENT_DATE)) {
        validation.isSuccess = false;
        validation.msg = 'This load does not have an assigned pickup appointment yet.';
    }

    if (coreUtil.isPresent(shipmentLog.PLANT_TIME_ZONE)) {
        const apptDate = new Date(shipmentLog.APPOINTMENT_DATE);
        const localTime = new Date(); coreUtil.getTime(null, null, shipmentLog.PLANT_TIME_ZONE);

        if (apptDate < localTime) {
            validation.isSuccess = false;
            validation.msg = 'The pickup appointment time is in the past and cannot be changed. Please confirm if its shipped already or driver missed the appointment.';
        }
    }

    return validation;
}

function isOptimal(optimalCount) {
    let optimal = 'No';
    try {
        optimal = coreUtil.isPresent(optimalCount) && optimalCount?.trim() !== 'NULL' ? (parseInt(optimalCount) > 0 ? 'Yes' : 'No') : 'No';
    } catch (error) {
        optimal = 'No';
    }

    return optimal;
}

async function lookupPlantCode(orgCode) {
    const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
    const storageTableName = process.env.STORAGE_TABLE_NAME;
    const query = `PartitionKey eq '${orgCode}' and RowKey eq '${orgCode}'`;
    const entities = await coreUtil.queryStorageTable(storageAccountName, storageTableName, query);
    return coreUtil.isPresent(entities) && coreUtil.isArray(entities) && entities.length > 0 ? entities[0].OTM_Org_ID : null;
}

async function updateRateOfferingGid(context, orderReleaseGid, rateOfferingGid) {
    const validation = {
        isSuccess: false,
        msg: '',
        data: null
    };

    try {
        const otmHost = process.env.OTM_CLOUD_HOST;
        const rateOfferingGidUpdateUrl = `${otmHost}/logisticsRestApi/resources-int/v2/orderReleases/${orderReleaseGid}`;

        const otmUsername = process.env.OTM_CLOUD_USER;
        const otmKey = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.OTM_CLOUD_KEY);
        const otmUsernameKey = `${otmUsername}:${otmKey}`;
        const headers = {
            Authorization: `Basic ${Buffer.from(otmUsernameKey).toString('base64')}`,
            "Content-Type": "application/json",
            Accept: "application/json"
        }

        const payload = {
            rateOfferingGid: `${rateOfferingGid}`
        }
        const timeout = 110 * 1000; /* total = 110 sec = 01:50 min */
        const rateOfferingGidUpdateResp = await coreUtil.httpWithRetry(context, rateOfferingGidUpdateUrl, coreEnum.API_METHOD.PATCH, headers, payload, 1, 0, coreEnum.RETRY_DELAY_TYPE.INCREMENTAL, [], true, [], timeout);
        log.info(context, 'Received response for RATE_OFFERING_GID update', rateOfferingGidUpdateResp);
        validation.isSuccess = true;
        validation.msg = 'Rate_offering_gid update successful';
        validation.data = rateOfferingGidUpdateResp?.data;
    } catch (error) {
        validation.isSuccess = false;
        validation.msg = 'Rate_offering_gid update failed';
        log.error(context, error);
    }

    return validation;
}

async function updatePreload(context, shipmentGid, isPreload, appointmentType) {
    const validation = {
        isSuccess: false,
        msg: 'Appointment_type update failed',
        data: null
    };

    try {
        if ([APPOINTMENT_TYPE.PL, APPOINTMENT_TYPE.NP].includes(appointmentType)) {
            const otmUsername = process.env.OTM_CLOUD_USER;
            const otmKey = await coreUtil.getSecretValue(process.env.VAULT_NAME, process.env.OTM_CLOUD_KEY);
            const otmUsernameKey = `${otmUsername}:${otmKey}`;
            const otmHost = process.env.OTM_CLOUD_HOST;
            const timeout = 110 * 1000; /* total = 110 sec = 01:50 min */

            /* Delete preload */
            if (coreUtil.isPresent(isPreload)) {
                const preloadDeleteHeaders = {
                    Authorization: `Basic ${Buffer.from(otmUsernameKey).toString('base64')}`
                }
                const preloadDeleteUrl = `${otmHost}/logisticsRestApi/resources-int/v2/shipments/${shipmentGid}/refnums/NBL.IS_PRELOADx${isPreload}`;
                const preloadDeleteResp = await coreUtil.httpWithRetry(context, preloadDeleteUrl, coreEnum.API_METHOD.DELETE, preloadDeleteHeaders, null, 1, 0, coreEnum.RETRY_DELAY_TYPE.INCREMENTAL, [], true, [404], timeout);
                log.info(context, 'Received response for preload delete', preloadDeleteResp);
            }
            else {
                log.info(context, 'IS_PRELOAD field not present, skipping DELETE operation.');
            }

            /* Post preload */
            const preloadPostUrl = `${otmHost}/logisticsRestApi/resources-int/v2/shipments/${shipmentGid}/refnums`;
            const preloadUpdateHeaders = {
                Authorization: `Basic ${Buffer.from(otmUsernameKey).toString('base64')}`,
                "Content-Type": "application/json",
                Accept: "application/json"
            }
            const payload = {
                shipmentRefnumQualGid: "NBL.IS_PRELOAD",
                shipmentRefnumValue: `${appointmentType}`,
                domainName: "NBL"
            }
            const preloadPostResp = await coreUtil.httpWithRetry(context, preloadPostUrl, coreEnum.API_METHOD.POST, preloadUpdateHeaders, payload, 1, 0, coreEnum.RETRY_DELAY_TYPE.INCREMENTAL, [], true, [], timeout);
            log.info(context, 'Received response for preload post', preloadPostResp);
            validation.isSuccess = true;
            validation.msg = 'Appointment_type update successful';
            validation.data = preloadPostResp?.data;
        }
        else {
            validation.isSuccess = true;
            validation.msg = 'Appointment_type not present, skipping update operation.';
        }
    } catch (error) {
        validation.isSuccess = false;
        validation.msg = 'Appointment_type update failed';
        log.error(context, error);
    }

    return validation;
}

function getRateOfeeringGid(existingShipmentLogRecord, requestAppointmentType = null) {
    let rateOfferingGid = existingShipmentLogRecord.RATE_OFFERING_GID ?? '';
    if (existingShipmentLogRecord.CUSTOMER_NAME.includes("PEPSI")) {
        if (requestAppointmentType === APPOINTMENT_TYPE.PL) {
            if (existingShipmentLogRecord.DEST_LOCATION_GID === 'NBL.CUS-1048622-187797') {
                rateOfferingGid = 'NBL.CPU_CAROLINA_CANNERS';
            }
            else {
                rateOfferingGid = 'NBL.CPU_PEPSI_FLEET';
            }
        }
        else if (requestAppointmentType === APPOINTMENT_TYPE.NP) {
            rateOfferingGid = 'NBL.CPU_PEPSI';
        }
    }

    return rateOfferingGid;
}

function isTransactionNumberDelivery(transactionNumber, responseOrderReleaseGids) {
    let result = {
        isDelivery: false,
        orderReleaseGid: null
    };

    if (coreUtil.isPresent(responseOrderReleaseGids)) {
        const orderReleaseGids = coreUtil.isArray(responseOrderReleaseGids) ? [...new Set(responseOrderReleaseGids.map(obj => coreUtil.getTextFromXmlObj(obj)))] : [coreUtil.getTextFromXmlObj(responseOrderReleaseGids)];
        result.orderReleaseGid = orderReleaseGids.find(orderReleaseGid => orderReleaseGid.split('.').pop() === transactionNumber);
        result.isDelivery = coreUtil.isPresent(result.orderReleaseGid);
    }

    return result;
}

module.exports = {
    composeShipmentLogRecord,
    composeShipmentResponse,
    upsertShipmentLog,
    consumeShipmentLogs,
    getOTMDBConfig,
    execStoredProcedure,
    getShipmentDetailsFromOTM,
    getShipmentDetailsFromOIC,
    addTransactionStatusLevel,
    addTransactionStatusFlag,
    sendFailedEventNotification,
    querySlotsFromFourKites,
    getShipmentLogByTransactionId,
    getProductAvailability,
    requestDateValidation,
    parseProductAvailability,
    isPostponeRequest,
    updateAppointmentLog,
    updateAppointmentLogWithObj,
    addAuditAttributes,
    isProductAvailable,
    fetchLateDelivery,
    validateShipmentGid,
    validateTransactionStatus,
    validateDeliveryAppt,
    evaluateTransitTime,
    sameDayPickupValidation,
    getAvailableSlots,
    reserveSlotFourKites,
    bookSlotFourKites,
    getRescheduleTimeWithTwoHours,
    getRescheduleTimeWithTwoHoursForVDE,
    adjustTimeByInterval,
    pullTender,
    composeBookAppointmentResponse,
    composePullTenderMessage,
    composeFetchSlotMessage,
    composeReserveSlotMessage,
    composeBookSlotMessage,
    isBookApptRetry,
    convertTo12HourDateFormat,
    executeDBXml,
    getDBXmlQuery1,
    getDBXmlQuery2,
    getDBXmlQuery3,
    getShipmentsByShipmentGids,
    getShipmentsByShipmentGidsAndOrderReleaseGid,
    getShipmentsByReleaseGids,
    getOrderReleasesByReleaseGids,
    composeShipmentData,
    composeReleaseData,
    writeShipmentLog,
    updateApptLog,
    genericRefnumUpdate,
    appointmentAndDeliveryDateValidation,
    shipmentAndWMSStatusValidation,
    composeShipmentResponseOTMCloud,
    lookupPlantCode,
    updateRateOfferingGid,
    updatePreload,
    getRateOfeeringGid,
    isTransactionNumberDelivery,
    TRANSACTION_STATUS_CODE,
    TRANSACTION_STATUS_LEVEL,
    TRANSACTION_STATUS_FLAG,
    LOAD_TYPE,
    INCIDENT_TYPE,
    connection
}
