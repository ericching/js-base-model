// Overrides the default implementation of Collection API to support base models.
if (Meteor.isServer) {
    CollectionAPI._requestListener.prototype._getRequest = function (fromPutRequest) {
        var self = this;

        self._server._fiber(function () {
            try {
                var collection_result = self._requestPath.collectionId !== undefined ? self._requestCollection.find(self._requestPath.collectionId) : self._requestCollection.find();

                var records = [];
                collection_result.forEach(function (record) {
                    records.push(record.toJSON());
                });

                if (!self._beforeHandling('GET', self._requestPath.collectionId, records)) {
                    if (fromPutRequest) {
                        return records.length ? self._noContentResponse() : self._notFoundResponse('No Record(s) Found');
                    }
                    return self._rejectedResponse("Could not get that collection/object.");
                }

                records = _.compact(records);

                if (records.length === 0) {
                    return self._notFoundResponse('No Record(s) Found');
                }

                return self._okResponse(JSON.stringify(records));

            } catch (e) {
                return self._internalServerErrorResponse(e);
            }

        }).run();
    };
}