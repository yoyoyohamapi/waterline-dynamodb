/**
 * Module Dependencies
 */
var _ = require('lodash');
var AWS = require('aws-promjs');
var Connection = require('./connection');
var Collection = require('./collection');
/**
 * waterline-dynamodb
 *
 * Most of the methods below are optional.
 *
 * If you don't need / can't get to every method, just implement
 * what you have time for.  The other methods will only fail if
 * you try to call them!
 *
 * For many adapters, this file is all you need.  For very complex adapters, you may need more flexiblity.
 * In any case, it's probably a good idea to start with one file and refactor only if necessary.
 * If you do go that route, it's conventional in Node to create a `./lib` directory for your private submodules
 * and load them at the top of the file with other dependencies.  e.g. var update = `require('./lib/update')`;
 */
module.exports = (function () {


    // You'll want to maintain a reference to each connection
    // that gets registered with this adapter.
    var connections = {};


    // You may also want to store additional, private data
    // per-connection (esp. if your data store uses persistent
    // connections).
    //
    // Keep in mind that models can be configured to use different databases
    // within the same app, at the same time.
    //
    // i.e. if you're writing a MariaDB adapter, you should be aware that one
    // model might be configured as `host="localhost"` and another might be using
    // `host="foo.com"` at the same time.  Same thing goes for user, database,
    // password, or any other config.
    //
    // You don't have to support this feature right off the bat in your
    // adapter, but it ought to get done eventually.
    //

    var adapter = {

        identity: 'sails-dynamodb',

        syncable: true,


        // Default configuration for connections
        defaults: {
            accessKeyId: null,
            secretAccessKey: null,
            region: '',
            endpoint: ''
        },


        /**
         *
         * This method runs when a model is initially registered
         * at server-start-time.  This is the only required method.
         *
         * @param  {[type]}   connection [description]
         * @param  {[type]}   collections [description]
         * @param  {Function} cb         [description]
         * @return {[type]}              [description]
         */
        registerConnection: function (connection, collections, cb) {
            console.log("initialize AWS ", "...");
            if (!connection.identity) return cb(new Error('Connection is missing an identity.'));
            if (connections[connection.identity]) return cb(new Error('Connection is already registered.'));

            //Merge default options
            connection = _.defaults(connection, this.defaults);

            // Store the connection
            connections[connection.identity] = {
                config: connection,
                collections: {}
            };

            new Connection(connection, function (err, db) {
                if (err) {
                    return cb(err);
                }
                connections[connection.identity].connection = db;

                Object.keys(collections).forEach(function (key) {
                    connections[connection.identity].collections[key] = new Collection(key, collections[key], db);
                });
                cb();
            });
        },


        /**
         * Fired when a model is unregistered, typically when the server
         * is killed. Useful for tearing-down remaining open connections,
         * etc.
         *
         * @param  {Function} cb [description]
         * @return {[type]}      [description]
         */
        // Teardown a Connection
        teardown: function (conn, cb) {
            cb();
        }
        ,


        /**
         * Describe
         *
         * Return the Schema of a collection after first creating the collection
         * and indexes if they don't exist.
         *
         * @param {String} connectionName
         * @param {String} collectionName
         * @param {Function} cb
         */
        describe: function (connectionName, collectionName, cb) {
            try {
                // get connection object
                var connectionObject = connections[connectionName];
                // get collection
                var collection = connectionObject.collections[collectionName];
                // get schema
                var schema = collection.schema;
                collection.describe(function(err){
                    if(err) {
                        cb(err)
                    } else {
                        cb();
                    }
                });
            } catch(error){
                cb();
            }
        }
        ,

        /**
         * Create a Collection
         * @param connectionName
         * @param collectionName
         * @param definition
         * @param cb
         */
        define: function (connectionName, collectionName, definition, cb) {
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[collectionName];
            connectionObject.connection.createCollection(collection, cb);
        }
        ,

        /**
         * Drop A Collection
         * @param connectionName
         * @param collectionName
         * @param relations
         * @param cb
         * @returns {*}
         */
        drop: function (connectionName, collectionName, relations, cb) {
            // Add in logic here to delete a collection (e.g. DROP TABLE logic)
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[collectionName];
            connectionObject.connection.dropCollection(collection, function (err) {
                cb();
            });
        }
        ,

        /**
         *
         * REQUIRED method if users expect to call Model.find(), Model.findOne(),
         * or related.
         *
         * You should implement this method to respond with an array of instances.
         * Waterline core will take care of supporting all the other different
         * find methods/usages.
         *
         */
        find: function (connectionName, collectionName, options, cb) {
            options = options || {};
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[collectionName];

            collection.find(options, function(err, results){
                if(err) return cb(err);
                else{
                    cb(null,results);
                }
            });
        }
        ,

        /**
         * Create
         * @param connectionName
         * @param collectionName
         * @param values
         * @param cb
         */
        create: function (connectionName, collectionName, values, cb) {
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[collectionName];
            collection.create(values, function (err, coll) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, coll);
                }
            });
        }
        ,

        /**
         *
         * @param connectionName
         * @param collectionName
         * @param options
         * @param values
         * @param cb
         */
        update: function (connectionName, collectionName, options, values, cb) {
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[collectionName];
            var updateValues = _.assign(options.where, values);
            collection.update(updateValues, function (err, coll) {
                if (err) {
                    cb(err);
                } else {
                    cb(null, coll);
                }
            });
        }
        ,

        /**
         * destroy
         * @param connectionName
         * @param collectionName
         * @param options
         * @param cb
         */
        destroy: function (connectionName, collectionName, options, cb) {
            var connectionObject = connections[connectionName];
            var collection = connectionObject.collections[collectionName];
            collection.destroy(options.where, function (err) {
                cb(err);
            });
        }

    };


    // Expose adapter definition
    return adapter;

})();

