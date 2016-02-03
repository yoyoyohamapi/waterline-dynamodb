/**
 * Test dependencies
 */
var Adapter = require('../../lib/adapter');
var should = require('should');
var Config = require('../support/config');

var collections = {
    Tiger: {
        definition: {
            name: {type: 'string', unique: true, primaryKey: true},
            age: {type: 'integer', rangeKey: true, defaultsTo: 1},
            extraInfo: {type: 'json'},
            nickname: {type: 'string', globalIndex: true, indexName: 'NickBirth', hashKey: true},
            birthday: {type: 'date', globalIndex: true, indexName: 'NickBirth', rangeKey: true}
        }
    }
};

var identity = 'test-describe';

describe('describe', function () {

    before(function(done){
        var connection = Config;
        connection.identity = identity;
        Adapter.registerConnection(connection, collections, function (err) {
            Adapter.define(identity, 'Tiger', null, function (err) {
                if(err) {
                    console.error(err);
                }
                done();
            });
        });
    });

    after(function (done) {
        Adapter.drop(identity, 'Tiger', null, function (err) {
            done();
        });
    });


    it('should fetch the table successful', function (done) {
        Adapter.describe(identity,'Tiger', function (err,data) {
            should.not.exist(err);
            done();
        });
    });

});