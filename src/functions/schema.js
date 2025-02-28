'use strict';

const definitions = {
    "non-empty-string": {
        "type": "string",
        "minLength": 1
    },
    "number-or-null": {
        "type": ["number", "null"]
    },
    "non-empty-string-or-null": {
        "oneOf": [
            {
                "$ref": "#/definitions/non-empty-string"
            },
            {
                "type": "null"
            }
        ]
    },
    "string-or-null": {
        "oneOf": [
            {
                "type": "string"
            },
            {
                "type": "null"
            }
        ]
    }
}

module.exports.getShipmentDetails = {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "properties": {
        "TransactionNumber": { "$ref": "#/definitions/non-empty-string" },
        "TransactionID": { "$ref": "#/definitions/number-or-null" },
        "IncidentType": { "$ref": "#/definitions/string-or-null" },
        "SourceOfApICall": { "$ref": "#/definitions/string-or-null" },
        "Email": { "$ref": "#/definitions/string-or-null" },
        "RefValue": { "$ref": "#/definitions/string-or-null" },
        "PlantCode": { "$ref": "#/definitions/string-or-null" },
        "AppointmentType": { "$ref": "#/definitions/string-or-null" },
        "customAttributes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "attributeName": { "$ref": "#/definitions/non-empty-string" },
                    "attributeType": { "$ref": "#/definitions/non-empty-string" },
                    "attributeValue": { "$ref": "#/definitions/non-empty-string" }
                },
                "required": [
                    "attributeName",
                    "attributeType",
                    "attributeValue"
                ]
            }
        }
    },
    "required": [
        "TransactionNumber"
    ],
    definitions
}

module.exports.getShipmentDetailsOTMCloud = {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "properties": {
        "TransactionNumber": { "$ref": "#/definitions/non-empty-string" },
        "TransactionID": { "$ref": "#/definitions/string-or-null" },
        "IncidentType": { "$ref": "#/definitions/string-or-null" },
        "SourceOfApICall": { "$ref": "#/definitions/string-or-null" },
        "Email": { "$ref": "#/definitions/string-or-null" },
        "RefValue": { "$ref": "#/definitions/string-or-null" },
        "PlantCode": { "$ref": "#/definitions/string-or-null" },
        "AppointmentType": { "$ref": "#/definitions/string-or-null" },
        "customAttributes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "attributeName": { "$ref": "#/definitions/non-empty-string" },
                    "attributeType": { "$ref": "#/definitions/non-empty-string" },
                    "attributeValue": { "$ref": "#/definitions/non-empty-string" }
                },
                "required": [
                    "attributeName",
                    "attributeType",
                    "attributeValue"
                ]
            }
        }
    },
    "required": [
        "TransactionNumber"
    ],
    definitions
}

module.exports.shipmentDetailShell = {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "properties": {
        "ShipmentDetails": {
            "type": "array",
            "items": {
                "type": "object"
            },
            "minItems": 1,
            "uniqueItems": true
        },
        "StatusMessage": { "$ref": "#/definitions/non-empty-string" },
        "FaultDetails": { "$ref": "#/definitions/non-empty-string" }
    },
    "required": [
        "ShipmentDetails"
    ],
    definitions
}

module.exports.shipmentItem = {
    "$schema": "http://json-schema.org/draft-04/schema#",

    "type": "object",
    "properties": {
        "TransactionId": { "$ref": "#/definitions/non-empty-string" },
        "Delivery": { "$ref": "#/definitions/non-empty-string" },
        "OrderReleaseGID": { "$ref": "#/definitions/non-empty-string" },
        "TripID": { "$ref": "#/definitions/non-empty-string" },
        "Source": { "$ref": "#/definitions/non-empty-string" },
        "Rate_Geo_GID": { "$ref": "#/definitions/non-empty-string" },
        "CustomerPO": { "$ref": "#/definitions/non-empty-string" },
        "CustomerName": { "$ref": "#/definitions/non-empty-string" },
        "ShipmentGID": { "$ref": "#/definitions/non-empty-string" },
        "SalesOrderNumber": { "$ref": "#/definitions/non-empty-string" },
        "AppointmentDate": { "$ref": "#/definitions/non-empty-string" },
        "ShipmentStatus": { "$ref": "#/definitions/non-empty-string" },
        "IsPreload": { "$ref": "#/definitions/non-empty-string" },
        "WMSStatus": { "$ref": "#/definitions/non-empty-string" },
        "DeliveryAppointment": { "$ref": "#/definitions/non-empty-string" },
        "Warehouse": { "$ref": "#/definitions/non-empty-string" },
        "SourceOfApICall": { "$ref": "#/definitions/non-empty-string" },
        "Email": { "$ref": "#/definitions/non-empty-string" },
        "Weight": { "$ref": "#/definitions/non-empty-string" },
        "TransactionStatusCode": { "$ref": "#/definitions/non-empty-string" },
        "ErrorDescription": { "$ref": "#/definitions/non-empty-string" },
        "ScheduleIndicator": { "$ref": "#/definitions/non-empty-string" },
        "ReasonCode": { "$ref": "#/definitions/non-empty-string" },
        "Indicator": { "$ref": "#/definitions/non-empty-string" },
        "LoadType": { "$ref": "#/definitions/non-empty-string" },
        "ShipmentIndicator": { "$ref": "#/definitions/non-empty-string" },
        "RefValue": { "$ref": "#/definitions/non-empty-string" },
        "PickupAddress": { "$ref": "#/definitions/non-empty-string" },
        "DestinationAddress": { "$ref": "#/definitions/non-empty-string" },
        "TotalPallet": { "$ref": "#/definitions/non-empty-string" },
        "RateOfferingGid": { "$ref": "#/definitions/non-empty-string" },
        "OrderLatePickupDate": { "$ref": "#/definitions/non-empty-string" },
        "customAttributes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "attributeName": { "$ref": "#/definitions/non-empty-string" },
                    "attributeType": { "$ref": "#/definitions/non-empty-string" },
                    "attributeValue": { "$ref": "#/definitions/non-empty-string" }
                },
                "required": [
                    "attributeName",
                    "attributeType",
                    "attributeValue"
                ]
            },
            "minItems": 1
        }
    },
    "required": [
        "TransactionId"
    ],
    definitions
}

module.exports.bookAppointment = {
    "$schema": "http://json-schema.org/draft-04/schema#",
    "type": "object",
    "properties": {
        "TransactionId": { "$ref": "#/definitions/string-or-null" },
        "DeliveryNumber": { "$ref": "#/definitions/string-or-null" },
        "ShipmentGid": { "$ref": "#/definitions/string-or-null" },
        "EarliestRescheduleTime": { "$ref": "#/definitions/string-or-null" },
        "LatestRescheduleTime": { "$ref": "#/definitions/string-or-null" }
    },
    "required": [
        "TransactionId"
    ],
    definitions
}


