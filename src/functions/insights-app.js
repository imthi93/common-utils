'use strict';

const { util: coreUtil, log: coreLog, enums } = require('middleware-util');

function init(context, correlationId, requestId, uniqueIds = []) {
    return new Promise((resolve, reject) => {
        try {
            // Simulating async-like behavior
            context.correlationId = correlationId;
            context.requestId = `${requestId}`;
            context.uniqueIds = uniqueIds.concat([correlationId, requestId, context?.invocationId]);

            // Resolve the promise to signal success
            resolve('Initialization successful');
        } catch (error) {
            // Reject the promise in case of an error
            reject('Initialization failed');
        }
    });
}



function getCommonLogProperties(context) {
    return {
        Source_App: 'Azure',
        Service_Name: 'FourKites_Integration',
        Component_Name: `fn-${process.env.STAGE}-fourkites-integration`,
        Method: context?.functionName,
        Instance_Id: context?.invocationId,
        Correlation_Id: context?.correlationId,
        Request_Id: context?.requestId,
        Timestamp: coreUtil.getTime()
    };
}

function log(context, msg = null, payload = null) {
    const logProps = getCommonLogProperties(context);
    const logDetails = {};
    coreUtil.addIfPresent(logDetails, 'Payload', coreUtil.stringifyObj(payload));
    coreUtil.addIfPresent(logDetails, 'SuccessMessage', msg);
    coreUtil.addIfPresent(logProps, 'Log_Details', Object.keys(logDetails).length > 0 ? logDetails : null);
    coreUtil.addIfPresent(logProps, 'Log_Level', enums.LOG_LEVEL.LOG);
    coreLog.log(context, logProps);
}

function info(context, msg = null, payload = null) {
    const logProps = getCommonLogProperties(context);
    const logDetails = {};
    coreUtil.addIfPresent(logDetails, 'Payload', coreUtil.stringifyObj(payload));
    coreUtil.addIfPresent(logDetails, 'SuccessMessage', msg);
    coreUtil.addIfPresent(logProps, 'Log_Details', Object.keys(logDetails).length > 0 ? logDetails : null);
    coreUtil.addIfPresent(logProps, 'Log_Level', enums.LOG_LEVEL.INFO);
    coreLog.info(context, logProps);
}

function debug(context, msg = null, payload = null) {
    const DEBUG = process?.env?.DEBUG === 'true' || false;
    if (!DEBUG) {
        return;
    };
    const logProps = getCommonLogProperties(context);
    const logDetails = {};
    coreUtil.addIfPresent(logDetails, 'Payload', coreUtil.stringifyObj(payload));
    coreUtil.addIfPresent(logDetails, 'SuccessMessage', msg);
    coreUtil.addIfPresent(logProps, 'Log_Details', Object.keys(logDetails).length > 0 ? logDetails : null);
    coreUtil.addIfPresent(logProps, 'Log_Level', enums.LOG_LEVEL.INFO);
    coreLog.info(context, logProps);
}

function warn(context, msg = null, payload = null) {
    const logProps = getCommonLogProperties(context);
    const logDetails = {};
    coreUtil.addIfPresent(logDetails, 'Payload', coreUtil.stringifyObj(payload));
    coreUtil.addIfPresent(logDetails, 'SuccessMessage', msg);
    coreUtil.addIfPresent(logProps, 'Log_Details', Object.keys(logDetails).length > 0 ? logDetails : null);
    coreUtil.addIfPresent(logProps, 'Log_Level', enums.LOG_LEVEL.WARN);
    coreLog.warn(context, logProps);
}

function error(context, error = null, payload = null, errorMsg = null, code = null) {
    const logProps = getCommonLogProperties(context);
    const logDetails = {};
    coreUtil.addIfPresent(logDetails, 'Payload', coreUtil.stringifyObj(payload));
    coreUtil.addIfPresent(logDetails, 'ErrorMessage', coreUtil.isPresent(errorMsg) ? errorMsg : error?.message || error?.toString());
    coreUtil.addIfPresent(logDetails, 'StatusCode', coreUtil.isPresent(code) ? code : error?.statusCode);
    coreUtil.addIfPresent(logDetails, 'FlowTrace', error?.stack);
    coreUtil.addIfPresent(logProps, 'Log_Details', Object.keys(logDetails).length > 0 ? logDetails : null);
    coreUtil.addIfPresent(logProps, 'Log_Level', enums.LOG_LEVEL.ERROR);
    coreLog.error(context, logProps, error);
}

module.exports = {
    init,
    getCommonLogProperties,
    log,
    info,
    warn,
    error,
    debug
};
