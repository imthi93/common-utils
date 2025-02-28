const { app } = require('@azure/functions');
const handler = require('./handler');

app.http('getShipmentsOTMCloud', {
    authLevel: 'function',
    route: 'shipmentfromotm',
    methods: ['POST'],
    handler: handler.getShipmentsOTMCloud
});

app.http('bookAppointment', {
    authLevel: 'function',
    route: 'bookappointment',
    methods: ['POST'],
    handler: handler.bookAppointment
});
