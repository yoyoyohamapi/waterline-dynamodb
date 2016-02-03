var Promise = require('bluebird');
var Adapter = Promise.promisifyAll(require('../../lib/adapter'));
var should = require('should');
var Config = require('../support/config');

var _ = require('lodash');
var identity = 'test-find';

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

var Tigers = [
    {
        name: 'Simba',
        age: 3,
        nickname: 'Little Simba',
        extraInfo: {
            addr: '成都动物园'
        },
        birthday: new Date('1991-11-21')
    },
    {
        name: 'Simba',
        age: 20,
        nickname: 'Old Simba',
        extraInfo: {
            addr: '昆明动物园'
        },
        birthday: new Date('1973-11-21')
    },
    {
        name: 'Scar',
        age: 12,
        nickname: 'Bad Guy',
        birthday: new Date('1982-10-03')

    }
];

describe('find', function () {
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

    describe('query', function () {
        it("find tiger simba successful", function (done) {
            var criteria = {
                name: 'Simba',
                age: 3
            };
            Adapter.find(identity, 'Tiger', criteria, function (error, data) {
                data.count.should.eql(1);
                done();
            });
        });

        it("find tiger simba failed", function (done) {
            var criteria = {
                name: 'Simba',
                age: 5
            };
            Adapter.find(identity, 'Tiger', criteria, function (error, data) {
                data.count.should.eql(0);
                done();
            });
        });

        it('projection', function (done) {
            var criteria = {
                where: {
                    name: 'Simba',
                    age: 3
                },
                select: ['nickname']
            };
            Adapter.find(identity, 'Tiger', criteria, function (error, data) {
                data.count.should.eql(1);
                _.keys(data.items[0])[0].should.eql('nickname');
                done();
            });
        });

        it("between find successful", function (done) {
            var criteria = {
                name: 'Simba',
                age: {'<=': 20}
            };
            Adapter.find(identity, 'Tiger', criteria, function (error, data) {
                data.count.should.eql(2);
                done();
            });
        });

        it("limit and sort", function (done) {
            var criteria = {
                where: {
                    name: 'Simba',
                    age: {'<=': 20}

                },
                limit: 1,
                sort: "age desc"
            };
            Adapter.find(identity, 'Tiger', criteria, function (error, data) {
                var items = data.items;
                data.count.should.eql(1);
                items[0].age.should.eql(20);
                done();
            });
        });

        it("filter success", function (done) {
            var criteria = {
                name: 'Simba',
                age: {'<': 5},
                nickname: {'startsWith': 'Little'}
            };
            Adapter.find(identity, 'Tiger', criteria, function (err, data) {
                data.count.should.eql(1);
                done();
            });

        });

        it("filter failed", function (done) {
            var criteria = {
                name: 'Simba',
                age: {'<': 5},
                nickname: {'startsWith': 'litt'}
            };
            Adapter.find(identity, 'Tiger', criteria, function (err, data) {
                data.count.should.eql(0);
                done();
            });

        });

        it('query by index', function (done) {
            var criteria = {
                nickname: 'Bad Guy',
                birthday: new Date('1982-10-03')
            };
            Adapter.find(identity, 'Tiger', criteria, function (err, data) {
                data.count.should.eql(1);
                done();
            });
        });


    });


    describe("scan", function () {
        it("contains find successful", function (done) {
            var criteria = {
                nickname: {'contains': 'Simba'}
            };
            Adapter.find(identity, 'Tiger', criteria, function (error, data) {
                data.count.should.eql(2);
                done();
            });
        });

        it("or scan", function (done) {
            var criteria = {
                or: [
                    {
                        age: 12
                    },
                    {
                        nickname: {'startsWith': 'Old'}
                    }
                ]
            };
            Adapter.find(identity, 'Tiger', criteria, function (error, data) {
                data.count.should.eql(2);
                done();
            });
        });
    });

})
;