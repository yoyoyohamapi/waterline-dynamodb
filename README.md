![image_squidhome@2x.png](http://i.imgur.com/RIvu9.png)

# waterline-dynamodb

Provides easy access to `dynamodb` from Sails.js & Waterline.

This module is a Waterline/Sails adapter, an early implementation of a rapidly-developing, tool-agnostic data standard.  Its goal is to provide a set of declarative interfaces, conventions, and best-practices for integrating with all sorts of data sources.  Not just databases-- external APIs, proprietary web services, or even hardware.

Strict adherence to an adapter specification enables the (re)use of built-in generic test suites, standardized documentation, reasonable expectations around the API for your users, and overall, a more pleasant development experience for everyone.


### Installation

To install this adapter, run:

```sh
$ npm install waterline-dynamodb --save
```

### Set up

#### Connection config

```js
// config/connection.js

// ....
 dynamodb: {
    adapter: 'waterline-dynamodb',
    accessKeyId: 'yout accessKeyId',
    secretAccessKey: 'your secretAccessKey',
    region: 'your region',
    endpoint: 'your endpoint',
    readCapacity: 5,
    writeCapacity: 5
  }
// ...
```

#### Model config

Add some validation types for dynamodb:

```js
// config/models.js
// ....
types: {
        rangeKey: function () {
            return true;
        },
        hashKey: function () {
            return true;
        },
        globalIndex: function () {
            return true;
        },
        localIndex: function () {
            return true;
        },
        indexName: function () {
            return true;
        }
    }
// ...
```

### Usage
 
This adapter exposes the following methods:

###### `find()`

###### `create()`

###### `update()`

###### `destroy()`

### Example

#### Define a model

```js

//api/models/Tiger.js

module.exports = {

    attributes: {
        name: {type: 'string', unique: true, primaryKey: true},
        age: {type: 'integer', rangeKey: true, defaultsTo: 1},
        extraInfo: {type: 'json'},
        nickname: {type: 'string', globalIndex: true, indexName: 'NickBirth', hashKey: true},
        birthday: {type: 'date', globalIndex: true, indexName: 'NickBirth', rangeKey: true}
    }
};

```

#### Create/Update a model

```js
// In this example , for convenience, we try to create a tiger named Simba in sails console,
 Tiger.create({name:'Simba', nickname:'Little King', birthday:new Date('1996-02-3'), extraInfo: {hobby:'eating'}}).exec(console.log)
```


### License

**[MIT](./LICENSE)**
&copy; 2014 [balderdashy](http://github.com/balderdashy) & [contributors]
[Mike McNeil](http://michaelmcneil.com), [Balderdash](http://balderdash.co) & contributors

[Sails](http://sailsjs.org) is free and open-source under the [MIT License](http://sails.mit-license.org/).


[![githalytics.com alpha](https://cruel-carlota.pagodabox.com/8acf2fc2ca0aca8a3018e355ad776ed7 "githalytics.com")](http://githalytics.com/balderdashy/waterline-dynamodb/README.md)


