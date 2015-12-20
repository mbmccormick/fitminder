var documentDbUtils = require('./documentDbUtils');

var moment = require('moment-timezone');

function Profile(documentDbClient, databaseId, collectionId) {
  this.client = documentDbClient;
  this.databaseId = databaseId;
  this.collectionId = collectionId;

  this.database = null;
  this.collection = null;
}

Profile.prototype = {

    initialize: function(callback) {
        var self = this;

        documentDbUtils.getOrCreateDatabase(self.client, self.databaseId, function(err, database) {
            if (err) {
                callback(err);
            } else {
                self.database = database;

                documentDbUtils.getOrCreateCollection(self.client, self.database._self, self.collectionId, function(err, collection) {
                    if (err) {
                        callback(err);
                    } else {
                        self.collection = collection;
                    }
                });
            }
        });
    },

    find: function(querySpec, callback) {
        var self = this;
        
        if (self.database == null ||
            self.collection == null) {
            self.initialize();
        }

        self.client.queryDocuments(self.collection._self, querySpec).toArray(function(err, results) {
            if (err) {
                callback(err);
            } else {
                callback(null, results);
            }
        });
    },

    findById: function(id, callback) {
        var self = this;
        
        if (self.database == null ||
            self.collection == null) {
            self.initialize();
        }

        var querySpec = {
            query: 'SELECT * FROM root r WHERE r.id=@id',
            parameters: [{
                name: '@id',
                value: id
            }]
        };

        self.client.queryDocuments(self.collection._self, querySpec).toArray(function(err, results) {
            if (err) {
                callback(err);
            } else {
                callback(null, results[0]);
            }
        });
    },

    findOne: function(querySpec, callback) {
        var self = this;
        
        if (self.database == null ||
            self.collection == null) {
            self.initialize();
        }

        self.client.queryDocuments(self.collection._self, querySpec).toArray(function(err, results) {
            if (err) {
                callback(err);
            } else {
                callback(null, results[0]);
            }
        });
    },

    findOrCreate: function(id, callback) {
        var self = this;

        self.findById(id, function(err, result) {
            if (err) {
                callback(err);
            } else {
                if (result != null) {
                    callback(null, result, false);
                } else {
                    var item = {
                        id: id,
                        createdDate: moment.utc()
                    };

                    self.create(item, function(err, result) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, result, true);
                        }
                    });
                }
            }
        });
    },

    create: function(item, callback) {
        var self = this;
        
        if (self.database == null ||
            self.collection == null) {
            self.initialize();
        }

        self.client.createDocument(self.collection._self, item, function(err, document) {
            if (err) {
                callback(err);
            } else {
                callback(null, document);
            }
        });
    },

    update: function(item, callback) {
        var self = this;

        self.client.replaceDocument(item._self, item, function(err, replaced) {
            if (err) {
                callback(err);
            }
        });
    },

    delete: function(item, callback) {
        var self = this;

        self.client.deleteDocument(item._self, function(err) {
            if (err) {
                callback(err);
            }
        });
    }

};

module.exports = Profile;
