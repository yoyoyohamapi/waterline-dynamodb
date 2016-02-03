/**
 * Test dependencies
 */
var Adapter = require('../../lib/adapter');
var should = require('should');
var Config = require('../support/config');

describe('registerConnection', function () {

    describe('fail',function(){
        it('should catch errors when credentials is wrong', function (done) {
            Adapter.registerConnection({identity: 'fail_test'},{},function (err) {
                should.exist(err);
                done();
            });
        });
    });

    describe('success', function(){
        it('should fetch all collections from AWS', function(done){
            var connection = Config;
            connection.identity = 'success_test';
            Adapter.registerConnection(connection, {}, function(err){
                should.not.exist(err);
                done();
            });
        });
    });


});