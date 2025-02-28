'use strict';

const jwt = require('jsonwebtoken');


function signToken(payload, secret) {
    return jwt.sign(payload, secret, { expiresIn: 3600 }); // expires in 1 hour
}

function decodeToken(token, secret) {
    const decodedToken = {
        isValid: false
    };

    try {
        decodedToken.decodedToken = jwt.verify(token, secret, { maxAge: 3600 });
        decodedToken.isValid = true;
    } catch (error) {
        console.error(error);
        decodedToken.isValid = false;
    }

    return decodedToken;
}

module.exports = {
    signToken,
    decodeToken
};
