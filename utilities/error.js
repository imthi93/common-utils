'use strict';

class ValidationError extends Error {
    constructor(message, code) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = 400;
        this.code = code !== undefined && code !== null ? code : 'VALIDATION_ERROR';
        Error.captureStackTrace(this, this.constructor);
    }
}

class UnauthorizedError extends Error {
    constructor(message, code) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = 401;
        this.code = code !== undefined && code !== null ? code : 'UNAUTHORIZED';
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends Error {
    constructor(message, code) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = 404;
        this.code = code !== undefined && code !== null ? code : 'NOT_FOUND';
        Error.captureStackTrace(this, this.constructor);
    }
}

class PreconditionFailed extends Error {
    constructor(message, code) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = 412;
        this.code = code !== undefined && code !== null ? code : 'PRECONDITION_FAILED';
        Error.captureStackTrace(this, this.constructor);
    }
}

class InternalError extends Error {
    constructor(message, code) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = 500;
        this.code = code !== undefined && code !== null ? code : 'INTERNAL_ERROR';
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = {
    ValidationError,
    UnauthorizedError,
    NotFoundError,
    PreconditionFailed,
    InternalError
};
