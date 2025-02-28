'use strict';

const { util: coreUtil, enums: coreEnums } = require('middleware-util');
const schema = require('./schema');
const util = require('./util');
let log;
if (process?.env?.USE_APP_INSIGHTS === 'true') {
    log = require('./insights-app');
} else {
    log = require('./log');
}

async function getShipmentsOTMCloud(request, context) {
    let body = null;

    const response = {
        ShipmentDetails: [],
        StatusMessage: 'Shipment details available.'
    };
    let TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.N;
    let TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.IN_TRANSIT;
    let TRX_ERROR_MESSAGE = 'Shipment details available.';

    let shipmentLogUpdateParams = {};

    try {
        /* register request */
        await coreUtil.registerRequest(request, context);

        body = await request.json();

        /* schema validation */
        coreUtil.validateSchema(body, schema.getShipmentDetailsOTMCloud);

        /* business logic */
        const transactionNumber = body.TransactionNumber;
        const transactionId = coreUtil.isPresent(body.TransactionID) && body.TransactionID.trim().length > 0 ? body.TransactionID : null;
        const incidentType = coreUtil.isPresent(body.IncidentType) && body.IncidentType.trim().length > 0 ? body.IncidentType : null;
        const sourceOfApICall = coreUtil.isPresent(body.SourceOfApICall) && body.SourceOfApICall.trim().length > 0 ? body.SourceOfApICall : null;
        const email = coreUtil.isPresent(body.Email) && body.Email.trim().length > 0 ? body.Email : null;
        const refValue = coreUtil.isPresent(body.RefValue) && body.RefValue.trim().length > 0 ? body.RefValue : null;
        const scacCode = coreUtil.isPresent(body?.ScacCode) && body?.ScacCode.trim().length > 0 ? body?.ScacCode : null;
        const orgCode = coreUtil.isPresent(body?.PlantCode) && body?.PlantCode.trim().length > 0 ? body?.PlantCode : null;
        const appointmentType = coreUtil.isPresent(body?.AppointmentType) && body?.AppointmentType.trim().length > 0 ? body?.AppointmentType : null;
        const isNewRecord = !coreUtil.isPresent(transactionId);

        /* log init */
        const correlationId = transactionNumber;
        const requestId = transactionId || transactionNumber;
        await log.init(context, correlationId, requestId, [transactionNumber]);

        if (isNewRecord) {
            /* get shipments 1st API call */
            /* identify transaction */
            const query1 = util.getDBXmlQuery1(transactionNumber);
            const [otmResponse, orgId] = await Promise.all([
                util.executeDBXml(context, query1),
                coreUtil.isPresent(orgCode) ? util.lookupPlantCode(orgCode) : null
            ]);

            if (!otmResponse.isSuccess) {
                /* update shipment log table and return error response */
                response.StatusMessage = '1st DB XML call failed.';

                let emptyShipmentDetails = { ...util.composeShipmentData({}), ...util.composeReleaseData({}) };
                TRX_STATUS_CODE = emptyShipmentDetails.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                TRX_STATUS_FLAG = emptyShipmentDetails.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                TRX_ERROR_MESSAGE = emptyShipmentDetails.TRX_ERROR_MESSAGE = response.StatusMessage;
                emptyShipmentDetails = util.addAuditAttributes(emptyShipmentDetails, isNewRecord);
                await util.updateAppointmentLog(context, emptyShipmentDetails.TRANSACTION_ID, null, null,
                    util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                    emptyShipmentDetails.TRX_STATUS_CODE,
                    emptyShipmentDetails.TRX_STATUS_FLAG,
                    emptyShipmentDetails.TRX_ERROR_MESSAGE
                );
                emptyShipmentDetails = util.composeShipmentResponseOTMCloud(emptyShipmentDetails);
                response.ShipmentDetails.push(emptyShipmentDetails);
                return await coreUtil.generateSuccessResponse(context, response, 207);
            }

            const base64EncodedResponse1 = otmResponse?.data?.['dbxml:xml2sql']?.['dbxml:TRANSACTION_SET']?.['DMITRI']?.['_attributes']?.['TRANSACTION_TYPE'];

            if (!coreUtil.isPresent(base64EncodedResponse1)) {
                /* update shipment log table and return error response */
                response.StatusMessage = 'I cannot find this shipment, please verify the load identifier and try again. (provide load identifier examples)';

                let emptyShipmentDetails = { ...util.composeShipmentData({}), ...util.composeReleaseData({}) };
                TRX_STATUS_CODE = emptyShipmentDetails.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                TRX_STATUS_FLAG = emptyShipmentDetails.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                TRX_ERROR_MESSAGE = emptyShipmentDetails.TRX_ERROR_MESSAGE = response.StatusMessage;
                emptyShipmentDetails = util.addAuditAttributes(emptyShipmentDetails, isNewRecord);
                await util.updateAppointmentLog(context, emptyShipmentDetails.TRANSACTION_ID, null, null,
                    util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                    emptyShipmentDetails.TRX_STATUS_CODE,
                    emptyShipmentDetails.TRX_STATUS_FLAG,
                    emptyShipmentDetails.TRX_ERROR_MESSAGE
                );
                emptyShipmentDetails = util.composeShipmentResponseOTMCloud(emptyShipmentDetails);
                response.ShipmentDetails.push(emptyShipmentDetails);
                return await coreUtil.generateSuccessResponse(context, response, 207);
            }

            const xmlResponse1 = Buffer.from(base64EncodedResponse1, 'base64').toString('utf-8');
            const jsonResponse1 = coreUtil.xml2js(xmlResponse1);

            log.info(context, 'Response from 1st DB XMl', JSON.stringify(jsonResponse1));

            const responseShipmentGid = jsonResponse1.transaction_type.SHIPMENT_GID;
            const responseOrderReleaseGid = jsonResponse1.transaction_type.ORDER_RELEASE_GID;

            /* fetch shipment details */
            let shipmentDetailsResponse = {};

            if (coreUtil.isPresent(responseShipmentGid)) {
                const shipmentGids = coreUtil.isArray(responseShipmentGid) ? new Set(responseShipmentGid.map(obj => coreUtil.getTextFromXmlObj(obj))) : [coreUtil.getTextFromXmlObj(responseShipmentGid)];

                const result = util.isTransactionNumberDelivery(transactionNumber, responseOrderReleaseGid);
                if (result.isDelivery === false) {
                    shipmentDetailsResponse = await util.getShipmentsByShipmentGids(context, shipmentGids, orgId, appointmentType);
                    log.info(context, 'Response from 2nd DB XMl', JSON.stringify(shipmentDetailsResponse?.data));
                } else {
                    shipmentDetailsResponse = await util.getShipmentsByShipmentGidsAndOrderReleaseGid(context, shipmentGids, result.orderReleaseGid, orgId, appointmentType);
                    log.info(context, 'Response from 2.1 DB XMl', JSON.stringify(shipmentDetailsResponse?.data));
                }
            }
            else if (coreUtil.isPresent(responseOrderReleaseGid)) {
                const orderReleaseGids = coreUtil.isArray(responseOrderReleaseGid) ? new Set(responseOrderReleaseGid.map(obj => coreUtil.getTextFromXmlObj(obj))) : [coreUtil.getTextFromXmlObj(responseOrderReleaseGid)];
                shipmentDetailsResponse = await util.getShipmentsByReleaseGids(context, orderReleaseGids, orgId, appointmentType);
                log.info(context, 'Response from 3rd DB XMl', JSON.stringify(shipmentDetailsResponse?.data));

                if (shipmentDetailsResponse.isSuccess && coreUtil.isPresent(shipmentDetailsResponse.data.SHIPMENT_DETAILS) && Object.keys(shipmentDetailsResponse.data.SHIPMENT_DETAILS).length === 0) {
                    shipmentDetailsResponse = await util.getOrderReleasesByReleaseGids(context, orderReleaseGids, appointmentType);
                    log.info(context, 'Response from 4th DB XMl', JSON.stringify(shipmentDetailsResponse?.data));
                }
            }
            else {
                /* update shipment log table and return error response */
                response.StatusMessage = 'I cannot find this shipment, please verify the load identifier and try again. (provide load identifier examples)';

                let emptyShipmentDetails = { ...util.composeShipmentData({}), ...util.composeReleaseData({}) };
                TRX_STATUS_CODE = emptyShipmentDetails.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                TRX_STATUS_FLAG = emptyShipmentDetails.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                TRX_ERROR_MESSAGE = emptyShipmentDetails.TRX_ERROR_MESSAGE = response.StatusMessage;
                emptyShipmentDetails = util.addAuditAttributes(emptyShipmentDetails, isNewRecord);
                await util.updateAppointmentLog(context, emptyShipmentDetails.TRANSACTION_ID, null, null,
                    util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                    emptyShipmentDetails.TRX_STATUS_CODE,
                    emptyShipmentDetails.TRX_STATUS_FLAG,
                    emptyShipmentDetails.TRX_ERROR_MESSAGE
                );
                emptyShipmentDetails = util.composeShipmentResponseOTMCloud(emptyShipmentDetails);
                response.ShipmentDetails.push(emptyShipmentDetails);
                return await coreUtil.generateSuccessResponse(context, response, 207);
            }

            log.info(context, 'Received response from OTM', shipmentDetailsResponse?.data);

            if (!shipmentDetailsResponse.isSuccess || (coreUtil.isPresent(shipmentDetailsResponse.data?.SHIPMENT_DETAILS) && Object.keys(shipmentDetailsResponse.data?.SHIPMENT_DETAILS).length === 0)) {
                /* update shipment log table and return error response */
                response.StatusMessage = coreUtil.isPresent(shipmentDetailsResponse.data?.SHIPMENT_DETAILS) && Object.keys(shipmentDetailsResponse.data?.SHIPMENT_DETAILS).length === 0 ? 'DB XML call failed.' : shipmentDetailsResponse.msg;
                let emptyShipmentDetails = { ...util.composeShipmentData({}), ...util.composeReleaseData({}) };
                TRX_STATUS_CODE = emptyShipmentDetails.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                TRX_STATUS_FLAG = emptyShipmentDetails.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                TRX_ERROR_MESSAGE = emptyShipmentDetails.TRX_ERROR_MESSAGE = response.StatusMessage;
                emptyShipmentDetails = util.addAuditAttributes(emptyShipmentDetails, isNewRecord);
                await util.updateAppointmentLog(context, emptyShipmentDetails.TRANSACTION_ID, null, null,
                    util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                    emptyShipmentDetails.TRX_STATUS_CODE,
                    emptyShipmentDetails.TRX_STATUS_FLAG,
                    emptyShipmentDetails.TRX_ERROR_MESSAGE
                );
                emptyShipmentDetails = util.composeShipmentResponseOTMCloud(emptyShipmentDetails);
                response.ShipmentDetails.push(emptyShipmentDetails);
                return await coreUtil.generateSuccessResponse(context, response, 207);
            }

            /* compose shipment details */
            const shipmentDetails = coreUtil.isArray(shipmentDetailsResponse?.data?.SHIPMENT_DETAILS?.SHIPMENT_DETAIL) ? shipmentDetailsResponse?.data?.SHIPMENT_DETAILS?.SHIPMENT_DETAIL : [shipmentDetailsResponse?.data?.SHIPMENT_DETAILS?.SHIPMENT_DETAIL];
            for (const shipmentDetail of shipmentDetails) {
                const shipmentData = util.composeShipmentData({ ...shipmentDetail, ORG_ID: orgId });

                const orderReleaseDetails = coreUtil.isArray(shipmentDetail?.RELEASE_DETAILS?.ORDER_RELEASE_DETAIL) ? shipmentDetail?.RELEASE_DETAILS?.ORDER_RELEASE_DETAIL : [shipmentDetail?.RELEASE_DETAILS?.ORDER_RELEASE_DETAIL];
                for (const orderReleaseDetail of orderReleaseDetails) {
                    const orderReleaseData = util.composeReleaseData(orderReleaseDetail);
                    let shipmentLogRecord = { ...shipmentData, ...orderReleaseData };
                    coreUtil.addIfPresent(shipmentLogRecord, 'TRANSACTION_NUMBER', transactionNumber);
                    coreUtil.addIfPresent(shipmentLogRecord, 'INCIDENT_TYPE', incidentType);
                    coreUtil.addIfPresent(shipmentLogRecord, 'SOURCE_OF_API_CALL', sourceOfApICall || 'DIMITRI');
                    coreUtil.addIfPresent(shipmentLogRecord, 'SCAC_CODE', scacCode);
                    /* Note: 1st call can result in multiple records, thus email (and/or) refValue will not be updated against the records as it may be incorrect */

                    /* check if shipment_gid or order_release_gid is missing */
                    if (!coreUtil.isPresent(shipmentLogRecord.SHIPMENT_GID) || !coreUtil.isPresent(shipmentLogRecord.ORDER_RELEASE_GID)) {
                        response.StatusMessage = 'I cannot find this shipment, please verify the load identifier and try again.';
                        TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                        TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                    }

                    shipmentLogRecord.TRX_ERROR_MESSAGE = TRX_ERROR_MESSAGE;
                    shipmentLogRecord.TRX_STATUS_CODE = TRX_STATUS_CODE;
                    shipmentLogRecord.TRX_STATUS_FLAG = TRX_STATUS_FLAG;

                    shipmentLogRecord = util.addAuditAttributes(shipmentLogRecord, isNewRecord);
                    response.ShipmentDetails.push(shipmentLogRecord);
                }
            }

            response.ShipmentDetails = response.ShipmentDetails.map(slr => {
                if (slr.TRX_STATUS_FLAG !== util.TRANSACTION_STATUS_FLAG.E) {
                    slr.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.I;
                }
                return slr;
            });

            await Promise.all(response.ShipmentDetails.map(slr => {
                try {
                    log.info(context, 'Writing shipment record', slr);
                    return util.writeShipmentLog(slr);
                } catch (error) {
                    log.error(context, error);
                    return null;
                }
            }));
        }
        else {
            const existingShipmentLogRecord = await util.getShipmentLogByTransactionId(context, transactionId);
            if (!coreUtil.isPresent(existingShipmentLogRecord)) {
                /* update shipment log table and return error response */
                response.StatusMessage = 'I cannot find this shipment, please verify the load identifier and try again. (provide load identifier examples)';

                let emptyShipmentDetails = { ...util.composeShipmentData({}), ...util.composeReleaseData({}) };
                TRX_STATUS_CODE = emptyShipmentDetails.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                TRX_STATUS_FLAG = emptyShipmentDetails.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                TRX_ERROR_MESSAGE = emptyShipmentDetails.TRX_ERROR_MESSAGE = response.StatusMessage;
                emptyShipmentDetails = util.composeShipmentResponseOTMCloud(emptyShipmentDetails);
                response.ShipmentDetails.push(emptyShipmentDetails);
                return await coreUtil.generateSuccessResponse(context, response, 207);
            }

            if (!coreUtil.isPresent(sourceOfApICall)) {
                /* update shipment log table and return error response */
                response.StatusMessage = 'Value for source of API call is not provided.';

                let emptyShipmentDetails = { ...util.composeShipmentData({}), ...util.composeReleaseData({ TRANSACTION_ID: transactionId }) };
                TRX_STATUS_CODE = emptyShipmentDetails.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                TRX_STATUS_FLAG = emptyShipmentDetails.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                TRX_ERROR_MESSAGE = emptyShipmentDetails.TRX_ERROR_MESSAGE = response.StatusMessage;
                await util.updateAppointmentLog(context, emptyShipmentDetails.TRANSACTION_ID, null, null,
                    util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                    emptyShipmentDetails.TRX_STATUS_CODE,
                    emptyShipmentDetails.TRX_STATUS_FLAG,
                    emptyShipmentDetails.TRX_ERROR_MESSAGE
                );
                emptyShipmentDetails = util.composeShipmentResponseOTMCloud(emptyShipmentDetails);
                response.ShipmentDetails.push(emptyShipmentDetails);
                return await coreUtil.generateSuccessResponse(context, response, 207);
            }

            if (!coreUtil.isPresent(incidentType)) {
                /* update shipment log table and return error response */
                response.StatusMessage = 'Value for p_incident_type is not provided on 2nd Call.';

                let emptyShipmentDetails = { ...util.composeShipmentData({}), ...util.composeReleaseData({ TRANSACTION_ID: transactionId }) };
                TRX_STATUS_CODE = emptyShipmentDetails.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                TRX_STATUS_FLAG = emptyShipmentDetails.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                TRX_ERROR_MESSAGE = emptyShipmentDetails.TRX_ERROR_MESSAGE = response.StatusMessage;
                await util.updateAppointmentLog(context, emptyShipmentDetails.TRANSACTION_ID, null, null,
                    util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                    emptyShipmentDetails.TRX_STATUS_CODE,
                    emptyShipmentDetails.TRX_STATUS_FLAG,
                    emptyShipmentDetails.TRX_ERROR_MESSAGE
                );
                emptyShipmentDetails = util.composeShipmentResponseOTMCloud(emptyShipmentDetails);
                response.ShipmentDetails.push(emptyShipmentDetails);
                return await coreUtil.generateSuccessResponse(context, response, 207);
            }

            const refnumInsertParams = [];
            const refnumUpdateParams = [];
            const orderReleaseRefnums = [];

            switch (incidentType?.toLowerCase()) {
                case util.INCIDENT_TYPE.PICKUP: {
                    /* Shipment status and WMS status validation */
                    const shipmentAndWMSValidation = util.shipmentAndWMSStatusValidation(existingShipmentLogRecord);
                    if (!shipmentAndWMSValidation.isSuccess) {
                        /* update shipment log table and return error response */
                        response.StatusMessage = shipmentAndWMSValidation.msg;
                        TRX_STATUS_CODE = existingShipmentLogRecord.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                        TRX_STATUS_FLAG = existingShipmentLogRecord.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                        TRX_ERROR_MESSAGE = existingShipmentLogRecord.TRX_ERROR_MESSAGE = response.StatusMessage;
                        await util.updateAppointmentLog(context, existingShipmentLogRecord.TRANSACTION_ID, null, null,
                            util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                            existingShipmentLogRecord.TRX_STATUS_CODE,
                            existingShipmentLogRecord.TRX_STATUS_FLAG,
                            existingShipmentLogRecord.TRX_ERROR_MESSAGE
                        );
                        response.ShipmentDetails.push(util.composeShipmentResponseOTMCloud(existingShipmentLogRecord));
                        return await coreUtil.generateSuccessResponse(context, response, 207);
                    }

                    /* Appointment date and delivery date validation */
                    const apptAndDeliveryDateValidation = util.appointmentAndDeliveryDateValidation(existingShipmentLogRecord);
                    if (!apptAndDeliveryDateValidation.isSuccess) {
                        /* update shipment log table and return error response */
                        response.StatusMessage = apptAndDeliveryDateValidation.msg;
                        TRX_STATUS_CODE = existingShipmentLogRecord.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                        TRX_STATUS_FLAG = existingShipmentLogRecord.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                        TRX_ERROR_MESSAGE = existingShipmentLogRecord.TRX_ERROR_MESSAGE = response.StatusMessage;
                        await util.updateAppointmentLog(context, existingShipmentLogRecord.TRANSACTION_ID, null, null,
                            util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                            existingShipmentLogRecord.TRX_STATUS_CODE,
                            existingShipmentLogRecord.TRX_STATUS_FLAG,
                            existingShipmentLogRecord.TRX_ERROR_MESSAGE
                        );
                        response.ShipmentDetails.push(util.composeShipmentResponseOTMCloud(existingShipmentLogRecord));
                        return await coreUtil.generateSuccessResponse(context, response, 207);
                    }
                    break;
                }
                case util.INCIDENT_TYPE.SCHEDULE:
                case util.INCIDENT_TYPE.RESCHEDULE: {
                    if (coreUtil.addIfPresent(sourceOfApICall) && sourceOfApICall?.toLowerCase() === 'dimitri') {
                        if (coreUtil.isPresent(email)) {
                            if (!coreUtil.isPresent(existingShipmentLogRecord.EMAIL)) {
                                refnumInsertParams.push(
                                    {
                                        refnumQualifier: 'CPU_CONTACT',
                                        refnumValue: email
                                    }
                                );
                            }
                            else {
                                refnumUpdateParams.push(
                                    {
                                        refnumQualifier: 'CPU_CONTACT',
                                        refnumValue: email
                                    }
                                );
                            }

                            /* params to be updated to DB */
                            coreUtil.addIfPresent(shipmentLogUpdateParams, 'EMAIL', email);
                        }
                        else {
                            /* update shipment log table and return error response */
                            response.StatusMessage = 'Email contact not provided for Dimitri source.';

                            let emptyShipmentDetails = { ...util.composeShipmentData({}), ...util.composeReleaseData({ TRANSACTION_ID: transactionId }) };
                            TRX_STATUS_CODE = emptyShipmentDetails.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                            TRX_STATUS_FLAG = emptyShipmentDetails.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                            TRX_ERROR_MESSAGE = emptyShipmentDetails.TRX_ERROR_MESSAGE = response.StatusMessage;
                            emptyShipmentDetails = util.addAuditAttributes(emptyShipmentDetails, isNewRecord);
                            await util.updateAppointmentLog(context, emptyShipmentDetails.TRANSACTION_ID, null, null,
                                util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                                emptyShipmentDetails.TRX_STATUS_CODE,
                                emptyShipmentDetails.TRX_STATUS_FLAG,
                                emptyShipmentDetails.TRX_ERROR_MESSAGE
                            );
                            emptyShipmentDetails = util.composeShipmentResponseOTMCloud(emptyShipmentDetails);
                            response.ShipmentDetails.push(emptyShipmentDetails);
                            return await coreUtil.generateSuccessResponse(context, response, 207);
                        }
                    }

                    if (coreUtil.addIfPresent(refValue)) {
                        if (!coreUtil.isPresent(existingShipmentLogRecord.REF_VALUE)) {
                            refnumInsertParams.push(
                                {
                                    refnumQualifier: 'REF_VALUE',
                                    refnumValue: refValue
                                }
                            );
                        }
                        else {
                            refnumUpdateParams.push(
                                {
                                    refnumQualifier: 'REF_VALUE',
                                    refnumValue: refValue
                                }
                            );
                        }

                        /* Return ref_value param in response if present */
                        /* Ref: https://dev.azure.com/niagarabottling/App_Integration/_wiki/wikis/App-Integration---API.wiki/838/Dimitri-GET_SHIPMENT_DETAILS-API */
                        existingShipmentLogRecord.REF_VALUE = refValue;

                        /* params to be updated to DB */
                        coreUtil.addIfPresent(shipmentLogUpdateParams, 'REF_VALUE', refValue);
                    }
                    break;
                }
                default: {
                    /* update shipment log table and return error response */
                    response.StatusMessage = 'Combination of source of API call and incident type is not valid.';

                    let emptyShipmentDetails = { ...util.composeShipmentData({}), ...util.composeReleaseData({ TRANSACTION_ID: transactionId }) };
                    TRX_STATUS_CODE = emptyShipmentDetails.TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                    TRX_STATUS_FLAG = emptyShipmentDetails.TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                    TRX_ERROR_MESSAGE = emptyShipmentDetails.TRX_ERROR_MESSAGE = response.StatusMessage;
                    emptyShipmentDetails = util.addAuditAttributes(emptyShipmentDetails, isNewRecord);
                    await util.updateAppointmentLog(context, emptyShipmentDetails.TRANSACTION_ID, null, null,
                        util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                        emptyShipmentDetails.TRX_STATUS_CODE,
                        emptyShipmentDetails.TRX_STATUS_FLAG,
                        emptyShipmentDetails.TRX_ERROR_MESSAGE
                    );
                    emptyShipmentDetails = util.composeShipmentResponseOTMCloud(emptyShipmentDetails);
                    response.ShipmentDetails.push(emptyShipmentDetails);
                    return await coreUtil.generateSuccessResponse(context, response, 207);
                }
            }

            /* Derive rate-offering-gid for PEPSI */
            const rateOfferingGid = util.getRateOfeeringGid(existingShipmentLogRecord, appointmentType);

            if (refnumInsertParams.length > 0) {
                /* generic refnum update */
                orderReleaseRefnums.push(
                    {
                        transactionCode: 'IU',
                        deliveryId: existingShipmentLogRecord.DELIVERY,
                        params: refnumInsertParams
                    }
                );
            }
            if (refnumUpdateParams.length > 0) {
                /* generic refnum update */
                orderReleaseRefnums.push(
                    {
                        transactionCode: 'U',
                        deliveryId: existingShipmentLogRecord.DELIVERY,
                        params: refnumUpdateParams
                    }
                );
            }

            const isRefnumUpdateRequired = orderReleaseRefnums.length > 0;
            const isRateOfferingGidUpdateRequired = rateOfferingGid !== existingShipmentLogRecord.RATE_OFFERING_GID;
            const isPreloadUpdateRequired = existingShipmentLogRecord.IS_PRELOAD !== existingShipmentLogRecord.APPOINTMENT_TYPE;

            /* Make all update API calls in parallel to save time */
            const [refnumUpdateResponse, rateOfferingGidUpdateResponse, preloadUpdateResponse] = await Promise.all([
                isRefnumUpdateRequired ? util.genericRefnumUpdate(context, orderReleaseRefnums) : null,
                isRateOfferingGidUpdateRequired ? util.updateRateOfferingGid(context, existingShipmentLogRecord.ORDER_RELEASE_GID, rateOfferingGid) : null,
                isPreloadUpdateRequired ? util.updatePreload(context, existingShipmentLogRecord.SHIPMENT_GID, existingShipmentLogRecord.IS_PRELOAD, existingShipmentLogRecord.APPOINTMENT_TYPE) : null
            ]);

            /* check refnum update status */
            if (coreUtil.isPresent(refnumUpdateResponse)) {
                /* update shipment log table */
                if (!refnumUpdateResponse.isSuccess) {
                    TRX_ERROR_MESSAGE = refnumUpdateResponse.msg;
                    TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                    TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
                }

                const genRefnumUpdateReqId = coreUtil.getTextFromXmlObj(refnumUpdateResponse?.data?.['otm:TransmissionAck']?.['otm:EchoedTransmissionHeader']?.['otm:TransmissionHeader']?.['otm:ReferenceTransmissionNo']);

                /* params to be updated to DB */
                coreUtil.addIfPresent(shipmentLogUpdateParams, 'GEN_REFNUM_UPDATE_REQ_ID', genRefnumUpdateReqId);
            }

            /* check RateOfferingGid update status */
            if (coreUtil.isPresent(rateOfferingGidUpdateResponse) && !rateOfferingGidUpdateResponse.isSuccess) {
                /* update shipment log table */
                TRX_ERROR_MESSAGE = rateOfferingGidUpdateResponse.msg;
                TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
            }
            else {
                /* update rateOfferingGid in response and in DB */
                existingShipmentLogRecord.RATE_OFFERING_GID = rateOfferingGid;
                coreUtil.addIfPresent(shipmentLogUpdateParams, 'RATE_OFFERING_GID', rateOfferingGid);
            }

            /* check appointment_type update status */
            if (coreUtil.isPresent(preloadUpdateResponse) && !preloadUpdateResponse.isSuccess) {
                /* update shipment log table */
                TRX_ERROR_MESSAGE = preloadUpdateResponse.msg;
                TRX_STATUS_CODE = util.TRANSACTION_STATUS_CODE.ERROR;
                TRX_STATUS_FLAG = util.TRANSACTION_STATUS_FLAG.E;
            }
            else {
                /* update appointment type in response and in DB */
                existingShipmentLogRecord.IS_PRELOAD = existingShipmentLogRecord.APPOINTMENT_TYPE;
                coreUtil.addIfPresent(shipmentLogUpdateParams, 'IS_PRELOAD', existingShipmentLogRecord.APPOINTMENT_TYPE);
            }

            /* update status in response */
            existingShipmentLogRecord.TRX_ERROR_MESSAGE = response.StatusMessage = TRX_ERROR_MESSAGE;
            existingShipmentLogRecord.TRX_STATUS_CODE = TRX_STATUS_CODE;
            existingShipmentLogRecord.TRX_STATUS_FLAG = TRX_STATUS_FLAG;

            /* params to be updated to DB */
            coreUtil.addIfPresent(shipmentLogUpdateParams, 'TRX_STATUS_LEVEL', util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT);
            coreUtil.addIfPresent(shipmentLogUpdateParams, 'TRX_STATUS_CODE', TRX_STATUS_CODE);
            coreUtil.addIfPresent(shipmentLogUpdateParams, 'TRX_ERROR_MESSAGE', TRX_ERROR_MESSAGE);

            if (TRX_STATUS_FLAG !== util.TRANSACTION_STATUS_FLAG.E) {
                coreUtil.addIfPresent(shipmentLogUpdateParams, 'TRX_STATUS_FLAG', util.TRANSACTION_STATUS_FLAG.I);
            }

            response.ShipmentDetails.push(existingShipmentLogRecord);
            await util.updateAppointmentLogWithObj(context, existingShipmentLogRecord.TRANSACTION_ID, shipmentLogUpdateParams);
        }

        response.ShipmentDetails = response.ShipmentDetails.map(sd => util.composeShipmentResponseOTMCloud(sd));
        log.info(context, 'Sending response', response, true);
        return coreUtil.generateSuccessResponse(context, response, 207);
    } catch (error) {
        log.error(context, error);

        /* update status */
        if (coreUtil.isPresent(body?.TransactionID)) {
            await util.updateAppointmentLog(context, body?.TransactionID,
                null, null,
                util.TRANSACTION_STATUS_LEVEL.GET_SHIPMENT,
                util.TRANSACTION_STATUS_CODE.ERROR,
                util.TRANSACTION_STATUS_FLAG.E,
                'Get shipment failed while fetching data from OTM Cloud'
            );
        }

        /* Send email notification */
        log.info(context, `Sending email notifiication for the failed get shipment.`);

        const notificationObj = {
            payload: body,
            errorMsg: error?.message,
            code: error?.code,
            stack: error?.stacktrace
        }
        await util.sendFailedEventNotification(context, notificationObj, error);
        response.StatusMessage = coreUtil.isPresent(error?.code) && error?.code === 'ECONNABORTED' ? 'OTM API Timed out. please contact Niagara Integration team.' : 'Technical fault has occurred. please contact Niagara Integration team.';
        return await coreUtil.generateErrorResponse(context, error, null, response);
    }
}

async function bookAppointment(request, context) {
    let body = null;
    let response = {
        TransactionStatusCode: null,
        message: null,
        ErrorDescription: null
    };
    let isRetry = false;
    try {
        /* register request */
        await coreUtil.registerRequest(request, context);

        body = await request.json();

        /* log init */
        const correlationId = body?.TransactionId;
        const requestId = body?.TransactionId;
        await log.init(context, correlationId, requestId, [body?.ShipmentGid, body?.DeliveryNumber]);

        /* schema validation */
        coreUtil.validateSchema(body, schema.bookAppointment);

        /* business logic */
        const transactionId = body.TransactionId;
        const deliveryNumber = coreUtil.isPresent(body.DeliveryNumber) && body.DeliveryNumber.trim().length > 0 ? parseInt(body.DeliveryNumber) : null;
        const shipmentGid = coreUtil.isPresent(body.ShipmentGid) && body.ShipmentGid.trim().length > 0 ? body.ShipmentGid : null;
        let earliestRescheduleTime = coreUtil.isPresent(body.EarliestRescheduleTime) && body.EarliestRescheduleTime.trim().length > 0 ? body.EarliestRescheduleTime : null;
        let latestRescheduleTime = coreUtil.isPresent(body.LatestRescheduleTime) && body.LatestRescheduleTime.trim().length > 0 ? body.LatestRescheduleTime : null;

        /* testing params - only for non-prod env */
        const lateDeliveryFlagParam = body.lateDeliveryFlag === 'Y';
        const productAvailabilityDateParam = body.productAvailabilityDate;

        earliestRescheduleTime = coreUtil.getTime('yyyy-mm-dd"T"HH:MM:ss', earliestRescheduleTime);
        latestRescheduleTime = coreUtil.getTime('yyyy-mm-dd"T"HH:MM:ss', latestRescheduleTime);
        log.info(context, `Request start time: ${earliestRescheduleTime}`);
        log.info(context, `Request end time: ${latestRescheduleTime}`);

        do {
            isRetry = false;

            /* fetch appt details */
            const requestDate = `${earliestRescheduleTime.split('T')[0]}T00:00:00Z`;
            const shipmentNumber = shipmentGid.split('.').pop();
            const [appointmentLogRec, availableSlotDetails] = await Promise.all([
                util.getShipmentLogByTransactionId(context, transactionId),
                util.querySlotsFromFourKites(context, shipmentNumber, requestDate)
            ]);
            response = { ...response, ...util.composeBookAppointmentResponse(appointmentLogRec) };

            /* when no appt log records found */
            if (!coreUtil.isPresent(appointmentLogRec)) {
                response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;
                const msg = `No appointment log records found for the given TransactionId (${transactionId})`;
                response.message = msg;
                response.ErrorDescription = msg;
                log.info(context, 'Sending response', response, true);
                return coreUtil.generateSuccessResponse(context, response);
            }

            /* estimated transit time = (loaded distance / 50 mile-per-hour) + 2 hrs loading-unloading buffer */
            const loadedDistance = appointmentLogRec.LOADED_DISTANCE;
            const estimatedTransitTimeInHour = (parseFloat(loadedDistance) / 50) + 2;
            let isLateDeliveryAccepted = appointmentLogRec.LATE_DELIVERY_FLAG === 'Y';
            const deliveryAppointment = appointmentLogRec.DELIVERY_APPOINTMENT;
            const loadType = appointmentLogRec.PAYMENT_METHOD;
            const sourceOfApiCall = appointmentLogRec.SOURCE_OF_API_CALL;
            const originalAppointmentDate = appointmentLogRec.APPOINTMENT_DATE;
            const slotIntervalMinutes = availableSlotDetails?.data?.slotInterval || 0;
            const plantTimezone = availableSlotDetails?.data?.timeZoneName;

            /* testing params - only for non-prod env */
            if (process.env.STAGE !== coreEnums.ENV.PROD && !coreUtil.isPresent(appointmentLogRec.LATE_DELIVERY_FLAG)) {
                isLateDeliveryAccepted = lateDeliveryFlagParam;
            }

            /* fourkites response validation */
            const isFindSlotSuccessful = availableSlotDetails.code === 200;
            const findSlotStatusCode = isFindSlotSuccessful ? util.TRANSACTION_STATUS_CODE.SUCCESS : util.TRANSACTION_STATUS_CODE.ERROR;
            const findSlotStatusFlag = isFindSlotSuccessful ? util.TRANSACTION_STATUS_FLAG.P : util.TRANSACTION_STATUS_FLAG.E;
            const findSlotMsg = util.composeFetchSlotMessage(isFindSlotSuccessful, availableSlotDetails);
            response.message = findSlotMsg;
            response.TransactionStatusCode = findSlotStatusCode;
            log.info(context, 'FK Slots', availableSlotDetails?.data?.Slots);
            /* update appt log table */
            await util.updateAppointmentLog(context, transactionId,
                earliestRescheduleTime,
                latestRescheduleTime,
                util.TRANSACTION_STATUS_LEVEL.FETCH_SLOT,
                findSlotStatusCode,
                findSlotStatusFlag,
                findSlotMsg,
                null,
                null,
                availableSlotDetails?.request_id
            );
            if (!isFindSlotSuccessful) {
                log.info(context, 'Sending response', response, true);
                return coreUtil.generateSuccessResponse(context, response);
            }

            /* request date validation */
            const reqDateValidation = util.requestDateValidation(context, originalAppointmentDate, earliestRescheduleTime, latestRescheduleTime, plantTimezone);
            if (!reqDateValidation.isSuccess) {
                response.message = reqDateValidation.message;
                response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                /* update appt log table */
                await util.updateAppointmentLog(context, transactionId,
                    earliestRescheduleTime,
                    latestRescheduleTime,
                    util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                    response.TransactionStatusCode,
                    util.TRANSACTION_STATUS_FLAG.E,
                    reqDateValidation.message
                );
                log.info(context, 'Sending response', response, true);
                return coreUtil.generateSuccessResponse(context, response);
            }

            /* Loaded distance validation */
            if (!coreUtil.addIfPresent(loadedDistance)) {
                response.message = 'Loaded distance is not available, please check OTM.';
                response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                /* update appt log table */
                await util.updateAppointmentLog(context, transactionId,
                    earliestRescheduleTime,
                    latestRescheduleTime,
                    util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                    response.TransactionStatusCode,
                    util.TRANSACTION_STATUS_FLAG.E,
                    response.message
                );
                log.info(context, 'Sending response', response, true);
                return coreUtil.generateSuccessResponse(context, response);
            }

            /* check if shipment_gid is available and shipment_gid & transaction_id combination is correct */
            const shipmentGidValidation = util.validateShipmentGid(appointmentLogRec.SHIPMENT_GID, shipmentGid);
            if (!shipmentGidValidation.isSuccess) {
                response.message = shipmentGidValidation.message;
                response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                /* update appt log table */
                await util.updateAppointmentLog(context, transactionId,
                    earliestRescheduleTime,
                    latestRescheduleTime,
                    util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                    response.TransactionStatusCode,
                    util.TRANSACTION_STATUS_FLAG.E,
                    shipmentGidValidation.message
                );
                log.info(context, 'Sending response', response, true);
                return coreUtil.generateSuccessResponse(context, response);
            }

            /* check transaction status flag and level */
            const trxStatusValidation = util.validateTransactionStatus(appointmentLogRec.TRX_STATUS_FLAG, appointmentLogRec.TRX_STATUS_LEVEL, sourceOfApiCall);
            if (!trxStatusValidation.isSuccess) {
                response.message = trxStatusValidation.message;
                response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                /* update appt log table */
                await util.updateAppointmentLog(context, transactionId,
                    earliestRescheduleTime,
                    latestRescheduleTime,
                    util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                    response.TransactionStatusCode,
                    util.TRANSACTION_STATUS_FLAG.E,
                    shipmentGidValidation.message
                );
                log.info(context, 'Sending response', response, true);
                return coreUtil.generateSuccessResponse(context, response);
            }

            /* validate delivery appt */
            const deliveryApptValidation = util.validateDeliveryAppt(loadType, earliestRescheduleTime, deliveryAppointment);
            if (!deliveryApptValidation.isSuccess) {
                response.message = deliveryApptValidation.message;
                response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                /* update appt log table */
                await util.updateAppointmentLog(context, transactionId,
                    earliestRescheduleTime,
                    latestRescheduleTime,
                    util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                    response.TransactionStatusCode,
                    util.TRANSACTION_STATUS_FLAG.E,
                    deliveryApptValidation.message
                );
                log.info(context, 'Sending response', response, true);
                return coreUtil.generateSuccessResponse(context, response);
            }

            /* fetch available slots */
            let availableSlots = util.getAvailableSlots(context, availableSlotDetails, earliestRescheduleTime, latestRescheduleTime);

            /* check if original appointment is available */
            if (!coreUtil.isPresent(originalAppointmentDate) || originalAppointmentDate === '') {
                const { isEnoughTransitTime, estimatedApptEndTime } = util.evaluateTransitTime(context, estimatedTransitTimeInHour, earliestRescheduleTime, latestRescheduleTime, deliveryAppointment, slotIntervalMinutes);
                latestRescheduleTime = estimatedApptEndTime;

                if (loadType === util.LOAD_TYPE.VDE) {
                    if (isEnoughTransitTime) {
                        response.message = 'This load does not have an assigned pickup appointment yet. But has enough transit time, So we can allot slot in the time range.';
                        response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.SUCCESS;

                        /* update appt log table */
                        await util.updateAppointmentLog(context, transactionId,
                            earliestRescheduleTime,
                            latestRescheduleTime,
                            util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                            response.TransactionStatusCode,
                            util.TRANSACTION_STATUS_FLAG.E,
                            response.message
                        );

                        /* re evaluate available slots based on new req window end time */
                        availableSlots = util.getAvailableSlots(context, availableSlotDetails, earliestRescheduleTime, latestRescheduleTime);
                    }
                    else {
                        response.message = 'This load does not have an assigned pickup appointment yet. It does not have enough transit time.';
                        response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                        /* update appt log table */
                        await util.updateAppointmentLog(context, transactionId,
                            earliestRescheduleTime,
                            latestRescheduleTime,
                            util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                            response.TransactionStatusCode,
                            util.TRANSACTION_STATUS_FLAG.E,
                            response.message
                        );
                        log.info(context, 'Sending response', response, true);
                        return coreUtil.generateSuccessResponse(context, response);
                    }
                }
                else {
                    response.message = 'This load does not have an assigned pickup appointment yet. Please process this pickup change as normal.';
                    response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                    /* update appt log table */
                    await util.updateAppointmentLog(context, transactionId,
                        earliestRescheduleTime,
                        latestRescheduleTime,
                        util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                        response.TransactionStatusCode,
                        util.TRANSACTION_STATUS_FLAG.E,
                        response.message
                    );
                    log.info(context, 'Sending response', response, true);
                    return coreUtil.generateSuccessResponse(context, response);
                }
            }
            else {
                /* check if prepone request or postpone */
                const isPostponeRequest = util.isPostponeRequest(originalAppointmentDate, earliestRescheduleTime);
                log.info(context, `isPostponeRequest: ${isPostponeRequest}`);
                if (isPostponeRequest) {
                    /* handle postpone schenario */
                    /* Check load type */
                    log.info(context, `loadType: ${loadType}`);
                    if (loadType === util.LOAD_TYPE.VDE) {

                        // +-2 hours range with transit time
                        const { isEnoughTransitTime, newCheckRangeStart, newCheckRangeEnd } = util.getRescheduleTimeWithTwoHoursForVDE(context, originalAppointmentDate, earliestRescheduleTime, latestRescheduleTime, estimatedTransitTimeInHour, deliveryAppointment, slotIntervalMinutes);
                        /* re evaluate available slots based on new req window */
                        earliestRescheduleTime = earliestRescheduleTime < newCheckRangeStart ? newCheckRangeStart : earliestRescheduleTime;
                        availableSlots = util.getAvailableSlots(context, availableSlotDetails, earliestRescheduleTime, newCheckRangeEnd);
                        /* if slot not available in later hours then check with -2 in earlier time  */
                        if (!availableSlots?.length) {
                            earliestRescheduleTime = earliestRescheduleTime > newCheckRangeEnd ? newCheckRangeEnd : earliestRescheduleTime;
                            availableSlots = util.getAvailableSlots(context, availableSlotDetails, newCheckRangeStart, earliestRescheduleTime, false);
                        }

                        /* scenario - 1: postpone + transit time not enough + late delivery allowed */
                        if (!isEnoughTransitTime && isLateDeliveryAccepted) {
                            response.message = 'Team, transit time is insufficient but this location accepts late delivery. Please double check if the change can be made.';
                            response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                            /* update appt log table */
                            await util.updateAppointmentLog(context, transactionId,
                                earliestRescheduleTime,
                                latestRescheduleTime,
                                util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                                response.TransactionStatusCode,
                                util.TRANSACTION_STATUS_FLAG.E,
                                response.message
                            );
                            log.info(context, 'Sending response', response, true);
                            return coreUtil.generateSuccessResponse(context, response);
                        }
                        /* scenario - 2: postpone + transit time not enough + late delivery not allowed */
                        else if (!isEnoughTransitTime && !isLateDeliveryAccepted) {
                            response.message = 'This change might affect OTD, would you like to proceed? (No fees will be approved if any accrue due to driver being late to their appointment).';
                            response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                            /* update appt log table */
                            await util.updateAppointmentLog(context, transactionId,
                                earliestRescheduleTime,
                                latestRescheduleTime,
                                util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                                response.TransactionStatusCode,
                                util.TRANSACTION_STATUS_FLAG.E,
                                response.message
                            );
                            log.info(context, 'Sending response', response, true);
                            return coreUtil.generateSuccessResponse(context, response);
                        }
                        /* scenario - 3: postpone + transit time enough + late delivery allowed */
                        /* scenario - 4: postpone + transit time enough + late delivery not allowed */
                        else if (isEnoughTransitTime) {
                            response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.SUCCESS;
                        }
                        else {
                            response.message = `Team, transit time is insufficient and this location doesn't accept late delivery.`;
                            response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                            /* update appt log table */
                            await util.updateAppointmentLog(context, transactionId,
                                earliestRescheduleTime,
                                latestRescheduleTime,
                                util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                                response.TransactionStatusCode,
                                util.TRANSACTION_STATUS_FLAG.E,
                                response.message
                            );
                            log.info(context, 'Sending response', response, true);
                            return coreUtil.generateSuccessResponse(context, response);
                        }
                    } else {
                        /* handle CPU postpone schenario */
                        /* same day pick up validation */
                        const sameDayPickupValidation = util.sameDayPickupValidation(originalAppointmentDate, earliestRescheduleTime, latestRescheduleTime);
                        if (!sameDayPickupValidation.isSuccess) {
                            response.message = sameDayPickupValidation.message;
                            response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                            /* update appt log table */
                            await util.updateAppointmentLog(context, transactionId,
                                earliestRescheduleTime,
                                latestRescheduleTime,
                                util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                                response.TransactionStatusCode,
                                util.TRANSACTION_STATUS_FLAG.E,
                                sameDayPickupValidation.message
                            );
                            log.info(context, 'Sending response', response, true);
                            return coreUtil.generateSuccessResponse(context, response);
                        }

                        if (!availableSlots?.length) {
                            /* Slot is not available in requested time */
                            /* Check slot for +-2 hours */
                            const newScheduleTime = util.getRescheduleTimeWithTwoHours(originalAppointmentDate, earliestRescheduleTime, latestRescheduleTime);
                            earliestRescheduleTime = earliestRescheduleTime < newScheduleTime.newCheckRangeStart ? newScheduleTime.newCheckRangeStart : earliestRescheduleTime;
                            availableSlots = util.getAvailableSlots(context, availableSlotDetails, earliestRescheduleTime, newScheduleTime.newCheckRangeEnd);
                            /* if slot not available in later hours then check with -2 in earlier time  */
                            if (!availableSlots?.length) {
                                earliestRescheduleTime = earliestRescheduleTime > newScheduleTime.newCheckRangeEnd ? newScheduleTime.newCheckRangeEnd : earliestRescheduleTime;
                                availableSlots = util.getAvailableSlots(context, availableSlotDetails, newScheduleTime.newCheckRangeStart, earliestRescheduleTime, false);
                            }
                        }
                    }
                }
                else {
                    /* handle prepone schenario */
                    /* fetch product avaiable date */
                    const productAvailabilityRawRes = await util.getProductAvailability(context, deliveryNumber);
                    let productAvailabileDate = util.parseProductAvailability(productAvailabilityRawRes);

                    /* testing params - only for non-prod env */
                    if (process.env.STAGE !== coreEnums.ENV.PROD && !coreUtil.isPresent(productAvailabileDate)) {
                        productAvailabileDate = productAvailabilityDateParam;
                    }

                    /* when product availabiility date not available */
                    if (!coreUtil.isPresent(productAvailabileDate)) {
                        response.message = 'Team, there is an issue retrieving product available time in EBS. Please check with FG planners.';
                        response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                        /* update appt log table */
                        await util.updateAppointmentLog(context, transactionId,
                            earliestRescheduleTime,
                            latestRescheduleTime,
                            util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                            response.TransactionStatusCode,
                            util.TRANSACTION_STATUS_FLAG.E,
                            response.message,
                            productAvailabileDate
                        );
                        log.info(context, 'Sending response', response, true);
                        return coreUtil.generateSuccessResponse(context, response);
                    }

                    /* when product is not available */
                    const isProductAvl = util.isProductAvailable(productAvailabileDate, earliestRescheduleTime, latestRescheduleTime);
                    if (!isProductAvl) {
                        response.message = `Product available date per ebs mass update is ${coreUtil.getTime('mm/dd/yyyy HH:MM:ss', productAvailabileDate)}. Please check with FG planners to confirm if the request can be accommodated.`
                        response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                        /* update appt log table */
                        await util.updateAppointmentLog(context, transactionId,
                            earliestRescheduleTime,
                            latestRescheduleTime,
                            util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                            response.TransactionStatusCode,
                            util.TRANSACTION_STATUS_FLAG.E,
                            response.message,
                            productAvailabileDate
                        );
                        log.info(context, 'Sending response', response, true);
                        return coreUtil.generateSuccessResponse(context, response);
                    }

                    /* handle prepone VDE load type */
                    if (loadType === util.LOAD_TYPE.VDE) {

                        // +-2 hours range with transit time
                        const { isEnoughTransitTime, newCheckRangeStart, newCheckRangeEnd } = util.getRescheduleTimeWithTwoHoursForVDE(context, originalAppointmentDate, earliestRescheduleTime, latestRescheduleTime, estimatedTransitTimeInHour, deliveryAppointment, slotIntervalMinutes, productAvailabileDate);
                        /* re evaluate available slots based on new req window end time */
                        earliestRescheduleTime = earliestRescheduleTime < newCheckRangeStart ? newCheckRangeStart : earliestRescheduleTime;
                        availableSlots = util.getAvailableSlots(context, availableSlotDetails, earliestRescheduleTime, newCheckRangeEnd);
                        /* if slot not available in later hours then check with -2 in earlier time  */
                        if (!availableSlots?.length) {
                            earliestRescheduleTime = earliestRescheduleTime > newCheckRangeEnd ? newCheckRangeEnd : earliestRescheduleTime;
                            availableSlots = util.getAvailableSlots(context, availableSlotDetails, newCheckRangeStart, earliestRescheduleTime, false);
                        }

                        if (!isEnoughTransitTime && isLateDeliveryAccepted) {
                            response.message = 'Please note this change might affect OTD.';
                            response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.IN_PROGRESS;

                            /* update appt log table */
                            await util.updateAppointmentLog(context, transactionId,
                                earliestRescheduleTime,
                                latestRescheduleTime,
                                util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                                response.TransactionStatusCode,
                                util.TRANSACTION_STATUS_FLAG.P,
                                response.message,
                                productAvailabileDate
                            );
                            /* Note: proceed with the booking as the carrier is trying to deliver the shipment on time */
                        }
                        else if (!isEnoughTransitTime && !isLateDeliveryAccepted) {
                            response.message = 'This change might affect OTD, would you like to proceed? (No fees will be approved if any accrue due to driver being late to their appointment).';
                            response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                            /* update appt log table */
                            await util.updateAppointmentLog(context, transactionId,
                                earliestRescheduleTime,
                                latestRescheduleTime,
                                util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                                response.TransactionStatusCode,
                                util.TRANSACTION_STATUS_FLAG.E,
                                response.message,
                                productAvailabileDate
                            );
                            log.info(context, 'Sending response', response, true);
                            return coreUtil.generateSuccessResponse(context, response);
                        }
                        else if (isEnoughTransitTime && isLateDeliveryAccepted) {
                            response.message = 'Slots available.';
                            response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.SUCCESS;
                        }
                        else if (isEnoughTransitTime && !isLateDeliveryAccepted) {
                            response.message = 'Slots available.';
                            response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.SUCCESS;
                        }
                    } else {
                        /* handle prepone CPU schenario */
                        /* same day pick up validation */
                        const sameDayPickupValidation = util.sameDayPickupValidation(originalAppointmentDate, earliestRescheduleTime, latestRescheduleTime);
                        if (!sameDayPickupValidation.isSuccess) {
                            response.message = sameDayPickupValidation.message;
                            response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;

                            /* update appt log table */
                            await util.updateAppointmentLog(context, transactionId,
                                earliestRescheduleTime,
                                latestRescheduleTime,
                                util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                                response.TransactionStatusCode,
                                util.TRANSACTION_STATUS_FLAG.E,
                                response.message,
                                productAvailabileDate
                            );
                            log.info(context, 'Sending response', response, true);
                            return coreUtil.generateSuccessResponse(context, response);
                        }

                        if (!availableSlots?.length) {
                            /* Slot is not available in requested time */
                            /* Check slot for +-2 hours */
                            const newScheduleTime = util.getRescheduleTimeWithTwoHours(originalAppointmentDate, earliestRescheduleTime, latestRescheduleTime, productAvailabileDate);
                            earliestRescheduleTime = earliestRescheduleTime < newScheduleTime.newCheckRangeStart ? newScheduleTime.newCheckRangeStart : earliestRescheduleTime;
                            availableSlots = util.getAvailableSlots(context, availableSlotDetails, earliestRescheduleTime, newScheduleTime.newCheckRangeEnd);
                            /* if slot not available in later hours then check with -2 in earlier time  */
                            if (!availableSlots?.length) {
                                earliestRescheduleTime = earliestRescheduleTime > newScheduleTime.newCheckRangeEnd ? newScheduleTime.newCheckRangeEnd : earliestRescheduleTime;
                                availableSlots = util.getAvailableSlots(context, availableSlotDetails, newScheduleTime.newCheckRangeStart, earliestRescheduleTime, false);
                            }
                        }
                    }
                }
            }

            /* in case we found best slot for any of CPU or VDE */
            if (availableSlots.length > 0) {
                let availableSlot = null;
                availableSlot = availableSlots[0];
                log.info(context, `Using slot ${JSON.stringify(availableSlot)}`);

                /* pull tender */
                const pullTenderResponse = await util.pullTender(context, shipmentNumber, transactionId);
                const isPullTenderSuccessful = pullTenderResponse.Status === 'Success';
                const pullTenderMsgStatusCode = isPullTenderSuccessful ? util.TRANSACTION_STATUS_CODE.IN_PROGRESS : util.TRANSACTION_STATUS_CODE.ERROR;
                const pullTenderStatusFlag = isPullTenderSuccessful ? util.TRANSACTION_STATUS_FLAG.P : util.TRANSACTION_STATUS_FLAG.E;
                const pullTenderMsg = util.composePullTenderMessage(isPullTenderSuccessful);
                response.message = pullTenderMsg;
                response.TransactionStatusCode = pullTenderMsgStatusCode;
                /* update appt log table */
                await util.updateAppointmentLog(context, transactionId,
                    earliestRescheduleTime,
                    latestRescheduleTime,
                    null, /* generic API is updating the level, err-msg and pull-tender-ref-id */
                    pullTenderMsgStatusCode,
                    pullTenderStatusFlag
                );

                if (!isPullTenderSuccessful) {
                    log.info(context, 'Sending response', response, true);
                    return coreUtil.generateSuccessResponse(context, response);
                }

                /* Reserve slot */
                const reserveSlotResponse = await util.reserveSlotFourKites(context, shipmentNumber, availableSlot.startTime, availableSlot.endTime);
                const isReserveSlotSuccessful = reserveSlotResponse.code === 200;
                const reserveSlotStatusCode = isReserveSlotSuccessful ? util.TRANSACTION_STATUS_CODE.IN_PROGRESS : util.TRANSACTION_STATUS_CODE.ERROR;
                const reserveSlotStatusFlag = isReserveSlotSuccessful ? util.TRANSACTION_STATUS_FLAG.P : util.TRANSACTION_STATUS_FLAG.E;
                const reserveSlotMsg = util.composeReserveSlotMessage(isReserveSlotSuccessful, reserveSlotResponse);
                isRetry = util.isBookApptRetry(context, reserveSlotMsg);
                response.message = reserveSlotMsg;
                response.TransactionStatusCode = reserveSlotStatusCode;
                /* update appt log table */
                await util.updateAppointmentLog(context, transactionId,
                    earliestRescheduleTime,
                    latestRescheduleTime,
                    util.TRANSACTION_STATUS_LEVEL.RESERVE_SLOT,
                    reserveSlotStatusCode,
                    reserveSlotStatusFlag,
                    reserveSlotMsg,
                    null, null, null,
                    reserveSlotResponse?.request_id
                );

                if (isRetry) {
                    continue;
                }

                if (!isReserveSlotSuccessful) {
                    log.info(context, 'Sending response', response, true);
                    return coreUtil.generateSuccessResponse(context, response);
                }

                /* Book slot */
                const bookSlotResponse = await util.bookSlotFourKites(context, shipmentNumber, reserveSlotResponse?.data?.reserveSlotId);
                const isBookSlotSuccesssful = bookSlotResponse.code === 200;
                const bookSlotStatusCode = isBookSlotSuccesssful ? util.TRANSACTION_STATUS_CODE.SUCCESS : util.TRANSACTION_STATUS_CODE.ERROR;
                const bookSlotStatusFlag = isBookSlotSuccesssful ? util.TRANSACTION_STATUS_FLAG.S : util.TRANSACTION_STATUS_FLAG.E;
                const bookSlotMsg = util.composeBookSlotMessage(isBookSlotSuccesssful, bookSlotResponse);
                isRetry = util.isBookApptRetry(context, bookSlotMsg);
                response.message = bookSlotMsg;
                response.TransactionStatusCode = bookSlotStatusCode;
                response.AppointmentDate = coreUtil.getTime('yyyy-mm-dd"T"HH:MM:ss', availableSlot?.startTime);
                /* update appt log table */
                await util.updateAppointmentLog(context, transactionId,
                    earliestRescheduleTime,
                    latestRescheduleTime,
                    util.TRANSACTION_STATUS_LEVEL.BOOK_SLOT,
                    bookSlotStatusCode,
                    bookSlotStatusFlag,
                    bookSlotMsg,
                    null, null, null, null,
                    bookSlotResponse?.request_id
                );

                if (isRetry) {
                    continue;
                }

                if (!isBookSlotSuccesssful) {
                    log.info(context, 'Sending response', response, true);
                    return coreUtil.generateSuccessResponse(context, response);
                }

            } else {
                /* slot not available */
                response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;
                response.message = 'No slots available.';

                /* update appt log table */
                await util.updateAppointmentLog(context, transactionId,
                    earliestRescheduleTime,
                    latestRescheduleTime,
                    util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
                    response.TransactionStatusCode,
                    util.TRANSACTION_STATUS_FLAG.E,
                    response.message
                );
            }
        } while (isRetry);

        log.info(context, 'Sending response', response, true);
        return coreUtil.generateSuccessResponse(context, response);
    } catch (error) {
        log.error(context, error, body);

        /* update appt log table */
        await util.updateAppointmentLog(context, body?.TransactionId,
            null, null,
            util.TRANSACTION_STATUS_LEVEL.FIND_SLOT,
            util.TRANSACTION_STATUS_CODE.ERROR,
            util.TRANSACTION_STATUS_FLAG.E,
            'Failed while finding a slot or booking the slot'
        );

        /* Send email notification */
        log.info(context, `Sending email notification for the failed get shipment.`, body, true);
        await util.sendFailedEventNotification(context, { payload: body, msg: 'Encountered error in book appointment API' }, error);
        response.TransactionStatusCode = util.TRANSACTION_STATUS_CODE.ERROR;
        response.message = error.message ?? 'Technical fault has occurred. please contact Niagara Integration team.';
        response.ErrorDescription = 'Technical fault has occurred. please contact Niagara Integration team.';
        return await coreUtil.generateErrorResponse(context, error, null, response);
    } finally {
        if (util.connection) {
            await util.connection?.close();
        }
    }
}

module.exports = {
    getShipmentsOTMCloud,
    bookAppointment
};
