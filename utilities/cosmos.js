'use strict';
const { DefaultAzureCredential } = require('@azure/identity');
const { CosmosClient } = require('@azure/cosmos');
const commonUtil = require('./commonUtil');


class db {
    #client = null;
    #database = null;
    #container = null;

    static connectionType = {
        CONNECTION_STRING: 'connection_string',
        DEFAULT_AZURE_CREDENTIALS: 'default_azure_credentials'
    };

    constructor(endpoint, connectionType = db.connectionType.DEFAULT_AZURE_CREDENTIALS, key = null) {

        const clientOptions = {
            endpoint
        };

        if (connectionType === db.connectionType.CONNECTION_STRING) {
            clientOptions.key = key;
        }
        else {
            clientOptions.aadCredentials = new DefaultAzureCredential();
        }

        this.#client = new CosmosClient(clientOptions);
    }

    connect(dbName, containerName) {
        this.#database = this.#client.database(dbName);
        this.#container = this.#database.container(containerName);
    }

    async insert(item) {
        // const now = commonUtil.getPstTime();
        // commonUtil.addIfPresent(item, 'id', commonUtil.isPresent(item.id) ? item.id : commonUtil.generateUuid());
        // commonUtil.addIfPresent(item, 'createdTime', now);
        // commonUtil.addIfPresent(item, 'updatedTime', now);
        return await this.#container.items.create(item);
    }

    async read(id, partitionKey) {
        const { resource: item } = await this.#container.item(`${id}`, partitionKey).read();
        return item;
    }

    async query(querySpec) {
        /* example query spec
        const querySpec = {
            query: "SELECT * FROM Families f WHERE  f.lastName = @lastName",
            parameters: [
                {
                    name: "@lastName",
                    value: "Andersen",
                },
            ],
        };
        */
        const { resources: results } = await this.#container.items.query(querySpec).fetchAll();
        return results;
    }

    async update(item) {
        // commonUtil.addIfPresent(item, 'updatedTime', commonUtil.getPstTime());
        const { resource: updatedItem } = await this.#container.items.upsert(item);
        return updatedItem;
    }

    async patch(id, partitionKey, operations) {
        let latestPatchItem = null;
        while (operations.length) {
            const operationBatch = operations.splice(0, 10);
            const { resource: patchItem } = await this.#container.item('' + id, partitionKey).patch({ operations: operationBatch });
            latestPatchItem = patchItem;
        }
        return latestPatchItem;
    }

    async delete(id, partitionKey) {
        return await this.#container.item('' + id, partitionKey).delete();
    }
}

module.exports = { db };
