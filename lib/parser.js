var _ = require('lodash');

var VALID_QUERY_MODIFIERS = [
    '<', 'lessThan',
    '<=', 'lessThanOrEqual',
    '>', 'greaterThan',
    '>=', 'greaterThanOrEqual',
    'contains',
    'startsWith'
];

var Parser = module.exports = function Parser(collection) {
    this.collection = collection;
    this.query = null;
};

/**
 * Parse criteria to a vogels query
 * @param criteria
 * @param conditions
 * @returns {*}
 */
Parser.prototype.parse = function parse(criteria, conditions) {
    var self = this;
    if (conditions.or) {
        self._scanOr(criteria);
    } else {
        var hashKey = self.collection.schema.hashKey;
        var rangeKey = self.collection.schema.rangeKey;
        var indexes = self.collection.schema.indexes;

        var queryHashKey = null;
        var queryRangeKey = null;
        var indexName = null;

        // get hash key and range key
        if (criteria.hasOwnProperty(hashKey)) {
            // without index
            queryHashKey = hashKey;
            if (criteria.hasOwnProperty(rangeKey)) {
                queryRangeKey = rangeKey;
            }
        } else {
            // with index
            for (var i = 0; i < indexes.length; i++) {
                var index = indexes[i];
                if (criteria.hasOwnProperty(index.hashKey)) {
                    queryHashKey = index.hashKey;
                    indexName = index.name;
                    if (index.rangeKey && criteria.hasOwnProperty(index.rangeKey)) {
                        queryRangeKey = index.rangeKey;
                    }
                    break;
                }
            }
        }

        // do a scan or do a query
        if (self._needQuery(queryHashKey, queryRangeKey, indexName, criteria)) {
            self._query(queryHashKey, queryRangeKey, indexName, criteria);
        } else {
            self._scan(criteria);
        }

    }

    if (conditions.limit) {
        self.query = self.query.limit(conditions.limit);
    }
    if (conditions.sortName && conditions.sortName === queryRangeKey) {
        if (conditions.sortDesc) {
            self.query = self.query.descending();
        } else {
            self.query = self.query.ascending();
        }
    }
    if (conditions.startKey) {
        self.query = self.query.startKey(conditions.startKey);
    }
    if (!_.isEmpty(conditions.select)) {
        if(_.isString(conditions.select)) {
            self.query = self.query.attributes([conditions.select]);
        } else {
            self.query = self.query.attributes(conditions.select);
        }
    }
    return self.query;
};

/**
 * Do a query or scan?
 * @param hashKey
 * @param rangeKey
 * @param indexName
 * @param criteria
 * @returns {boolean}
 * @private
 */
Parser.prototype._needQuery = function _needQuery(hashKey, rangeKey, indexName, criteria) {
    if (!hashKey) {
        return false;
    }
    // hash condition should be a simple string, number or date
    if (!_.isString(criteria[hashKey])
        && !_.isNumber(criteria[hashKey])
        && !_.isDate(criteria[hashKey])) {
        return false;
    }
    // simple hash query
    if (!rangeKey) {

        return true;
    }
    // "in","!/not" operation not supported in range query
    var condition = criteria[rangeKey];
    if (_.isArray(condition)) {

        return false;
    }
    if (_.isObject(condition) && VALID_QUERY_MODIFIERS.indexOf(_.keys(condition)[0]) === -1) {
        return false;
    }
    return true;
};

/**
 * Do a scan with filter expression which condition operator is 'OR'
 * @param criteria
 * @private
 */
Parser.prototype._scanOr = function _scanOr(criteria) {
    var filterExpression = '';
    var expressionAttributeValues = {};
    var expressionAttributeNames = {};
    var self = this;
    self.query = self.collection.model.scan();
    for (var column in criteria) {
        if (criteria.hasOwnProperty(column)) {
            var condition = criteria[column];
            var params = self._parseConditionOr(column, condition);
            filterExpression = _.isEmpty(filterExpression) ?
                params.expression : filterExpression + ' OR ' + params.expression;
            expressionAttributeValues = _.defaults(expressionAttributeValues, params.values);
            expressionAttributeNames = _.defaults(expressionAttributeNames, params.attrs);
        }
    }
    // build query
    self.query = self.query
        .filterExpression(filterExpression)
        .expressionAttributeNames(expressionAttributeNames)
        .expressionAttributeValues(expressionAttributeValues);
};

/**
 * Do a scan
 * @param criteria
 * @private
 */
Parser.prototype._scan = function _scan(criteria) {
    var self = this;
    self.query = self.collection.model.scan();
    for (var column in criteria) {
        if (criteria.hasOwnProperty(column)) {
            self.query = self.query.where(column);
            var condition = criteria[column];
            self._parseCondition(condition);
        }
    }
};

/**
 * Do a query
 * @param hashKey
 * @param rangeKey
 * @param indexName
 * @param criteria
 * @private
 */
Parser.prototype._query = function _query(hashKey, rangeKey, indexName, criteria) {
    var self = this;
    self.query = self.collection.model.query(criteria[hashKey]);
    delete criteria[hashKey];

    if (indexName) {
        self.query = self.query.usingIndex(indexName);
    }

    if (rangeKey) {
        self.query = self.query.where(rangeKey);
        self._parseCondition(criteria[rangeKey]);
        delete criteria[rangeKey];
    }

    // rest of criteria should be filter
    for (var column in criteria) {
        if (criteria.hasOwnProperty(column)) {
            var condition = criteria[column];
            self.query = self.query.filter(column);
            self._parseCondition(condition);
        }
    }

};

/**
 * Parse condition
 * @param condition
 * @private
 */
Parser.prototype._parseCondition = function _parseCondition(condition) {
    var self = this;
    if (_.isString(condition) || _.isNumber(condition) || _.isDate(condition)) {
        self.query = self.query.equals(condition);
    } else if (_.isArray(condition)) {
        self.query = self.query.in(condition);
    } else if (_.isObject(condition)) {
        self._parseModifier(condition);
    }
};

Parser.prototype._parseConditionOr = function _parseConditionOr(key, condition) {
    var self = this;
    var params = {
        expression: '',
        attrs: {},
        values: {}
    };
    if (_.isString(condition) || _.isNumber(condition) || _.isDate(condition)) {
        params.expression = '#' + key + ' =:' + key;
        params.attrs['#' + key] = key;
        params.values[':' + key] = condition;
    } else if (_.isArray(condition)) {
        var placeholders = [];
        for (var i = 0; i < condition.length; i++) {
            placeholders[i] = key + i;
            params[':' + key + i] = condition[i];
        }
        params.expression = '#' + key + ' in (:' + placeholders.join(':') + ')';
        params.attrs['#' + key] = key;
    } else if (_.isObject(condition)) {
        params.expression = self._parseModifierOr(key, condition);
        params.attrs['#' + key] = key;
        params.values[':' + key] = condition[_.keys(condition)[0]];
    }
    return params;
};


Parser.prototype._parseModifierOr = function _parseModifierOr(key, condition) {

    var modifier = _.keys(condition)[0];
    var expression = '';
    switch (modifier) {
        case '<' :
        case 'lessThan':
            expression = '#' + key + ' <:' + key;
            break;
        case '<=' :
        case 'lessThanOrEqual':
            expression = '#' + key + ' <=:' + key;
            break;
        case '>' :
        case 'greaterThan':
            expression = '#' + key + ' >:' + key;
            break;
        case '>=' :
        case 'greaterThanOrEqual':
            expression = '#' + key + ' >:' + key;
            break;
        case 'contains':
            expression = 'contains(#' + key + ',:' + key + ')';
            break;
        case 'startsWith':
            expression = 'begins_with(#' + key + ',:' + key + ')';
            break;
        case '!':
        case 'not':
            expression = '#' + key + ' <>:' + key;
            break;
        default:
            break;
    }
    return expression;
};

/**
 * Parse modifier
 * Not support modifiers:'like', 'endWith'
 * @param condition
 * @private
 */
Parser.prototype._parseModifier = function _parseModifier(condition) {
    var self = this;
    var modifier = _.keys(condition)[0];
    var value = condition[modifier];
    switch (modifier) {
        case '<' :
        case 'lessThan':
            self.query = self.query.lt(value);
            break;
        case '<=' :
        case 'lessThanOrEqual':
            self.query = self.query.lte(value);
            break;
        case '>' :
        case 'greaterThan':
            self.query = self.query.gt(value);
            break;
        case '>=' :
        case 'greaterThanOrEqual':
            self.query = self.query.gte(value);
            break;
        case 'contains':
            self.query = self.query.contains(value);
            break;
        case 'startsWith':
            self.query = self.query.beginsWith(value);
            break;
        case '!':
        case 'not':
            if (_.isString(value)) {
                self.query = self.query.ne(value);
            }
            break;
        default:
            break;
    }
};
