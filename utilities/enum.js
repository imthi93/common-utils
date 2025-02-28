'use strict';

const API_METHOD = {
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    DELETE: 'DELETE',
    PATCH: 'PATCH'
};

const ENV = {
    PROD: 'prod',
    UAT: 'uat',
    QA: 'qa',
    DEV: 'dev'
};

const SHIPMENT_EVENT_SOURCE = {
    OTM: 'OTM',
    '214': '214',
    FOURKITES: 'FourKites',
    EBS: 'EBS'
};

const REQUEST_SOURCE = {
    HTTP: 'http',
    SERVICE_BUS: 'service_bus'
};

const LOG_LEVEL = {
    LOG: 'LOG',
    TRACE: 'TRACE',
    DEBUG: 'DEBUG',
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR'
};

const RETRY_DELAY_TYPE = {
    STATIC: 'STATIC',
    INCREMENTAL: 'INCREMENTAL'
};

const TRX_STATUS_LEVEL = {
    GET_SHIPMENT: 'GET_SHIPMENT',
    SLOT_BLOCKED: 'SLOT BLOCKED',
    PULL_TENDER: 'PULL_TENDER',
    BOOK_SLOT: 'BOOK_SLOT',
    POST_PROCESS: 'POST_PROCESS',
    RETENDER: 'RETENDER'
}

module.exports = {
    API_METHOD,
    ENV,
    SHIPMENT_EVENT_SOURCE,
    REQUEST_SOURCE,
    LOG_LEVEL,
    RETRY_DELAY_TYPE,
    TRX_STATUS_LEVEL
};
