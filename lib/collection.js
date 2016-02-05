var Vogels = require('vogels');
var _ = require('lodash');
var Joi = require('joi');
var Parser = require('./parser');
/**
 * Class Collection
 * @type {module.Collection}
 */
var Collection = module.exports = function Collection(collectionName, definition, connection) {

    // Hold a reference to an active connection
    this.connection = connection;

    // Hold the definition
    this.definition = definition.definition;

    this.schema = this._parseDefinition(collectionName, definition.definition);

    // createdAt, updatedAt supported as defaults
    this.schema = _.defaults(this.schema, {
        timestamps: true
    });

    // Hold DynamoDB Entity
    this.model = Vogels.define(collectionName, this.schema);

    return this;
};

/**
 * Parse collection definition to DynamoDB's config
 * @param definition
 * @param collectionName
 * @private
 */
Collection.prototype._parseDefinition = function _parseDefinition(collectionName, definition) {

    var config = {
        hashKey: '',
        schema: {},
        tableName: collectionName,
        indexes: []
    };


    // init columns
    for (var columnName in definition) {
        var attributes = definition[columnName];
        if (typeof attributes !== "function") {
            this._setColumnType(config.schema, columnName, attributes);
        }
    }

    // init PrimaryKeys
    this._initPrimaryKey(definition, config);

    // init indexes
    this._initIndexes(definition, config.indexes);

    return _.isEmpty(config.hashKey) || _.isEmpty(config.schema) ? null : config;

};


/**
 * Set Column type
 * @param schema
 * @param columnName
 * @param attr
 * @private
 */
Collection.prototype._setColumnType = function _setColumnType(schema, columnName, attr) {
    var type = _.isString(attr) ? attr : attr.type;
    var types = Vogels.types;
    columnName = attr.columnName ? attr.columnName : columnName;
    if (columnName === 'id' && (attr.primaryKey || attr.unique )) {
        schema[columnName] = types.uuid();
        return;
    }
    switch (type) {
        case "date":
        case "time":
        case "datetime":
            schema[columnName] = Joi.date();
            break;
        case "integer":
        case "float":
            schema[columnName] = Joi.number();
            break;
        case "binary":
            schema[columnName] = Joi.binary();
            break;
        case "boolean":
            schema[columnName] = Joi.boolean();
            break;
        case "array":
            schema[columnName] = types.stringSet();
            break;
        case "email":
            schema[columnName] = Joi.string().email();
            break;
        default:
            schema[columnName] = Joi.string();
            break;
    }
    if (attr.defaultsTo) {
        schema[columnName] = schema[columnName].default(attr.defaultsTo);
    }
};

/**
 * Initialize indexes for Model
 * @param definition
 * @param indexes
 * @private
 */
Collection.prototype._initIndexes = function _initIndexes(definition, indexes) {
    //Get all index
    var indexNames = _.uniq(_.values(_.mapValues(definition, 'indexName')));

    indexNames.forEach(function (indexName) {
        var columns = _.pickBy(definition, function (attr) {
            return attr.indexName === indexName;
        });
        var index = {};

        _.keys(columns).forEach(function (key) {
            var attr = definition[key];
            if ((attr.hashKey || attr.rangeKey) &&
                ( (attr.globalIndex && !attr.localIndex) ||
                (attr.localIndex && !attr.globalIndex) )
            ) {
                if (attr.hashKey) {
                    // local index should have same hash key as the table
                    index['hashKey'] = attr.localIndex ? this.schema.hashKey : key;
                } else if (attr.rangeKey) {
                    index['rangeKey'] = key;
                }
                if (attr.globalIndex) {
                    index['type'] = 'global';
                } else {
                    index['type'] = 'local';
                }
            }
        });
        // validate
        if (index['type'] !== undefined && index['hashKey'] !== undefined &&
            index['rangeKey'] !== undefined) {
            index['name'] = indexName;
            indexes.push(index);
        }
    });

};


/**
 * Initialize primary keys for Model
 * @param definition
 * @param config
 * @private
 */
Collection.prototype._initPrimaryKey = function _initPrimaryKey(definition, config) {
    for (var columnName in definition) {
        var attr = definition[columnName];
        if ((attr.primaryKey || attr.hashKey) && _.isEmpty(attr.indexName)) {
            config.hashKey = columnName;
        }
        else if (attr.rangeKey && _.isEmpty(attr.indexName)) {
            config['rangeKey'] = columnName;
        }
    }
};

/**
 * describe a table
 * @param collectionName
 * @param cb
 */
Collection.prototype.describe = function describe(collectionName, cb) {
    this.connection.describeTable({TableName: collectionName}, cb);
};


/**
 * find
 * @param options
 * @param cb
 */
Collection.prototype.find = function find(options, cb) {
    var self = this;
    var query = this._genQuery(options);
    if (!query) {
        cb(new Error('query is invalid!'));
    } else {
        //query.exec(cb);
        query.exec(function (err, data) {
            if (err) {
                cb(err, {});
            } else {
                var items = [];
                _.forEach(_.map(data.Items, 'attrs'), function (item) {
                    items.push(self._decodeValues(item));
                });
                cb(null, {items: items, count: data.Count});
            }
        });
    }
};

Collection.prototype.create = function create(values, cb) {
    var self = this;
    this.model.create(self._encodeValues(values), function (err, data) {
        if (err) {
            if(err.code === 'ResourceNotFoundException') {
                self.connection.createCollection(self, function(err){
                    if(err) {
                        cb(err);
                    } else {
                        self.create(values,cb);
                    }
                });
            }
        } else {
            cb(err, self._decodeValues(data.attrs));
        }
    });
};

Collection.prototype.destroy = function destroy(options, cb) {
    this.model.destroy(options, function (err) {
        if (err) {
            cb(err);
        } else {
            cb(null);
        }
    });
};

Collection.prototype.update = function update(values, cb) {
    var self = this;
    this.model.update(self._encodeValues(values), function (err, data) {
        if (err) {
            cb(err, null);
        } else {
            cb(err, self._decodeValues(data.attrs));
        }
    });
};

Collection.prototype._genQuery = function _genQuery(options) {
    var parser = new Parser(this);
    var or = false;
    if (options.or) {
        or = true;
        var criteria = {};
        for (var i = 0; i < options.or.length; i++) {
            criteria = _.defaults(criteria, options.or[i]);
        }
    } else {
        var criteria = options.where && _.isObject(options.where) ?
            options.where : options;
    }

    var conditions = {
        limit: null,
        sortName: null,
        sortDesc: false,
        startKey: null,
        or: or,
        select: ''
    };


    if (_.isString(options.startKey)) {
        conditions.startKey = options.startKey;
    }
    if (_.isInteger(options.limit)) {
        conditions.limit = options.limit;
    }
    if (_.isString(options.sort)) {
        var arr = options.sort.split(' ');
        if (arr.length === 2) {
            conditions.sortName = arr[0];
            conditions.sortDesc = arr[1].toLowerCase() === 'desc';
        }
    }
    if (_.isString(options.select) || _.isArray(options.select)) {
        conditions.select = options.select;
    }

    var query = parser.parse(criteria, conditions);
    return query;
};

Collection.prototype._encodeValues = function _encodeValues(values) {
    var self = this;
    _.keys(self.definition).forEach(function (key) {
        if (values.hasOwnProperty(key)) {
            var value = values[key];
            // json should be encoded
            if (self.definition[key].type === 'json') {
                values[key] = JSON.stringify(value);
            }
        }
    });
    return values;
};

Collection.prototype._decodeValues = function _decodeValues(values) {
    var self = this;
    _.keys(self.definition).forEach(function (key) {
        if (values.hasOwnProperty(key)) {
            var value = values[key];
            if (self.definition[key].type === 'json') {
                values[key] = JSON.parse(value);
            }
        }
    });
    return values;
};
