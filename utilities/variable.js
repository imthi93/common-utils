'use strict';

let instanceRequestId = null;
let functionName = null;


function getInstanceRequestId() {
    return instanceRequestId;
}

function setInstanceRequestId(id) {
    instanceRequestId = id;
}

function getFunctionName() {
    return functionName;
}

function setFunctionName(name) {
    functionName = name;
}

module.exports = {
    getInstanceRequestId,
    setInstanceRequestId,
    getFunctionName,
    setFunctionName
}
