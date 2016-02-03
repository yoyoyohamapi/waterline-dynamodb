var Promise = require('bluebird');
var Adapter = Promise.promisifyAll(require('../../lib/adapter'));
var should = require('should');
var Config = require('../support/config');


var identity = 'test-update';

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

var Tigers = [
    {
        name:'Simba',
        nickname: 'Little Simba',
        extraInfo: {
            addr: '成都动物园'
        },
        birthday: new Date('1991-11-21')
    },
    {
        name:'Simba',
        age: 20,
        nickname: 'Old Simba',
        extraInfo: {
            addr: '昆明动物园'
        },
        birthday: new Date('1973-11-21')
    }

];

describe('update', function () {
    before(function (done) {
        var connection = Config;
        connection.identity = identity;
        Adapter
            .registerConnectionAsync(connection, collections)
            .then(function () {
                return Adapter.defineAsync(identity, 'Tiger', null);
            })
            .then(function () {
                var queue = [];
                Tigers.forEach(function (tiger) {
                    queue.push(Adapter.createAsync(identity, 'Tiger', tiger));

                });
                return Promise.all(queue);
            })
            .then(function (tigers) {
                tigers.forEach(function (tiger) {
                    console.log('Tiger:', tiger);
                });
                done();
            })
            .catch(function (err) {
                console.error('before error:', err);
                done();
            });
    });

    after(function (done) {
        Adapter.drop(identity, 'Tiger', null, function (err) {
            done();
        });
    });


    it('update success', function(done){
        var options = {
            where: {
                name: 'Simba'
            }
        };
        var values = {
            age: 5,
          nickname: 'Scar'
        };
        Adapter.update(identity, 'Tiger', options, values, function(err, data){
            if(err) {
                console.log('update err', err);
            } else {
                console.log('update', data);
            }
            done();
        });
    });
});