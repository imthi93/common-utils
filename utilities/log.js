'use strict';

const util = require('util');


function log(context, message) {
    context.log(util.inspect(message, { showHidden: false, depth: null, maxArrayLength: null, maxStringLength: null }));
}

/* This log function isn't working with function app */
// function trace(context, message) {
//     context.trace(util.inspect(message, { showHidden: false, depth: null, maxArrayLength: null, maxStringLength: null }));
// }

/* This log function isn't working with function app */
// function debug(context, message) {
//     context.debug(util.inspect(message, { showHidden: false, depth: null, maxArrayLength: null, maxStringLength: null }));
// }

function info(context, message) {
    context.info(util.inspect(message, { showHidden: false, depth: null, maxArrayLength: null, maxStringLength: null }));
}

function warn(context, message) {
    context.warn(util.inspect(message, { showHidden: false, depth: null, maxArrayLength: null, maxStringLength: null }));
}

function error(context, message) {
    context.error(util.inspect(message, { showHidden: false, depth: null, maxArrayLength: null, maxStringLength: null }));
}

module.exports = {
    log,
    // trace,
    // debug,
    info,
    warn,
    error
}
