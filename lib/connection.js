/**
 * Module dependencies
 */
var Vogels = require('vogels');
var async = require('async');
var Promise = require('bluebird');
var AWS = Vogels.AWS;

var Connection = module.exports = function Connection(config, cb) {

    var self = this;

    // Hold the config object
    this.config = config || {};

    this._buildConnection(function (err, db) {
        if (err) {
            cb(err);
        } else {
            self.db = db;
            cb(null, self);
        }

    });
};

/**
 * Create AWS Table
 * @param collectionName
 * @param collection
 * @param cb
 */
Connection.prototype.createCollection = function createCollection(collection, cb) {
    var self = this;
    collection.model.createTable(
        {readCapacity: self.config.readCapacity, writeCapacity:self.config.writeCapacity},
        function (err) {
        if (err) {
            cb();
        } else {
            self._waitTillActive(collection.model, cb);
        }
    });
};

/**
 * Delete AWS Table
 * @param collection
 * @param cb
 */
Connection.prototype.dropCollection = function dropCollection(collection, cb) {
    collection.model.deleteTable(function (err) {
        if (err) {
            cb(err);
        } else {
            cb(null);
        }
    });
};

Connection.prototype._buildConnection = function _buildConnection(cb) {
    var connectionOptions = {};

    connectionOptions.db = {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        region: this.config.region,
        endpoint: this.config.endpoint
    };


    AWS.config.update(connectionOptions.db);

    var db = Promise.promisifyAll(new AWS.DynamoDB());

    // try to list one table to judge whether AWS credential is right
    db.listTablesAsync({Limit: 1})
        .then(function () {
            cb(null, db);
        })
        .catch(function (err) {
            cb(err);
        });
};

Connection.prototype._waitTillActive = function _waitTillActive(model, callback) {
    var status = 'PENDING';

    async.doWhilst(
        function (callback) {
            model.describeTable(function (err, data) {
                if(err) {
                    return callback(err);
                }

                status = data.Table.TableStatus;

                setTimeout(callback, 1000);
            });
        },
        function () { return status !== 'ACTIVE'; },
        function (err) {
            return callback(err);
        });
};