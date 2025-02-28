'use strict';

const { util: coreUtil, enums: coreEnums } = require('middleware-util');
const schema = require('./schema');
const util = require('./util');
let log;
if (process?.env?.USE_APP_INSIGHTS === 'true') {
    log = require('./insights-app');
} else {
    log = require('./log');
}
