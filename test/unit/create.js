var Adapter = require('../../lib/adapter');
var should = require('should');
var Config = require('../support/config');

var identity = 'test-create';

var collections = {
    Tiger: {
        definition: {
            name: {type: 'string', unique: true, primaryKey: true},
            age: {type: 'integer', rangeKey: true, defaultsTo: 1},
            extraInfo: {type:'json'},
            nickname: {type: 'string', globalIndex: true, indexName: 'NickBirth', hashKey: true},
            birthday: {type: 'date', globalIndex: true, indexName: 'NickBirth', rangeKey: true}
        }
    }
};

var Simba = {
    name:'Simba',
    nickname: 'Little Simba',
    extraInfo: {
        addr: '成都动物园'
    },
    birthday: new Date('1991-11-21')
};

describe('create a item of AWS', function(){
    before(function(done) {
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

    it("success", function(done){
        Adapter.create(identity, 'Tiger', Simba, function(err, tiger){
            if(err) {
                console.error('failed to create a tiger', err);
            } else {
                console.log(tiger);
            }
            should.not.exist(err);
            done();
        } );
    });

    it("failed when hash key is null", function(done){
        delete Simba.name;
        Adapter.create(identity, 'Tiger', Simba,function(err, tiger){
            if(err) {
                console.error('failed to create a tiger', err);
            } else {
                console.log(tiger);
            }
            should.exist(err);
            done();
        });
    });
});