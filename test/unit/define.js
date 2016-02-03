/**
 * Test dependencies
 */
var Adapter = require('../../lib/adapter');
var should = require('should');
var Config = require('../support/config');

var collections = {
    Tiger: {
        definition: {
            id: {type: 'string', unique: true, primaryKey: true},
            name: {type: 'integer'},
            createdAt: {type: 'datetime'},
            updatedAt: {type: 'datetime'},
        }
    },
    Hunter: {
        definition: {
            id: {type: 'string', primaryKey: true},
            name: {type: 'string'},
            sons: {type: 'array'},
            createdAt: {type: 'datetime'},
            updatedAt: {type: 'datetime'}
        }
    }
};

var identity = 'test-define';

describe('define', function () {

    before(function (done) {
        var connection = Config;
        connection.identity = identity;
        Adapter.registerConnection(connection, collections, function (err) {
            done();
        });
    });

    after(function (done) {
        Adapter.drop(identity, 'Tiger', null, function (err) {
            done();
        });
    });

    it('if table not exist, creating should be successful', function (done) {
        Adapter.define(identity, 'Tiger', null, function (err) {
            should.not.exist(err);
            done();
        });
    });

    it('if table exists, creating should be failed', function (done) {
        Adapter.define(identity, 'Tiger', null, function (err) {
            should.exist(err);
            done();
        });
    });


});