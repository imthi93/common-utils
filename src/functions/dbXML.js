module.exports.dbXMLQuery1 = (transactionNumber) => {
    return `select distinct  xmlelement("transaction_type",xmlagg(xmlforest(shipment_gid, order_release_gid))).getClobVal() as transaction_type
            from (SELECT DISTINCT shipment_gid,order_release_gid FROM (SELECT DISTINCT  shipment_gid,  ( SELECT  order_release_gid FROM  order_release WHERE  order_release_xid = '${transactionNumber}'  ) order_release_gid FROM shipment WHERE  shipment_xid = '${transactionNumber}' AND attribute1 NOT LIKE '%DTS%')   
            UNION SELECT DISTINCT  shp.shipment_gid,  ssul.order_release_gid  order_release_gid FROM  shipment shp, shipment_s_equipment_join  ssej,  s_equipment_s_ship_unit_join sessuj,  s_ship_unit_line ssul WHERE  shp.shipment_gid = ssej.shipment_gid  AND ssej.s_equipment_gid = sessuj.s_equipment_gid  AND sessuj.s_ship_unit_gid = ssul.s_ship_unit_gid  AND shp.shipment_gid IS NOT NULL  AND ssul.order_release_gid IN ( SELECT  order_release_gid FROM  order_release WHERE  order_release_xid = '${transactionNumber}'  ) 
            UNION SELECT DISTINCT  ''  shipment_gid,  order_release_gid FROM  order_release WHERE  order_release_xid = '${transactionNumber}'  AND NOT EXISTS ( SELECT  'X' FROM  shipment shp,  shipment_s_equipment_join  ssej,  s_equipment_s_ship_unit_join sessuj,  s_ship_unit_line ssul WHERE  shp.shipment_gid = ssej.shipment_gid  AND ssej.s_equipment_gid = sessuj.s_equipment_gid  AND sessuj.s_ship_unit_gid = ssul.s_ship_unit_gid  AND ssul.order_release_gid IN (SELECT order_release_gid FROM order_release WHERE order_release_xid = '${transactionNumber}')  ) 
            UNION SELECT DISTINCT  shref.shipment_gid,  (SELECT DISTINCT  ssul.order_release_gid FROM  shipment shp,  shipment_s_equipment_join  ssej,  s_equipment_s_ship_unit_join sessuj,  s_ship_unit_line ssul  WHERE shp.shipment_gid = ssej.shipment_gid  AND ssej.s_equipment_gid = sessuj.s_equipment_gid  AND sessuj.s_ship_unit_gid = ssul.s_ship_unit_gid  AND shp.shipment_gid = sh.shipment_gid  ) order_release_gid FROM  shipment sh,  shipment_refnum shref WHERE  shref.shipment_gid = sh.shipment_gid  AND shref.shipment_refnum_value = '${transactionNumber}'  AND shref.shipment_refnum_qual_gid = 'CUST_PO'  AND nvl( sh.user_defined1_icon_gid, 'XYZ'  ) &lt;&gt; 'NBL.SHIP_CONFIRMED' 
            UNION SELECT DISTINCT  shp.shipment_gid,  ssul.order_release_gid order_release_gid FROM  shipment shp,  shipment_s_equipment_join  ssej,  s_equipment_s_ship_unit_join sessuj,  s_ship_unit_line ssul WHERE  shp.shipment_gid = ssej.shipment_gid  AND ssej.s_equipment_gid = sessuj.s_equipment_gid  AND sessuj.s_ship_unit_gid = ssul.s_ship_unit_gid  AND shp.shipment_gid IS NOT NULL  AND ssul.order_release_gid IN ( SELECT  odref.order_release_gid FROM  order_release  od, order_release_refnum odref WHERE  odref.order_release_gid = od.order_release_gid  AND odref.order_release_refnum_value = '${transactionNumber}'  AND odref.order_release_refnum_qual_gid = 'CUST_PO'  AND nvl( od.user_defined1_icon_gid, 'XYZ'  ) &lt;&gt; 'NBL.SHIP_CONFIRMED'  
            UNION SELECT  odref.order_release_gid FROM  order_release od, order_release_refnum odref WHERE  odref.order_release_gid = od.order_release_gid  AND odref.order_release_refnum_value = '${transactionNumber}'  AND odref.order_release_refnum_qual_gid = 'CUST_PO'  AND nvl(od.user_defined2_icon_gid, 'XYZ') &lt;&gt; 'NBL.SHIP_CONFIRMED'  ) 
            UNION SELECT DISTINCT  shipment_gid,  order_release_gid FROM  ( SELECT DISTINCT  ''  shipment_gid,  odref.order_release_gid order_release_gid FROM  order_release od,  order_release_refnum odref WHERE  odref.order_release_gid = od.order_release_gid  AND odref.order_release_refnum_value = '${transactionNumber}'  AND odref.order_release_refnum_qual_gid = 'CUST_PO'  AND nvl( od.user_defined1_icon_gid, 'XYZ'  ) &lt;&gt; 'NBL.SHIP_CONFIRMED'  AND NOT EXISTS (SELECT  'X' FROM  shipment shp,  shipment_s_equipment_join  ssej,  s_equipment_s_ship_unit_join sessuj,  s_ship_unit_line ssul WHERE  shp.shipment_gid = ssej.shipment_gid  AND ssej.s_equipment_gid = sessuj.s_equipment_gid  AND sessuj.s_ship_unit_gid = ssul.s_ship_unit_gid  AND ssul.order_release_gid = od.order_release_gid  )  
            UNION SELECT DISTINCT  '' shipment_gid,  odref.order_release_gid FROM  order_release od,  order_release_refnum odref WHERE  odref.order_release_gid = od.order_release_gid  AND odref.order_release_refnum_value = '${transactionNumber}'  AND odref.order_release_refnum_qual_gid = 'CUST_PO'  AND nvl( od.user_defined2_icon_gid, 'XYZ'  ) &lt;&gt; 'NBL.SHIP_CONFIRMED'  AND NOT EXISTS ( SELECT  'X' FROM  shipment shp,  shipment_s_equipment_join  ssej,  s_equipment_s_ship_unit_join sessuj,  s_ship_unit_line ssul WHERE  shp.shipment_gid = ssej.shipment_gid  AND ssej.s_equipment_gid = sessuj.s_equipment_gid  AND sessuj.s_ship_unit_gid = ssul.s_ship_unit_gid  AND ssul.order_release_gid = od.order_release_gid  )  ) 
            UNION SELECT DISTINCT  shp.shipment_gid,  ssul.order_release_gid FROM  shipment shp,  shipment_s_equipment_join  ssej,  s_equipment_s_ship_unit_join sessuj,  s_ship_unit_line ssul WHERE  shp.shipment_gid = ssej.shipment_gid  AND ssej.s_equipment_gid = sessuj.s_equipment_gid  AND sessuj.s_ship_unit_gid = ssul.s_ship_unit_gid  AND attribute1 LIKE '%DTS%'  AND shp.shipment_xid = '${transactionNumber}' 
            UNION SELECT  ''  shipment_gid, odref.order_release_gid FROM  order_release_refnum odref WHERE  odref.order_release_refnum_value = '${transactionNumber}'  AND odref.order_release_refnum_qual_gid = 'NBL.REF_VALUE'  )`;
};

module.exports.dbXMLQuery2 = (shipmentGids, plantCode, appointmentType) => {
    appointmentType = appointmentType ? `'${appointmentType}'` : appointmentType;

    return `select distinct
            xmlelement("SHIPMENT_DETAILS",
                xmlagg(
                xmlelement("SHIPMENT_DETAIL",
                xmlforest(shp.shipment_gid,
                            nvl(shp.user_defined1_icon_gid,'NULL') as shipment_status, 
                            shp.payment_method_code_gid as  payment_method, 
                            decode( shp.payment_method_code_gid,'NBL.PICKUP', 'CPU','NBL.COLLECT','CPU','VDE' ) as load_type,
                            (SELECT status_value_gid FROM shipment_status WHERE shipment_gid = shp.shipment_gid AND status_type_gid IN ( 'NBL.WMS_STATUS', 'NBL/MX.WMS_STATUS' )) as WMS_STATUS,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'TRIP_ID'),'NULL') as trip_id,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'NBL.IS_PRELOAD'),'NULL') as IS_PRELOAD,
                            nvl((SELECT to_char(utc.get_local_date(appointment_start_time,ss1.location_gid),'mm/dd/yyyy hh:mi AM') FROM appointment a   WHERE object_gid = shp.shipment_gid),'NULL') as appt_start_time,
                            nvl((SELECT to_char(utc.get_local_date(appointment_end_time,ss1.location_gid),'mm/dd/yyyy hh:mi AM') FROM appointment a   WHERE object_gid = shp.shipment_gid),'NULL') as appt_end_time,
                            nvl((SELECT location_resource_gid FROM appointment a   WHERE object_gid = shp.shipment_gid),'NULL') as location_resource_gid,
                            nvl((SELECT to_char(utc.get_local_date(appointment_pickup,ss1.location_gid),'mm/dd/yyyy hh:mi AM')  FROM shipment_stop WHERE shipment_gid = shp.shipment_gid AND stop_num = 1),'NULL') as appointment_date,
                            nvl(to_char((SELECT MAX(utc.get_local_date(appointment_delivery,location_gid)) FROM shipment_stop WHERE shipment_gid = shp.shipment_gid AND stop_num &lt;&gt; 1),'mm/dd/yyyy hh:mi AM') ,'NULL') as delivery_appointment,
                            (select location_gid from shipment_stop where stop_num = 1 and shipment_Gid = shp.shipment_gid) as stop_location,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'SO_NUM'),'NULL') as SALES_ORDER_NUM,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'CUST_PO'),'NULL') as CUSTOMER_PO,
                            shp.dest_location_gid,
                            shp.rate_geo_gid,
                            shp.source_location_gid, 
                            nvl(dloc.location_name,'NULL') as customer_name,
                            nvl((select location_Refnum_value from location_refnum lref where lref.location_gid = sloc.location_gid and location_Refnum_qual_gid = 'ORGID'),sloc.location_name) as source_name,
                            shp.indicator as shpment_indicator, 
                            shp.loaded_distance, 
                            nvl((SELECT 'Yes' FROM shipment WHERE shipment_gid = shp.shipment_gid AND SOURCE_LOCATION_GID LIKE '%ORG%' AND DEST_LOCATION_GID LIKE '%ORG%'),'No') as transfer_flag,
                            sloc.time_zone_gid as plant_time_zone, 
                            nvl(shp.attribute2,'NULL') as dts_location_type, 
                            shp.transport_mode_gid as transport_mode,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'NBL.ORIGINAL_REQUEST_DATE'),'NULL') as ORIGINAL_REQUEST_DATE,
                            nvl((SELECT source_org_id FROM ( SELECT '3PL' source_org_id FROM location_refnum WHERE location_refnum_qual_gid = 'ORGID' AND domain_name IN ( 'NBL', 'NBL/MX' ) 
                            AND location_refnum_value LIKE '3%' 
                            AND location_gid IN ( SELECT location_gid FROM shipment_stop WHERE stop_num = 1 AND location_gid = ss1.location_gid ) 
                            UNION SELECT '1PL' source_org_id FROM location_refnum WHERE location_refnum_qual_gid = 'ORGID' AND domain_name IN ( 'NBL', 'NBL/MX' ) 
                            AND location_refnum_value NOT LIKE '3%' AND location_gid IN ( SELECT location_gid FROM shipment_stop WHERE stop_num = 1 
                            AND location_gid = ss1.location_gid ))),'NULL') as source_org_type,
                            NVL((SELECT location_xid  FROM location
                            WHERE location_gid IN (SELECT location_gid FROM shipment_stop WHERE shipment_gid = shp.shipment_gid
                                                    AND stop_num IN (SELECT MAX(stop_num)
                                                    FROM shipment_stop
                                                    WHERE shipment_gid = shp.shipment_gid))),'NULL') destination_org_id,
                            nvl((SELECT dloc.location_name|| ', '|| laddr.address_line|| ', '|| dloc.city|| ', '|| dloc.province_code|| ', '|| dloc.postal_code
                            FROM location_address laddr WHERE laddr.location_gid = dloc.location_gid AND laddr.line_sequence = 1),'NULL') as DESTINATION_ADDRESS,
                            nvl((SELECT sloc.location_name|| ', '|| laddr.address_line|| ', '|| sloc.city|| ', '|| sloc.province_code|| ', '|| sloc.postal_code
                            FROM location_address laddr WHERE laddr.location_gid = sloc.location_gid AND laddr.line_sequence = 1),'NULL') as PICKUP_ADDRESS,
                            nvl((SELECT decode(to_char(COUNT(rd.region_gid)),'0','No','Yes') FROM region_detail rd, location_refnum lr 
                            WHERE shp.source_location_gid = lr.location_gid AND lr.location_refnum_qual_gid = 'NBL.OPTIMAL_ORG' AND rd.region_gid = lr.location_refnum_value
                            AND rd.location_gid = '${plantCode}'),'No') as OPTIMAL_COUNT,
                            nvl((SELECT '3PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value LIKE '3%' AND location_gid = shp.dest_location_gid
                                UNION  SELECT '1PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value NOT LIKE '3%'  AND location_gid = shp.dest_location_gid),'NULL') as destination_org_type,
                            nvl((SELECT l.location_name FROM location l WHERE l.location_gid = shp.servprov_gid),'NULL') as service_provider_name,
                            nvl(${appointmentType},'NULL') P_APPOINTMENT_TYPE,
                            nvl(shp.rate_offering_gid,'NULL') as rate_offering_gid,
                            (select xmlagg(
                                        xmlelement("ORDER_RELEASE_DETAIL",
                                        xmlforest(ore.order_Release_xid delivery,
                                        ore.order_release_gid,
                                        ore.source_location_gid as order_source_location_gid,
                                        ore.dest_location_gid as order_dest_location_gid,
                                        nvl(dloc1.location_name,'NULL') as order_customer_name,
                                        ore.total_weight as ORDER_TOTAL_WEIGHT,
                                        ore.indicator as INDICATOR,
                                        nvl(ore.user_defined1_icon_gid,'NULL') as SCHEDULE_INDICATOR,
                                        nvl(ore.PAYMENT_METHOD_CODE_GID,'NULL') as ORDER_PAYMENT_METHOD_CODE,
                                        nvl(ore.rate_offering_gid,'NULL') as ORDER_RATE_OFFERING,
                                        nvl(to_char(utc.get_local_date(ore.late_pickup_date, ore.source_location_gid),'mm/dd/yyyy hh:mi AM'),'NULL') ORDER_LATE_PICKUP_DATE,
                                        nvl(decode( ore.payment_method_code_gid,'NBL.PICKUP', 'CPU','NBL.COLLECT','CPU','VDE' ),'NULL') as ORDER_LOAD_TYPE,
                                        nvl((SELECT order_release_refnum_value  
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'CUST_PO'),'NULL') as ORDER_CUSTOMER_PO,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'SO_NUM'),'NULL') as ORDER_SALES_ORDER_NO,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.CPU_CONTACT'),'NULL') as ORDER_EMAIL,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.REF_VALUE'),'NULL') as ORDER_REF_VALUE,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.TOTAL_PALLET'),'NULL') as ORDER_TOT_PALLET,	
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.ACCEPT_LATE_DELIVERY'),'NULL') as LATE_DELIVERY_FLAG,
                                        nvl((SELECT dloc1.location_name|| ', '|| laddr.address_line|| ', '|| dloc1.city|| ', '|| dloc1.province_code|| ', '|| dloc1.postal_code
                                        FROM location_address laddr
                                        WHERE laddr.location_gid = dloc1.location_gid
                                        AND laddr.line_sequence = 1),'NULL') as ORDER_DESTINATION_ADDRESS,
                                        nvl((SELECT sloc1.location_name|| ', '|| laddr.address_line|| ', '|| sloc1.city|| ', '|| sloc1.province_code|| ', '|| sloc1.postal_code
                                        FROM location_address laddr
                                        WHERE laddr.location_gid = sloc1.location_gid
                                        AND laddr.line_sequence = 1),'NULL') as ORDER_PICKUP_ADDRESS,
                                        nvl(decode(ore.indicator,'Y',
                                            (
                                                SELECT DISTINCT ore.attribute2
                                                FROM order_release_remark orr
                                                WHERE orr.order_release_gid = ore.order_release_gid
                                                AND orr.remark_qual_gid LIKE '%WITHDRAW%'
                                            )
                                        ),'NULL') as ORDER_REASON_CODE,
                                        nvl((select remark_text from order_release_remark orr
                                        where orr.order_release_gid = ore.order_release_gid and orr.remark_qual_gid = 'ROUTING_INSTR'),'NULL') as ORDER_CUSTOMER_REMARK,
                                        nvl((select remark_text from order_release_remark orr
                                        where orr.order_release_gid = ore.order_release_gid and orr.remark_qual_gid = 'NBL.ITEM_DESC_AND_COUNT1'),'NULL') as ITEM_DESC_AND_COUNT,
                                        nvl((SELECT '3PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value LIKE '3%' AND location_gid = ore.dest_location_gid
                                        UNION  SELECT '1PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value NOT LIKE '3%'  AND location_gid = ore.dest_location_gid),'NULL') as order_destination_org_type,
                                        nvl(sloc1.location_name,'NULL') as source_location_name,
                                        nvl(ore.attribute2,'NULL') as pending_reason
                                    )))
                            from order_Release ore, order_movement om,location sloc1,location dloc1
                            where ore.order_Release_gid = om.order_release_gid
                            and om.shipment_gid = shp.shipment_gid
                            and ore.source_location_gid = sloc1.location_gid
                            and ore.dest_location_gid = dloc1.location_gid
                            ) release_details
                            )
                            ))).getClobVal() as SHIPMENT_DETAILS
            from shipment shp, shipment_stop ss1,location sloc, location dloc
            where shp.shipment_gid in (${shipmentGids})
            and ss1.shipment_gid = shp.shipment_gid 
            and ss1.stop_num = 1
            and shp.source_location_gid = sloc.location_gid
            and shp.dest_location_gid = dloc.location_gid`;
};

module.exports.dbXMLQuery2_1 = (shipmentGids, orderReleaseGid, plantCode, appointmentType) => {
    appointmentType = appointmentType ? `'${appointmentType}'` : appointmentType;

    return `select distinct
            xmlelement("SHIPMENT_DETAILS",
                xmlagg(
                xmlelement("SHIPMENT_DETAIL",
                xmlforest(shp.shipment_gid,
                            nvl(shp.user_defined1_icon_gid,'NULL') as shipment_status, 
                            shp.payment_method_code_gid as  payment_method, 
                            decode( shp.payment_method_code_gid,'NBL.PICKUP', 'CPU','NBL.COLLECT','CPU','VDE' ) as load_type,
                            (SELECT status_value_gid FROM shipment_status WHERE shipment_gid = shp.shipment_gid AND status_type_gid IN ( 'NBL.WMS_STATUS', 'NBL/MX.WMS_STATUS' )) as WMS_STATUS,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'TRIP_ID'),'NULL') as trip_id,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'NBL.IS_PRELOAD'),'NULL') as IS_PRELOAD,
                            nvl((SELECT to_char(utc.get_local_date(appointment_start_time,ss1.location_gid),'mm/dd/yyyy hh:mi AM') FROM appointment a   WHERE object_gid = shp.shipment_gid),'NULL') as appt_start_time,
                            nvl((SELECT to_char(utc.get_local_date(appointment_end_time,ss1.location_gid),'mm/dd/yyyy hh:mi AM') FROM appointment a   WHERE object_gid = shp.shipment_gid),'NULL') as appt_end_time,
                            nvl((SELECT location_resource_gid FROM appointment a   WHERE object_gid = shp.shipment_gid),'NULL') as location_resource_gid,
                            nvl((SELECT to_char(utc.get_local_date(appointment_pickup,ss1.location_gid),'mm/dd/yyyy hh:mi AM')  FROM shipment_stop WHERE shipment_gid = shp.shipment_gid AND stop_num = 1),'NULL') as appointment_date,
                            nvl(to_char((SELECT MAX(utc.get_local_date(appointment_delivery,location_gid)) FROM shipment_stop WHERE shipment_gid = shp.shipment_gid AND stop_num &lt;&gt; 1),'mm/dd/yyyy hh:mi AM') ,'NULL') as delivery_appointment,
                            (select location_gid from shipment_stop where stop_num = 1 and shipment_Gid = shp.shipment_gid) as stop_location,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'SO_NUM'),'NULL') as SALES_ORDER_NUM,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'CUST_PO'),'NULL') as CUSTOMER_PO,
                            shp.dest_location_gid,
                            shp.rate_geo_gid,
                            shp.source_location_gid, 
                            nvl(dloc.location_name,'NULL') as customer_name,
                            nvl((select location_Refnum_value from location_refnum lref where lref.location_gid = sloc.location_gid and location_Refnum_qual_gid = 'ORGID'),sloc.location_name) as source_name,
                            shp.indicator as shpment_indicator, 
                            shp.loaded_distance, 
                            nvl((SELECT 'Yes' FROM shipment WHERE shipment_gid = shp.shipment_gid AND SOURCE_LOCATION_GID LIKE '%ORG%' AND DEST_LOCATION_GID LIKE '%ORG%'),'No') as transfer_flag,
                            sloc.time_zone_gid as plant_time_zone, 
                            nvl(shp.attribute2,'NULL') as dts_location_type, 
                            shp.transport_mode_gid as transport_mode,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'NBL.ORIGINAL_REQUEST_DATE'),'NULL') as ORIGINAL_REQUEST_DATE,
                            nvl((SELECT source_org_id FROM ( SELECT '3PL' source_org_id FROM location_refnum WHERE location_refnum_qual_gid = 'ORGID' AND domain_name IN ( 'NBL', 'NBL/MX' ) 
                            AND location_refnum_value LIKE '3%' 
                            AND location_gid IN ( SELECT location_gid FROM shipment_stop WHERE stop_num = 1 AND location_gid = ss1.location_gid ) 
                            UNION SELECT '1PL' source_org_id FROM location_refnum WHERE location_refnum_qual_gid = 'ORGID' AND domain_name IN ( 'NBL', 'NBL/MX' ) 
                            AND location_refnum_value NOT LIKE '3%' AND location_gid IN ( SELECT location_gid FROM shipment_stop WHERE stop_num = 1 
                            AND location_gid = ss1.location_gid ))),'NULL') as source_org_type,
                            NVL((SELECT location_xid  FROM location
                            WHERE location_gid IN (SELECT location_gid FROM shipment_stop WHERE shipment_gid = shp.shipment_gid
                                                    AND stop_num IN (SELECT MAX(stop_num)
                                                    FROM shipment_stop
                                                    WHERE shipment_gid = shp.shipment_gid))),'NULL') destination_org_id,
                            nvl((SELECT dloc.location_name|| ', '|| laddr.address_line|| ', '|| dloc.city|| ', '|| dloc.province_code|| ', '|| dloc.postal_code
                            FROM location_address laddr WHERE laddr.location_gid = dloc.location_gid AND laddr.line_sequence = 1),'NULL') as DESTINATION_ADDRESS,
                            nvl((SELECT sloc.location_name|| ', '|| laddr.address_line|| ', '|| sloc.city|| ', '|| sloc.province_code|| ', '|| sloc.postal_code
                            FROM location_address laddr WHERE laddr.location_gid = sloc.location_gid AND laddr.line_sequence = 1),'NULL') as PICKUP_ADDRESS,
                            nvl((SELECT decode(to_char(COUNT(rd.region_gid)),'0','No','Yes') FROM region_detail rd, location_refnum lr 
                            WHERE shp.source_location_gid = lr.location_gid AND lr.location_refnum_qual_gid = 'NBL.OPTIMAL_ORG' AND rd.region_gid = lr.location_refnum_value
                            AND rd.location_gid = '${plantCode}'),'No') as OPTIMAL_COUNT,
                            nvl((SELECT '3PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value LIKE '3%' AND location_gid = shp.dest_location_gid
                                UNION  SELECT '1PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value NOT LIKE '3%'  AND location_gid = shp.dest_location_gid),'NULL') as destination_org_type,
                            nvl((SELECT l.location_name FROM location l WHERE l.location_gid = shp.servprov_gid),'NULL') as service_provider_name,
                            nvl(${appointmentType},'NULL') P_APPOINTMENT_TYPE,
                            nvl(shp.rate_offering_gid,'NULL') as rate_offering_gid,
                            (select xmlagg(
                                        xmlelement("ORDER_RELEASE_DETAIL",
                                        xmlforest(ore.order_Release_xid delivery,
                                        ore.order_release_gid,
                                        ore.source_location_gid as order_source_location_gid,
                                        ore.dest_location_gid as order_dest_location_gid,
                                        nvl(dloc1.location_name,'NULL') as order_customer_name,
                                        ore.total_weight as ORDER_TOTAL_WEIGHT,
                                        ore.indicator as INDICATOR,
                                        nvl(ore.user_defined1_icon_gid,'NULL') as SCHEDULE_INDICATOR,
                                        nvl(ore.PAYMENT_METHOD_CODE_GID,'NULL') as ORDER_PAYMENT_METHOD_CODE,
                                        nvl(ore.rate_offering_gid,'NULL') as ORDER_RATE_OFFERING,
                                        nvl(to_char(utc.get_local_date(ore.late_pickup_date, ore.source_location_gid),'mm/dd/yyyy hh:mi AM'),'NULL') ORDER_LATE_PICKUP_DATE,
                                        nvl(decode( ore.payment_method_code_gid,'NBL.PICKUP', 'CPU','NBL.COLLECT','CPU','VDE' ),'NULL') as ORDER_LOAD_TYPE,
                                        nvl((SELECT order_release_refnum_value  
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'CUST_PO'),'NULL') as ORDER_CUSTOMER_PO,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'SO_NUM'),'NULL') as ORDER_SALES_ORDER_NO,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.CPU_CONTACT'),'NULL') as ORDER_EMAIL,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.REF_VALUE'),'NULL') as ORDER_REF_VALUE,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.TOTAL_PALLET'),'NULL') as ORDER_TOT_PALLET,	
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.ACCEPT_LATE_DELIVERY'),'NULL') as LATE_DELIVERY_FLAG,
                                        nvl((SELECT dloc1.location_name|| ', '|| laddr.address_line|| ', '|| dloc1.city|| ', '|| dloc1.province_code|| ', '|| dloc1.postal_code
                                        FROM location_address laddr
                                        WHERE laddr.location_gid = dloc1.location_gid
                                        AND laddr.line_sequence = 1),'NULL') as ORDER_DESTINATION_ADDRESS,
                                        nvl((SELECT sloc1.location_name|| ', '|| laddr.address_line|| ', '|| sloc1.city|| ', '|| sloc1.province_code|| ', '|| sloc1.postal_code
                                        FROM location_address laddr
                                        WHERE laddr.location_gid = sloc1.location_gid
                                        AND laddr.line_sequence = 1),'NULL') as ORDER_PICKUP_ADDRESS,
                                        nvl(decode(ore.indicator,'Y',
                                            (
                                                SELECT DISTINCT ore.attribute2
                                                FROM order_release_remark orr
                                                WHERE orr.order_release_gid = ore.order_release_gid
                                                AND orr.remark_qual_gid LIKE '%WITHDRAW%'
                                            )
                                        ),'NULL') as ORDER_REASON_CODE,
                                        nvl((select remark_text from order_release_remark orr
                                        where orr.order_release_gid = ore.order_release_gid and orr.remark_qual_gid = 'ROUTING_INSTR'),'NULL') as ORDER_CUSTOMER_REMARK,
                                        nvl((select remark_text from order_release_remark orr
                                        where orr.order_release_gid = ore.order_release_gid and orr.remark_qual_gid = 'NBL.ITEM_DESC_AND_COUNT1'),'NULL') as ITEM_DESC_AND_COUNT,
                                        nvl((SELECT '3PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value LIKE '3%' AND location_gid = ore.dest_location_gid
                                        UNION  SELECT '1PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value NOT LIKE '3%'  AND location_gid = ore.dest_location_gid),'NULL') as order_destination_org_type,
                                        nvl(sloc1.location_name,'NULL') as source_location_name,
                                        nvl(ore.attribute2,'NULL') as pending_reason
                                    )))
                            from order_Release ore, order_movement om,location sloc1,location dloc1
                            where ore.order_Release_gid = omv.order_release_gid
                            and ore.order_Release_gid = om.order_release_gid
                            and om.shipment_gid = shp.shipment_gid
                            and ore.source_location_gid = sloc1.location_gid
                            and ore.dest_location_gid = dloc1.location_gid
                            ) release_details
                            )
                            ))).getClobVal() as SHIPMENT_DETAILS
            from shipment shp, shipment_stop ss1,location sloc, location dloc, order_movement omv
            where shp.shipment_gid in (${shipmentGids})
            and omv.shipment_gid=shp.shipment_gid
            and omv.order_release_gid = '${orderReleaseGid}'
            and ss1.shipment_gid = shp.shipment_gid
            and ss1.stop_num = 1
            and shp.source_location_gid = sloc.location_gid
            and shp.dest_location_gid = dloc.location_gid`;
};

module.exports.dbXMLQuery3 = (releaseGids, plantCode, appointmentType) => {
    appointmentType = appointmentType ? `'${appointmentType}'` : appointmentType;

    return `WITH VOS as (select distinct shipment_gid from order_movement where order_release_gid in (${releaseGids}))
            select distinct
            xmlelement("SHIPMENT_DETAILS",
                xmlagg(
                xmlelement("SHIPMENT_DETAIL",
                xmlforest(shp.shipment_gid,
                            nvl(shp.user_defined1_icon_gid,'NULL') as shipment_status, 
                            shp.payment_method_code_gid as  payment_method, 
                            decode( shp.payment_method_code_gid,'NBL.PICKUP', 'CPU','NBL.COLLECT','CPU','VDE' ) as load_type,
                            (SELECT status_value_gid FROM shipment_status WHERE shipment_gid = shp.shipment_gid AND status_type_gid IN ( 'NBL.WMS_STATUS', 'NBL/MX.WMS_STATUS' )) as WMS_STATUS,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'TRIP_ID'),'NULL') as trip_id,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'NBL.IS_PRELOAD'),'NULL') as IS_PRELOAD,
                            nvl((SELECT to_char(utc.get_local_date(appointment_start_time,ss1.location_gid),'mm/dd/yyyy hh:mi AM') FROM appointment a   WHERE object_gid = shp.shipment_gid),'NULL') as appt_start_time,
                            nvl((SELECT to_char(utc.get_local_date(appointment_end_time,ss1.location_gid),'mm/dd/yyyy hh:mi AM') FROM appointment a   WHERE object_gid = shp.shipment_gid),'NULL') as appt_end_time,
                            nvl((SELECT location_resource_gid FROM appointment a   WHERE object_gid = shp.shipment_gid),'NULL') as location_resource_gid,
                            nvl((SELECT to_char(utc.get_local_date(appointment_pickup,ss1.location_gid),'mm/dd/yyyy hh:mi AM')  FROM shipment_stop WHERE shipment_gid = shp.shipment_gid AND stop_num = 1),'NULL') as appointment_date,
                            nvl(to_char((SELECT MAX(utc.get_local_date(appointment_delivery,location_gid)) FROM shipment_stop WHERE shipment_gid = shp.shipment_gid AND stop_num &lt;&gt; 1),'mm/dd/yyyy hh:mi AM') ,'NULL') as delivery_appointment,
                            (select location_gid from shipment_stop where stop_num = 1 and shipment_Gid = shp.shipment_gid) as stop_location,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'SO_NUM'),'NULL') as SALES_ORDER_NUM,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'CUST_PO'),'NULL') as CUSTOMER_PO,
                            shp.dest_location_gid,
                            shp.rate_geo_gid,
                            shp.source_location_gid, 
                            nvl(dloc.location_name,'NULL') as customer_name,
                            nvl((select location_Refnum_value from location_refnum lref where lref.location_gid = sloc.location_gid and location_Refnum_qual_gid = 'ORGID'),sloc.location_name) as source_name,
                            shp.indicator as shpment_indicator, 
                            shp.loaded_distance, 
                            nvl((SELECT 'Yes' FROM shipment WHERE shipment_gid = shp.shipment_gid AND SOURCE_LOCATION_GID LIKE '%ORG%' AND DEST_LOCATION_GID LIKE '%ORG%'),'No') as transfer_flag,
                            sloc.time_zone_gid as plant_time_zone, 
                            nvl(shp.attribute2,'NULL') as dts_location_type, 
                            shp.transport_mode_gid as transport_mode,
                            nvl((SELECT listagg(shipment_Refnum_value,'|') FROM shipment_refnum WHERE shipment_gid = shp.shipment_gid AND shipment_refnum_qual_gid = 'NBL.ORIGINAL_REQUEST_DATE'),'NULL') as ORIGINAL_REQUEST_DATE,
                            nvl((SELECT source_org_id FROM ( SELECT '3PL' source_org_id FROM location_refnum WHERE location_refnum_qual_gid = 'ORGID' AND domain_name IN ( 'NBL', 'NBL/MX' ) 
                            AND location_refnum_value LIKE '3%' 
                            AND location_gid IN ( SELECT location_gid FROM shipment_stop WHERE stop_num = 1 AND location_gid = ss1.location_gid ) 
                            UNION SELECT '1PL' source_org_id FROM location_refnum WHERE location_refnum_qual_gid = 'ORGID' AND domain_name IN ( 'NBL', 'NBL/MX' ) 
                            AND location_refnum_value NOT LIKE '3%' AND location_gid IN ( SELECT location_gid FROM shipment_stop WHERE stop_num = 1 
                            AND location_gid = ss1.location_gid ))),'NULL') as source_org_type,
                            NVL((SELECT location_xid  FROM location
                            WHERE location_gid IN (SELECT location_gid FROM shipment_stop WHERE shipment_gid = shp.shipment_gid
                                                    AND stop_num IN (SELECT MAX(stop_num)
                                                    FROM shipment_stop
                                                    WHERE shipment_gid = shp.shipment_gid))),'NULL') destination_org_id,
                            nvl((SELECT dloc.location_name|| ', '|| laddr.address_line|| ', '|| dloc.city|| ', '|| dloc.province_code|| ', '|| dloc.postal_code
                            FROM location_address laddr WHERE laddr.location_gid = dloc.location_gid AND laddr.line_sequence = 1),'NULL') as DESTINATION_ADDRESS,
                            nvl((SELECT sloc.location_name|| ', '|| laddr.address_line|| ', '|| sloc.city|| ', '|| sloc.province_code|| ', '|| sloc.postal_code
                            FROM location_address laddr WHERE laddr.location_gid = sloc.location_gid AND laddr.line_sequence = 1),'NULL') as PICKUP_ADDRESS,
                            nvl((SELECT decode(to_char(COUNT(rd.region_gid)),'0','No','Yes') FROM region_detail rd, location_refnum lr 
                            WHERE shp.source_location_gid = lr.location_gid AND lr.location_refnum_qual_gid = 'NBL.OPTIMAL_ORG' AND rd.region_gid = lr.location_refnum_value
                            AND rd.location_gid = '${plantCode}'),'No') as OPTIMAL_COUNT,
                            nvl((SELECT '3PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value LIKE '3%' AND location_gid = shp.dest_location_gid
                                UNION  SELECT '1PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value NOT LIKE '3%'  AND location_gid = shp.dest_location_gid),'NULL') as destination_org_type,
                            nvl((SELECT l.location_name FROM location l WHERE l.location_gid = shp.servprov_gid),'NULL') as service_provider_name,
                            nvl(${appointmentType},'NULL') P_APPOINTMENT_TYPE,
                            nvl(shp.rate_offering_gid,'NULL') as rate_offering_gid,				
                            (select xmlagg(
                                        xmlelement("ORDER_RELEASE_DETAIL",
                                        xmlforest(ore.order_Release_xid delivery,
                                        ore.order_release_gid,
                                        ore.source_location_gid as order_source_location_gid,
                                        ore.dest_location_gid as order_dest_location_gid,
                                        nvl(dloc1.location_name,'NULL') as order_customer_name,
                                        ore.total_weight as ORDER_TOTAL_WEIGHT,
                                        ore.indicator as INDICATOR,
                                        nvl(ore.user_defined1_icon_gid,'NULL') as SCHEDULE_INDICATOR,
                                        nvl(ore.PAYMENT_METHOD_CODE_GID,'NULL') as ORDER_PAYMENT_METHOD_CODE,
                                        nvl(ore.rate_offering_gid,'NULL') as ORDER_RATE_OFFERING,
                                        nvl(to_char(utc.get_local_date(ore.late_pickup_date, ore.source_location_gid),'mm/dd/yyyy hh:mi AM'),'NULL') ORDER_LATE_PICKUP_DATE,
                                        nvl(decode( ore.payment_method_code_gid,'NBL.PICKUP', 'CPU','NBL.COLLECT','CPU','VDE' ),'NULL') as ORDER_LOAD_TYPE,
                                        nvl((SELECT order_release_refnum_value  
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'CUST_PO'),'NULL') as ORDER_CUSTOMER_PO,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'SO_NUM'),'NULL') as ORDER_SALES_ORDER_NO,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.CPU_CONTACT'),'NULL') as ORDER_EMAIL,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.REF_VALUE'),'NULL') as ORDER_REF_VALUE,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.TOTAL_PALLET'),'NULL') as ORDER_TOT_PALLET,	
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.ACCEPT_LATE_DELIVERY'),'NULL') as LATE_DELIVERY_FLAG,
                                        nvl((SELECT dloc1.location_name|| ', '|| laddr.address_line|| ', '|| dloc1.city|| ', '|| dloc1.province_code|| ', '|| dloc1.postal_code
                                        FROM location_address laddr
                                        WHERE laddr.location_gid = dloc1.location_gid
                                        AND laddr.line_sequence = 1),'NULL') as ORDER_DESTINATION_ADDRESS,
                                        nvl((SELECT sloc1.location_name|| ', '|| laddr.address_line|| ', '|| sloc1.city|| ', '|| sloc1.province_code|| ', '|| sloc1.postal_code
                                        FROM location_address laddr
                                        WHERE laddr.location_gid = sloc1.location_gid
                                        AND laddr.line_sequence = 1),'NULL') as ORDER_PICKUP_ADDRESS,
                                        nvl(decode(ore.indicator,'Y',
                                            (
                                                SELECT DISTINCT ore.attribute2
                                                FROM order_release_remark orr
                                                WHERE orr.order_release_gid = ore.order_release_gid
                                                AND orr.remark_qual_gid LIKE '%WITHDRAW%'
                                            )
                                        ),'NULL') as ORDER_REASON_CODE,
                                        nvl((select remark_text from order_release_remark orr
                                        where orr.order_release_gid = ore.order_release_gid and orr.remark_qual_gid = 'ROUTING_INSTR'),'NULL') as ORDER_CUSTOMER_REMARK,
                                        nvl((select remark_text from order_release_remark orr
                                        where orr.order_release_gid = ore.order_release_gid and orr.remark_qual_gid = 'NBL.ITEM_DESC_AND_COUNT1'),'NULL') as ITEM_DESC_AND_COUNT,
                                        nvl((SELECT '3PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value LIKE '3%' AND location_gid = ore.dest_location_gid
                                        UNION  SELECT '1PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value NOT LIKE '3%'  AND location_gid = ore.dest_location_gid),'NULL') as order_destination_org_type,
                                        nvl(sloc1.location_name,'NULL') as source_location_name,
                                        nvl(ore.attribute2,'NULL') as pending_reason
                                    )))
                            from order_Release ore, order_movement om,location sloc1,location dloc1
                            where ore.order_Release_gid = om.order_release_gid
                            and om.shipment_gid = shp.shipment_gid
                            and ore.source_location_gid = sloc1.location_gid
                            and ore.dest_location_gid = dloc1.location_gid
                            ) release_details
                            )
                            ))).getClobVal() as SHIPMENT_DETAILS
            from shipment shp, shipment_stop ss1,location sloc, location dloc, vos
            where shp.shipment_gid =  vos.shipment_gid
            and ss1.shipment_gid = shp.shipment_gid 
            and ss1.stop_num = 1
            and shp.source_location_gid = sloc.location_gid
            and shp.dest_location_gid = dloc.location_gid`;
};

module.exports.dbXMLQuery4 = (releaseGids, appointmentType) => {
    appointmentType = appointmentType ? `'${appointmentType}'` : appointmentType;

    return `select distinct
            xmlelement("SHIPMENT_DETAILS",
                xmlagg(
                xmlelement("SHIPMENT_DETAIL",
                xmlforest(  'NULL' as shipment_gid,
                            'NULL' as shipment_status, 
                            'NULL' as  payment_method, 
                            'NULL' as load_type,
                            'NULL' as WMS_STATUS,
                            'NULL' as trip_id,
                            'NULL' as IS_PRELOAD,
                            'NULL' as appt_start_time,
                            'NULL' as appt_end_time,
                            'NULL' as location_resource_gid,
                            'NULL' as appointment_date,
                            'NULL' as delivery_appointment,
                            'NULL' as stop_location,
                            'NULL' as SALES_ORDER_NUM,
                            'NULL' as CUSTOMER_PO,
                            'NULL' as dest_location_gid,
                            'NULL' as rate_geo_gid,
                            'NULL' as source_location_gid, 
                            'NULL' as customer_name,
                            'NULL' as source_name,
                            'NULL' as shpment_indicator, 
                            'NULL' as loaded_distance, 
                            'NULL' as transfer_flag,
                            'NULL' as plant_time_zone, 
                            'NULL' as dts_location_type, 
                            'NULL' as transport_mode,
                            'NULL' as ORIGINAL_REQUEST_DATE,
                            'NULL' as source_org_type,
                            'NULL' as destination_org_id,
                            'NULL' as DESTINATION_ADDRESS,
                            'NULL' as PICKUP_ADDRESS,
                            'NULL' as optimal_count,
                            'NULL' as service_provider_name,
                            nvl(${appointmentType},'NULL') P_APPOINTMENT_TYPE,
                            'NULL' as rate_offering_gid,	
                            (select xmlagg(
                                        xmlelement("ORDER_RELEASE_DETAIL",
                                        xmlforest(ore.order_Release_xid delivery,
                                        ore.order_release_gid,
                                        ore.source_location_gid as order_source_location_gid,
                                        ore.dest_location_gid as order_dest_location_gid,
                                        nvl(dloc1.location_name,'NULL') as order_customer_name,
                                        ore.total_weight as ORDER_TOTAL_WEIGHT,
                                        ore.indicator as INDICATOR,
                                        nvl(ore.user_defined1_icon_gid,'NULL') as SCHEDULE_INDICATOR,
                                        nvl(ore.PAYMENT_METHOD_CODE_GID,'NULL') as ORDER_PAYMENT_METHOD_CODE,
                                        nvl(ore.rate_offering_gid,'NULL') as ORDER_RATE_OFFERING,
                                        nvl(to_char(utc.get_local_date(ore.late_pickup_date, ore.source_location_gid),'mm/dd/yyyy hh:mi AM'),'NULL') ORDER_LATE_PICKUP_DATE,
                                        nvl(decode( ore.payment_method_code_gid,'NBL.PICKUP', 'CPU','NBL.COLLECT','CPU','VDE' ),'NULL') as ORDER_LOAD_TYPE,
                                        nvl((SELECT order_release_refnum_value  
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'CUST_PO'),'NULL') as ORDER_CUSTOMER_PO,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'SO_NUM'),'NULL') as ORDER_SALES_ORDER_NO,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.CPU_CONTACT'),'NULL') as ORDER_EMAIL,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.REF_VALUE'),'NULL') as ORDER_REF_VALUE,
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.TOTAL_PALLET'),'NULL') as ORDER_TOT_PALLET,	
                                        nvl((SELECT order_release_refnum_value 
                                            FROM order_release_refnum 
                                            WHERE order_release_gid = ore.order_release_gid
                                            AND order_release_refnum_qual_gid = 'NBL.ACCEPT_LATE_DELIVERY'),'NULL') as LATE_DELIVERY_FLAG,
                                        nvl((SELECT dloc1.location_name|| ', '|| laddr.address_line|| ', '|| dloc1.city|| ', '|| dloc1.province_code|| ', '|| dloc1.postal_code
                                        FROM location_address laddr
                                        WHERE laddr.location_gid = dloc1.location_gid
                                        AND laddr.line_sequence = 1),'NULL') as ORDER_DESTINATION_ADDRESS,
                                        nvl((SELECT sloc1.location_name|| ', '|| laddr.address_line|| ', '|| sloc1.city|| ', '|| sloc1.province_code|| ', '|| sloc1.postal_code
                                        FROM location_address laddr
                                        WHERE laddr.location_gid = sloc1.location_gid
                                        AND laddr.line_sequence = 1),'NULL') as ORDER_PICKUP_ADDRESS,
                                        nvl(decode(ore.indicator,'Y',
                                            (
                                                SELECT DISTINCT ore.attribute2
                                                FROM order_release_remark orr
                                                WHERE orr.order_release_gid = ore.order_release_gid
                                                AND orr.remark_qual_gid LIKE '%WITHDRAW%'
                                            )
                                        ),'NULL') as ORDER_REASON_CODE,
                                        nvl((select remark_text from order_release_remark orr
                                        where orr.order_release_gid = ore.order_release_gid and orr.remark_qual_gid = 'ROUTING_INSTR'),'NULL') as ORDER_CUSTOMER_REMARK,
                                        nvl((select remark_text from order_release_remark orr
                                        where orr.order_release_gid = ore.order_release_gid and orr.remark_qual_gid = 'NBL.ITEM_DESC_AND_COUNT1'),'NULL') as ITEM_DESC_AND_COUNT,
                                        nvl((SELECT '3PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value LIKE '3%' AND location_gid = ore.dest_location_gid
                                        UNION  SELECT '1PL' dest_org_type FROM location_refnum WHERE location_refnum_qual_gid='ORGID' AND location_refnum_value NOT LIKE '3%'  AND location_gid = ore.dest_location_gid),'NULL') as order_destination_org_type,
                                        nvl(sloc1.location_name,'NULL') as source_location_name,
                                        nvl(ore.attribute2,'NULL') as pending_reason
                                    )))
                            from order_Release ore, location sloc1,location dloc1
                            where ore.order_Release_gid = ore1.order_release_gid
                            and ore.source_location_gid = sloc1.location_gid
                            and ore.dest_location_gid = dloc1.location_gid
                            ) release_details
                            )
                            ))).getClobVal() as SHIPMENT_DETAILS
            from ordeR_release ore1
            where ore1.order_release_gid in (${releaseGids})`;
}
