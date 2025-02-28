module.exports.genRefnumUpdatePayload = () => {
    return `<otm:Transmission xmlns:otm="http://xmlns.oracle.com/apps/otm/transmission/v6.4">
            <otm:TransmissionHeader>
            </otm:TransmissionHeader>
                <otm:TransmissionBody>
                    {{#each this}}
                    <otm:GLogXMLElement>
                        <otm:GenericStatusUpdate>
                            <otm:GenericStatusObjectType>ORDER_RELEASE</otm:GenericStatusObjectType>
                            <otm:Gid>
                                <otm:DomainName>NBL</otm:DomainName>
                                <otm:Xid>{{this.deliveryId}}</otm:Xid>
                            </otm:Gid>
                            <otm:TransactionCode>{{this.transactionCode}}</otm:TransactionCode>
                            {{#each this.params}}
                            <otm:Refnum>
                                    <otm:RefnumQualifierGid>
                                    <otm:Gid>
                                        <otm:DomainName>NBL</otm:DomainName>
                                        <otm:Xid>{{this.refnumQualifier}}</otm:Xid>
                                    </otm:Gid>
                                </otm:RefnumQualifierGid>
                                <otm:RefnumValue>{{this.refnumValue}}</otm:RefnumValue>
                            </otm:Refnum>
                            {{/each}}
                        </otm:GenericStatusUpdate>
                    </otm:GLogXMLElement>
                    {{/each}}
                </otm:TransmissionBody>
            </otm:Transmission>`;
};

module.exports.dbXMLShell = (query) => {
    return `<?xml version="1.0" encoding="UTF-8"?>
            <sqlQuery>
                <Query>
                    <RootName>DMITRI</RootName>
                    <Statement>
                        ${query}
                    </Statement>
                    <FootPrint>N</FootPrint>
                    <UseLOBElement>N</UseLOBElement>
                </Query>
            </sqlQuery>`;
};