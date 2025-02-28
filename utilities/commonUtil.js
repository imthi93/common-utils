'use strict';

const uuid = require('uuid/v4');
const dateFormat = require('dateformat');
const util = require('util');
const xml2jsonParser = require('xml-js');


function isArray(param) {
    return (!!param) && (param.constructor === Array);
}

function isObject(param) {
    return (!!param) && (param.constructor === Object);
}

function isPresent(param) {
    return param !== undefined && param !== null;
}

function hasProperties(obj, props) {
    const missingProps = [];

    if (!isArray(props) || !isObject(obj)) {
        return {
            status: false,
            props: props
        };
    }

    for (const each in props) {

        const property = props[each];
        if (property.toString().indexOf('.') > 0) {
            let splitProperty = property.split('.');
            let currentObj = obj;
            for (const eachSplit in splitProperty) {
                const currentProp = splitProperty[eachSplit];
                if (Object.keys(currentObj).indexOf(currentProp) > -1) {
                    currentObj = currentObj[currentProp];
                    if (currentObj === null || currentObj.toString().trim() === '') {
                        missingProps.push(property);
                        break;
                    }
                }
                else {
                    missingProps.push(property);
                    break;
                }
            }
        }
        else {
            if (Object.keys(obj).indexOf(property) < 0 || obj[property] === null || obj[property].toString().trim() === '') {
                missingProps.push(property);
            }
        }
    }
    if (missingProps.length !== 0) {
        return {
            status: false,
            props: missingProps
        };
    }
    else {
        return {
            status: true,
            props: []
        }
    }
}

function generateUuid() {
    return uuid();
}

function addIfPresent(obj, propName, paramToAdd, isConsumeNull = false, isConvertNullToEmptyStr = false) {
    if (isPresent(paramToAdd)) {
        obj[propName] = paramToAdd;

        if (isConsumeNull && typeof paramToAdd === 'string' && paramToAdd.toLowerCase() === 'null') {
            obj[propName] = null;
        }
        if (isConvertNullToEmptyStr && typeof paramToAdd === 'string' && paramToAdd.toLowerCase() === 'null') {
            obj[propName] = '';
        }
    }
    else {
        if (isConsumeNull && paramToAdd === null) {
            obj[propName] = paramToAdd;
        }
        if (isConvertNullToEmptyStr && paramToAdd === null) {
            obj[propName] = '';
        }
    }
    return obj;
}

function getPstTime(format = null, time = null) {
    /* "dd-mm-yyyy-HH-MM-ss" */
    /* more format example: https://www.npmjs.com/package/dateformat#usage */
    const centralTime = isPresent(time) ? new Date(time).toISOString() : new Date().toISOString();
    let pstTime = new Date(centralTime).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles"
    });

    if (isPresent(format) && format.trim() !== "") {
        pstTime = dateFormat(pstTime, format);
    }
    return pstTime;
}

function getTime(format = null, time = null, timezone = null) {
    /* "dd-mm-yyyy-HH-MM-ss" */
    /* more format example: https://www.npmjs.com/package/dateformat#usage */
    const localTime = isPresent(time) ? new Date(time).toISOString() : new Date().toISOString();
    const dateOptions = {};
    addIfPresent(dateOptions, 'timeZone', timezone);
    let localTimeFormated = new Date(localTime).toLocaleString("en-US", dateOptions);

    if (isPresent(format) && format.trim() !== "") {
        localTimeFormated = dateFormat(localTimeFormated, format);
    }
    return localTimeFormated;
}

async function sleep(timer = 0) {
    await new Promise(res => setTimeout(res, timer));
}

function isCyclicObj(obj) {
    const seenObjects = [];

    function detect(obj) {
        if (obj && typeof obj === 'object') {
            if (seenObjects.indexOf(obj) !== -1) {
                return true;
            }
            seenObjects.push(obj);
            for (const key in obj) {
                if (Object.hasOwnProperty.bind(obj)(key) && detect(obj[key])) {
                    return true;
                }
            }
        }
        return false;
    }

    return detect(obj);
}

function stringifyObj(obj) {
    if (!isPresent(obj)) {
        return obj;
    }

    if (isCyclicObj(obj)) {
        return util.inspect(obj, { showHidden: false, depth: null, maxArrayLength: null, maxStringLength: null });
    }
    else {
        return JSON.stringify(obj, null, 2);
    }
}

function isValidDate(date) {
    return (new Date(date) !== "Invalid Date" && !isNaN(new Date(date)));
}

function xml2js(xml, options = { compact: true }) {
    return xml2jsonParser.xml2js(xml, options);
}

/* Get text from xml object converted using "xml2js" function */
function getTextFromXmlObj(xmlObj) {
    return isPresent(xmlObj) && isPresent(xmlObj._text) ? xmlObj._text : null;
}

module.exports = {
    isArray,
    isObject,
    isPresent,
    hasProperties,
    generateUuid,
    addIfPresent,
    getPstTime,
    sleep,
    stringifyObj,
    isCyclicObj,
    getTime,
    isValidDate,
    xml2js,
    getTextFromXmlObj
};
