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
