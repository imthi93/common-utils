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
