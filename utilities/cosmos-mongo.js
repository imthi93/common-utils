'use strict';

const { MongoClient } = require('mongodb');
const coreUtil = require('./util');
const coreError = require('./error');

class db {
    #DB_NAME = null;
    #COLLECTION_NAME = null;
    #CLIENT = null;

    constructor(url = null, dbName = null, collectionName = null) {
        this.#setDbAttributes(url, dbName, collectionName);
    }

    /* Provide DB urll, name, and collection name during DB instance creation or while calling this function */
    async connect(url = null, dbName = null, collectionName = null) {
        this.#setDbAttributes(url, dbName, collectionName);

        if (!coreUtil.isPresent(this.#DB_NAME) || !coreUtil.isPresent(this.#COLLECTION_NAME) || !coreUtil.isPresent(this.#CLIENT)) {
            throw new coreError.PreconditionFailed('url, db-name, and db-collection should be provided during DB instance creation or while connecting');
        }

        await this.#CLIENT.connect();
    }

    #setDbAttributes(url, dbName, collectionName) {
        if (coreUtil.isPresent(url)) {
            this.#CLIENT = new MongoClient(url);
        }
        if (coreUtil.isPresent(dbName)) {
            this.#DB_NAME = dbName;
        }
        if (coreUtil.isPresent(collectionName)) {
            this.#COLLECTION_NAME = collectionName;
        }
    }

    async disconnect() {
        await this.#CLIENT.close();
    }

    async insert(params) {

        this.#validateDBAttributes(params, ['item']);
        if (Object.keys(params.item).length < 1) {
            throw new coreError.ValidationError(`'params.item' should have atleast one attribute`);
        }
        return await this.#CLIENT.db(this.#DB_NAME).collection(this.#COLLECTION_NAME).insertOne(params.item);
    }

    async bulkInsert(params) {

        this.#validateDBAttributes(params, ['items']);
        if (!coreUtil.isArray(params.items) || params.items.length < 1 || params.items.some(i => Object.keys(i).length < 1)) {
            throw new coreError.ValidationError(`'params.item' should have atleast one attribute`);
        }
        const items = params.items.map(item => {
        });
        return await this.#CLIENT.db(this.#DB_NAME).collection(this.#COLLECTION_NAME).insertMany(items);
    }

    async update(params, onInsert = {}) {
        this.#validateDBAttributes(params, ['query', 'update', 'update.$set']);
        if (Object.keys(params.query).length < 1 || Object.keys(params.update).length < 1) {
            throw new coreError.ValidationError(`'params.query' && 'params.update' should have atleast one attribute`);
        }

        if (params.options?.upsert === true) {
            params.update.$setOnInsert = {};

            for (const [key, val] of Object.entries(onInsert)) {
                coreUtil.addIfPresent(params.update.$setOnInsert, key, val);
            }
        }

        return await this.#CLIENT.db(this.#DB_NAME).collection(this.#COLLECTION_NAME).updateOne(params.query, params.update, params.options);
    }

    async softDelete(params) {
        this.#validateDBAttributes(params, ['query', 'update']);
        if (Object.keys(params.query).length < 1 || Object.keys(params.update).length < 1) {
            throw new coreError.ValidationError(`'params.query' && 'params.update' should have atleast one attribute`);
        }
        return await this.#CLIENT.db(this.#DB_NAME).collection(this.#COLLECTION_NAME).updateOne(params.query, params.update, params.options);
    }

    async delete(params) {
        this.#validateDBAttributes(params, ['query']);
        if (Object.keys(params.query).length < 1) {
            throw new coreError.ValidationError(`'params.query' should have atleast one attribute`);
        }
        return await this.#CLIENT.db(this.#DB_NAME).collection(this.#COLLECTION_NAME).deleteOne(params.query);
    }

    async bulkDelete(params) {
        this.#validateDBAttributes(params, ['query']);
        return await this.#CLIENT.db(this.#DB_NAME).collection(this.#COLLECTION_NAME).deleteMany(params.query);
    }

    async findOne(params) {
        this.#validateDBAttributes(params, ['query']);
        if (Object.keys(params.query).length < 1) {
            throw new coreError.ValidationError(`'params.query' should have atleast one attribute`);
        }
        return await this.#CLIENT.db(this.#DB_NAME).collection(this.#COLLECTION_NAME).findOne(params.query);
    }

    async find(params) {
        this.#validateDBAttributes(params, ['query']);
        return await this.#CLIENT.db(this.#DB_NAME).collection(this.#COLLECTION_NAME).find(params.query).toArray();
    }

    #validateDBAttributes(params, attributesToCheck) {
        const result = coreUtil.hasProperties(params, attributesToCheck);
        if (result.status === false) {
            throw new coreError.ValidationError(`'params' missing attributes --> ` + result.props);
        }
    }
}

module.exports = { db };
