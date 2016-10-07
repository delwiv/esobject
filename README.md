# ESObject

Bring your Elasticsearch documents to life!

ESObject is an Object Document Mapper (ODM) library to interface your Elasticsearch documents with the real world. Tranformation, validation, protection and many more features made possible through highly customizable strategies.

![Pangolin](http://www.pangolinphoto.com/wp-content/uploads/2012/05/pangolin.jpg)

----

## Installation

You can install this package with NPM :
```bash
npm install --save esobject
```

## Documentation conventions

Most of the ESObject methods (or generated methods) return a thenable promise. Throughout this documentation we may act as if it is a common and well-known fact.

Naming convention :

- Methods on the ESObject global object will be referenced as `esobject#method`
- Methods on the model (result of `esobject#create`) will be referenced as `Model#method`
- Methods on a particular instance (representing an elasticsearch document) will be referenced as `instance.method`

## Very basic usage

(Let's say we are working with a zoo full of cute little animals.)
```javascript
var elasticsearch = require('elasticsearch');
var esobject = require('esobject');

// --- Create your model
var Animal = esobject.create({
  name: 'Animal', // lowercase name is used on elasticsearch
});

// --- Create an index
var index = new esobject.Index(new elasticsearch.Client(), 'app-index');
index.add(Animal);

// --- Get an existing instance
index.get(Animal, 'id')
  .then(function(animal) {
    // --- (and do something with it)
  })
;

// --- Create a new instance
var myAnimal = new Animal(index, {
  myAnimal.species: 'Rockhopper Penguin',
  myAnimal.name: 'Etienne',
});

// --- and save it
myAnimal.save()
  .then(function() {
    console.log('This animal has been saved into Elasticsearch');
  })
;
// or
index.save(myAnimal)
  .then(function() {
    console.log('This animal has been saved into Elasticsearch');
  })
;
```

----

## Topics

**!!!! Out of date TOC !!!!**

- 1 [Creating a model](#markdown-header-1-creating-a-model)
    - 1.1 [Creating a model - Elasticsearch connection](#markdown-header-11-creating-a-model-elasticsearch-connection)
    - 1.2 [Creating a model - Mapping](#markdown-header-12-creating-a-model-mapping)
    - 1.3 [Creating a model - Queries](#markdown-header-13-creating-a-model-queries)
    - 1.4 [Creating a model - Import and Export Strategies](#markdown-header-14-creating-a-model-import-and-export-strategies)
        - 1.4.1 [Strategy behaviour - as a value](#markdown-header-141-strategy-behaviour-as-a-value)
        - 1.4.2 [Strategy behaviour - as a function](#markdown-header-142-strategy-behaviour-as-a-function)
        - 1.4.3 [Strategy behaviour - as a lodash template](#markdown-header-143-strategy-behaviour-as-a-lodash-template)
        - 1.4.4 [Strategy behaviour - sub-strategy](#markdown-header-144-strategy-behaviour-sub-strategy)
        - 1.4.5 [Strategy behaviour - helper objects](#markdown-header-145-strategy-behaviour-helper-objects)
        - 1.4.6 [Strategy - $check function](#markdown-header-146-strategy-check-function)
    - 1.5 [Creating a model - Named Strategies](#markdown-header-15-creating-a-model-named-strategies)

- 2 [Model methods](#markdown-header-2-model-methods)
    - 2.1 [Model methods - search](#markdown-header-21-model-methods-search)
    - 2.2 [Model methods - get](#markdown-header-22-model-methods-get)
    - 2.3 [Model methods - createOrUpdateMapping](#markdown-header-23-model-methods-createorupdatemapping)

- 3 [Instances](#markdown-header-3-instances)
    - 3.1 [Creating an instance](#markdown-header-31-creating-an-instance)
    - 3.2 [Instance fields](#markdown-header-32-instance-fields)
    - 3.3 [Instance methods - save](#markdown-header-33-instance-methods-save)
    - 3.4 [Instance methods - delete](#markdown-header-34-instance-methods-delete)

----

## 1 Creating a model

Creating a model is done through the `esobject#create(options)` method. Possible options are described below. Keep reading!

----

#### 1.1 Creating a model - Mapping

When creating a new model you may define its Elasticsearch `mapping` (more information about Elasticsearch mapping [here](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html)). This mapping can then be applied with the `Index#createOrUpdate` method.

Mapping can be defined as :

- a javascript object
- a javascript or YAML file (js-yaml package will need to be installed separately)

```javascript
/*  ---- Mapping example - as an object ---- */
var elasticsearch = require('elasticsearch');
var esobject = require('esobject');

var Animal = esobject.create({
  name: 'Animal',

  strategies: {
    dynamic: 'strict',
    properties: {
      species: 'string',
      name: 'string',
      surname: { type: 'string', index: 'not_analyzed' },
      created: { type: 'date', format: 'date_time' },
    },
  },
});

var index = new esobject.Index(new elasticsearch.Client, 'app-index');
index.add(Animal),

// --- Synchronize mapping with Elasticsearch
index.createOrUpdate({/* index settings */})
  .then(function() {
    console.log('Index has been created/updated');
  })
;
```

As you can see, the mapping resides in the `strategies` property. This convention is on purpose so you know the format is not exactly the one elasticseach accepts.

It is extended in a lot of ways that are going to be explained further on but, as of now, you can notice that you don't have to pass a `{type: 'typename'}` object for each property if the type is the only thing you want to specify (`'typename'` is enough).

```javascript
/*  ---- Mapping example - as a YAML file ---- */
var Animal = esobject.create({
  name: 'Animal',
  strategies: __dirname + '/animal_mapping.yaml',
});
```

Here is an example for `animal_mapping.yaml`:

```yaml
dynamic: strict
properties:
  species: string
  name: string
  surname:
    type: string
    index: not_analyzed
  created:
    type: date
    format: date_time
```

You can require a sub file from your YAML whenever you want using the `!require` tag:

```yaml
dynamic: strict
properties:
  species: string
  name: string
  surname:
    type: string
    index: not_analyzed
  created:
    type: date
    format: date_time
  # this will set the root of location.yaml in the location property
  location: !require
    file: location.yaml # path is relative to this file (eg ./ is implicit)
  # this will set the city.name property of address.yaml in the city property
  city: !require
    file: address.yaml
    prop: city.name
  # you can also load JS files using !require
  location: !require
    file: super.js
    # you can also use prop here
```

----


#### 1.2 Creating a model - Queries

Named `queries` can be defined on your model. They can be used at the model level (`statics`), or on a particular instance (`methods`).

Queries can be defined as:
- a function
- < other formats pending >

On a `method` query, you can access the current instance through `this` (see the examples below).

- **statics** queries can be called with `Model#nameOfYourQuery(options)`
- **methods** queries can be called with `instance.nameOfYourQuery(options)`

The query methods can be injected with a number of parameters (the name of the argument will be used to inject its value like angular does):

- **index**: the index on which the operations are performed (either `options.index` if provided or the internal object of your instance if it exists (only on `methods`))
- **AnyType**: if an index is present, any type in it can be injected
- **options**: the options object you provided to the query

```javascript
/*  ---- Queries examples ---- */
var esobject = require('esobject');

var Animal = esobject.create({
  // --- Static queries, available on the model
  statics: {
    searchByName: function(index, Animal, options) {
      return index.search(Animal, {query: {term: {name: options.name}}});
    },
  },
  // --- Method queries, available on an instance
  methods: {
    // -- the current instance is available in this
    searchHomonyms: function(index, Animal) {
      return index.search(Animal, {
        query: {term: {name: this.name}},
        filter: {not: {term: {_id: this._id}}},
      });
    },
  },
});

Animal.searchByName({name: 'Etienne', index: someIndex})
  .then(console.log.bind(console.log))
;

// -- If you have an Animal instance (thisAnimal)
thisAnimal.searchHomonyms({index: someIndex})
  .then(function(result) {
    console.log('There are ' + result.total + ' animals named like this one.');
  })
;
```

----


#### 1.3 Creating a model - Import and Export

When creating a new model, you can define `import` and `export` strategies to interface your documents.

The `import` strategy is used to define how data from the real world will be imported into your documents; the default strategy can be applied with `instance.import(rawData)` or with `instance.importDefault(rawData)`.

The `export` strategy let you decide how data from your documents will be exposed in your instance; the default strategy can be applied with `instance.export()` or with `instance.exportDefault()`.

Both import and export methods will return a promise. `import` will resolve on the modified instance while `export` will resolve on a raw javascript object.

Strategies are objects that will link fields of the document to different behaviours described using functions.

For all behaviours, this function will allow you to inject multiple things :

- The index if present, looked for in `options` and then in the model instance if possible (`index`)
- The options if provided (`options`)
- All arguments provided to the `import` / `export` function, except the raw data for `import` (`args`)

For each of those, you can inject only sub properties by using `$` to denote the path to your property (eg `options$sub$property` will inject `options.res.property` in this variable).

If a function returns a promise, the resolved value will be used for the operation. If the (resolved) value is `undefined` then the property will be deleted from the resulting object.

----

##### 1.3.1 Import behaviours

For `import` behaviours, you will also be able to inject :

- The value already present before the strategy is applied (`old`)
- The value of the equivalent field in the raw data being imported (`raw`)
- The value in the instance being transformed (`res`) / you should use this with extreme care

For `old`, `raw` and `res`, since you may be on a sub property of the root object, you can also reference the parent property using `$parent` (and its parent using `$parent$parent` and so on) and the root object using `$root` like in : `raw$parent$name` that will inject in this variable the `name` property that is a sibling to the current one in the imported raw object.

By default, import behaviours import nothing. In other words, you have to explicitely state every property you want to import and how it should be imported.

```javascript
/* Strategy - import as a function - example */
var esobject = require('esobject');

var Animal = esobject.create({
  name: 'Animal',
  strategies: {
    properties: {
      name: {
        type: 'string',

        $import: {
          // -- In this example, a new value will be imported in name only if it starts with the same character as the value already present before the import
          default: (old, raw) => raw && old[0] === raw[0] ? raw : old,
        }
      },
    },
  },
});

myAnimal = new Animal({name: 'Mike'});

myAnimal.import({name: 'André', species: 'Chameleon'})
  .then(function(myAnimal) {
    // --- At this point :
    // --- myAnimal.name == 'Mike';
  })
;

myAnimal.import({name: 'Madonna', species: 'Chameleon'})
  .then(function(myAnimal) {
    // --- At this point :
    // --- myAnimal.name == 'Madonna';
  })
;

```

----

##### 1.3.2 Export behaviours

For an `export` behaviour, the function will allow you to inject:

- The value in the instance before export (`obj`)
- The value in the resulting object during export (`res`) / you should use this with extreme care

Like for `import`, `obj` & `res` support the `$parent` & `$root` notations.

By default, export behaviours exports everything. In other words, you have to explicitely prevent private fields from being exported (by putting there a function returning undefined).

```javascript
/* Strategy - export as a function - example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  name: 'Animal',
  strategies: {
    properties: {
      timid: 'boolean',
      name: {
        type: 'string',

        $export: {
          // -- In this example, we will expose the name only if the animal is not a timid one
          default: (obj, obj$root$timid) => !obj$root$timid ? obj : undefined,
        },
      },
    },
  },
});

thisAnimal = new Animal({
  name: 'Roger',
  timid: true,
});

myAnimal.export()
  .then(function(exportedAnimal) {
    // --- At this point :
    // --- 'name' in exportedAnimal == false;

    myAnimal.timid = false;
    return myAnimal.export();
  })
  .then(function(exportedAnimal) {
    // --- At this point :
    // --- exportedAnimal.name == 'Roger';
  })
;

```

----

##### 1.3.3 Additional arguments

For both `import` and `export` behaviours, you can easily manipulate additional arguments:

```javascript
/* Strategy - export as a function, additional parameters - example */
var esobject = require('esobject');

var Animal = ESObject.create({
  name: 'Animal',
  strategies: {
    properties: {
      name: {
        $export: {
          default: args => args[0] == 'the first argument of export',
        },
        $import: {
          default: args => args[0] == 'the second argument on import',
        },
      },
    },
  },
});

var myAnimal = new Animal();

myAnimal.import(rawData, param1)
  .then(function(myAnimal) {
    // -- Do something clever
  })
;

myAnimal.export(param1, param2)
  .then(function(myAnimal) {
    // -- Do something clever
  })
;
```

----

#### 1.3.4 Named import & export behaviours

You can also define named behaviors alongside the `default` import and export behaviours. They will be accessible using the `importName()` and `exportName()` methods on your model instances:

```js
var Animal = ESObject.create({
  name: 'Animal',
  strategies: {
    properties: {
      name: {
        $import: {
          name: raw => raw || '<no name>',
        },
      },
    },
  },
});

var myAnimal = new Animal();

myAnimal.importName({})
  .then(function(myAnimal) {
    // --- At this point :
    // --- myAnimal.name == '<no name>';
  })
;
```

----

#### 1.3.5 Import & export strategies helpers

ESObject exports a `strategies` object containing two properties `import` and `export`. Each contains tools to help you creating common basic strategies.

- `esobject.strategies.import.id([keepOld])`: copy over the value of `raw` in the resulting object, if `keepOld` is `true` (defaults to `false`), if `raw` is undefined, it tries to keep `old`
- `esobject.strategies.import.default([strategy, ] defaultValue)`: applies the provided strategy first (it can be another helper) and if it resolves to `undefined`
- `esobject.strategies.import.copy(path [, root])`: copy the imported property (in `res`) using the value provided as path in `raw`. By default, `path` starts from the parent object of the current property. If `root` is given `true`, path starts from the `root` object.
- `esobject.strategies.export.copy(path [, root])`: create the exported property by copying over the value provided as path. By default, `path` starts from the parent object of the current property. If `root` is given `true`, path starts from the `root` object.
- `esobject.strategies.export.drop()`: create a strategy that drops the provided field from the export (basically a function that returns `undefined`)
- < more to come… >

See the examples below :

```javascript
/* Strategy - helper object - import example */
var esobject = require('esobject');

var strategies = esobject.strategies;

var Animal = esobject.create({
  name: 'Animal',
  strategies: {
    properties: {
      species: {
        type: 'string',
        $import: {
          default: strategies.import.id(),
        },
      },
      subspecies: {
        type: 'string',
        $import: {
          default: strategies.import.id(),
        },
      },
      name: {
        type: 'string',
        $import: {
          default: strategies.import.id(true),
        },
      },
      surname: {
        type: 'string',
        $import: {
          default: stategies.import.default(strategies.import.id(true), 'Kiki'),
        },
      },
      age: {
        type: 'integer',
        $import: {
          default: stategies.import.copy('informations.age'),
        },
      },
    },
  },
});

var myAnimal = new Animal({
  species: 'Turtle',
  subspecies: 'Sea Turtle',
  name: 'Felipe',
  surname: 'Fefe',
});

myAnimal.import({species: 'Lizard', informations: {age: 154}})
  .then(function(myAnimal) {
    // --- At this point :
    // --- myAnimal.species == 'Lizard';
    // --- 'subspecies' in myAnimal == false;
    // --- myAnimal.name == 'Felipe';
    // --- myAnimal.surname == 'Kiki';
    // --- myAnimal.age = 154;
  })
;

```

```javascript
/* Strategy - helper object - export example */
var esobject = require('esobject');

var Animal = esobject.create({
  name: 'Animal',
  strategies: {
    properties: {
      age: {
        type: 'string',
        $export: {
          default: strategies.export.copy('informations.age'),
        },
      },
      informations: {
        type: 'object',
        $export: {
          default: strategies.export.drop(),
        },
      },
    },
  },
});

var myAnimal = newAnimal({
  species: 'Spider',
  informations: { age: 32, size: 12 },
});

myAnimal.export()
  .then(function(myAnimal) {
    // --- At this point :
    // --- myAnimal.species = 'Spider'
    // --- myAnimal.age == 32;
    // --- 'informations' in myAnimal == false
  })
;
```

----

##### 1.3.6 Array support

Elasticsearch supports array of values in any property given that the values respect the type of the base property. `esobject` is aware of such a fact and applies `import` and `export` behaviours on all elements of the array if there is one.

To achieve this, `esobject` autodetects the presence of an array in the raw data during import or in the exported object during export. You can force `esobject` to expect an `array` or a plain value and to fail if the correct one is not there by specifying `$array: [true/false]` in your property description.

```javascript
/* Strategy - helper object - $all example */
var esobject = require('esobject');

var strategies = esobject.strategies;

function createNephews($array) {
  var nephews = {
    type: 'object',

    properties: {
      name: {
        type: 'string',
        import: {
          default: strategies.import.id(),
        },
      },
      age: {
        type: 'integer',
        import: {
          default: strategies.import.id(),
        },
      },
    },
  };

  if ($array === false || $array === true)
    nephews.$array = $array;

  return nephews;
}

var Animal = esobject.create({
  name: 'Animal',
  properties: {
    nephews: createNephews(),
    nephewsArray: createNephews(true),
    nephew: createNephews(false),
  },
});

var myAnimal = new Animal();

myAnimal.import({
  nephews: [
    {name: 'Louie', age: 14},
    {name: 'Huey', age: 14},
    {name: 'Dewey'},
  ],
})
  .then(function(myAnimal) {
    // --- At this point :
    // --- myAnimal.nephews == [{name: 'Louie', age: 14}, {name: 'Huey', age: 14}, {name: 'Dewey'}]
  })
;

myAnimal.import({
  nephews: {name: 'Louie', age: 14},
})
  .then(function(myAnimal) {
    // --- At this point :
    // --- myAnimal.nephews == {name: 'Louie', age: 14}
  })
;

// this will return a failed promise since a plain object is provided
myAnimal.import({nephewsArray: {name: 'Louie', age: 14}});

// this will return a failed promise since an array is provided
myAnimal.import({nephew: [{name: 'Louie', age: 14}]});
```

----

#### 1.3.7 `$check` function during import

All `object` properties, including the root object, can contain a `$check` property. It can contain a function or an object mapping names to functions. If it contains a function, it will behave as if you wrote `$check: {default: theFunction}`.

After all the behaviours of the current object have been applied, the `$check` function corresponding to your current `import` (if existant) will be called. This allows you to easily perform security checks on the changes that just happened.

`$check` functions can be injected in the same way than `import` functions.

```javascript
/* Strategies - $check example */
var esobject = require('esobject');

var Animal = esobject.create({
  name: 'Animal',

  strategies: {
    $check: {
      // since we apply this check on default import, we could have
      // added this function on $check directly
      default: function(old, res, options) {
        if (res.name === undefined)
          throw new Error('This animal has no name !!!');

        if (old.species !== res.species && !options.admin)
          throw new Error('Only admins can change the species property');
      },
    },

    properties: {
      name: /* some behaviour */,
      surname: /* some behaviour */,
      species: /* some behaviour */,
    },
  },
});

var index = // get an index

index.get(Animal, 'some_animal')
  .then(myAnimal => myAnimal.import({/* some data */}, {admin: false}))
  .then(function(myAnimal) { /* Do something clever */ })
  .catch(function(err) { /* Do something clever */ })
;
```

----

## 2 Index

### 2.1 Creating an index

An index is created using the `new` operator on the `esobject.Index(client, indexName[, Types...]` contructor.

It takes first the elasticsearch client that the index should use to perform its operations and secondly the name of the index to use on the elasticseach cluster.

You can then pass any number of arguments. They will all be forwarded to the `index.add()` method.

### 2.2 Index methods - add

An index is composed of one or more types that it will manipulate. `add()` allows you to add types in an index. You can pass any number of them to the `add` method.

```javascript
index.add(Type1);
index.add(Type2, Type3);
```

### 2.3 Index methods - remove

An index is composed of one or more types that it will manipulate. `remove()` allows you to remove types in an index. You can pass any number of them to the `remove` method.

```javascript
index.remove(Type1);
index.remove(Type2, Type3);
```

### 2.2 Index methods - search

Search queries can be executed with `index.search(Types..., query[, params])`. Query definition and returned values are the same as named queries. See the [Creating a model - Queries](#markdown-header-13-creating-a-model-queries) section for more information.

You can optionnally add an object containing any parameters accepted by the elsaticsearch.js `client#search` method. (See [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-search) for more information about those).

```javascript
/*  ---- Search query example ---- */
var esobject = require('esobject');

var Animal = esobject.create({name: 'Animal'});

var index = new esobject.Index(esClient, 'app-index');

// Single type search
index.search(Animal, {query: {term: {name: 'Etienne' }}}, {analyzer: 'french'})
  .then(function(results) {
    console.log(results); // array of results
  })
;

// Search for multiple types in the same index in a single query
index.search(Animal, Owner, Country, query);
```

Search returns an `Array` of results. It is extended with the following properties:

- `results.total`: number of matches in the cluster
- `results.aggregations`: aggregations returned by your query
- `results.export[Name]()`: functions to export every item in the results
- `results.import[Name]()`: functions to import raw data in every item in the results

----

### 2.3 Index methods - get

Given its elasticsearch id, you can retrieve an instance with `index.get(Type, id[, params])`.

You can optionnally add an object containing any parameters accepted by the elsaticsearch.js `client#get` method. (See [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-get) for more information about those).

```javascript
/*  ---- Model#get example ---- */
var esobject = require('esobject');

var Animal = esobject.create({name: 'Animal'});

var index = // create an index

index.get(Animal, 'id')
  .then(function(myAnimal) {
    // -- Do something with it
  })
;

// -- With elsaticsearch.js client#get options
Animal.get(Animal, 'id', {parent: 'parent_id'})
  .then(function(myAnimal) {
    // -- Do something with it
  })
;
```

----

### 2.4 Index methods - save

As implied, this method saves a model instance into elasticsearch. It looks like `index.save(modelInstance[, params])`.

It is safe by default, meaning it will use the `_create` endpoint if the object does not contain a `version` and otherwise send over the `version`.

You can optionnally add an object containing any parameters accepted by the elsaticsearch.js `client#create` or `client#index` methods. (See [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-create) and [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-index) for more information about those).

It also accepts a special `params.force` parameter that, if set to `true`, will disable the safe mode (it will never use the `_create` endpoint and not pass the version over to elasticseach).

```javascript
/*  ---- index.save example ---- */
var esobject = require('esobject');

var Animal = esobject.create({name: 'Animal'});

var index = // create an index

var myAnimal = new Animal({name: 'Zoe'});

index.save(myAnimal)
  .then(function(myAnimal) {
    // -- At this point, those are now available:
    // myAnimal._id
    // myAnimal._version (== 1)
  })
;

// later on…

// -- With elsaticsearch.js client#[create/index] options
myAnimal = new Animal({
  _id: 'big_zoe',
  name: 'Big Zoe',
});
index.save(myAnimal, {routing: 'some_id'})
  .then(function(myAnimal) {
    // -- At this point:
    // myAnimal._id == 'big_zoe'
    // myAnimal._version == 1

    return index.save(myAnimal, {routing: 'some_id'});
  })
  .then(function(myAnimal) {
    // -- At this point:
    // myAnimal._version == 2
  })
;

// later on…

// --- Force overwrite
myAnimal = new Animal({
  _id: 'big_zoe',
  name: 'Big Zoe _The Ultimate_',
});
index.save(myAnimal, {routing: 'some_id', force: true})
  .then(function(myAnimal) {
    // -- At this point:
    // myAnimal._id == 'big_zoe'
    // myAnimal._version == 3
  })
;
```

**Note**: esobject is aware of your instance's parent (that is accessible through `instance._parent`) except if you prevented it from retrieving the parent through some parameters (or other means). `save()` will automatically forward the parent in the request so you should probably never set this parameter. Prefer the `routing` parameter for most use cases.

----

### 2.5 Index methods - delete

Delete an instance of a model from the index. Its signature is: `index.delete(modelInstance[, params])`.

It is safe by default, meaning it will send the `version` over to elasticseach for checking.

You can optionnally add an object containing any parameters accepted by the elsaticsearch.js `client#delete` method. (See [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-create) and [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-delete) for more information about those).

It also accepts a special `params.force` parameter that, if set to `true`, will disable the safe mode (it will never use the `_create` endpoint and not pass the version over to elasticseach).

```javascript
/*  ---- index.save example ---- */
var esobject = require('esobject');

var Animal = esobject.create({name: 'Animal'});

var index = // create an index

var myAnimal = new Animal({_id: 'zoe', _version: 2, name: 'Zoe'});

index.delete(myAnimal)
  .then(function(myAnimal) {
    // -- At this point, those are now available:
    // myAnimal._id
    // myAnimal._version (== 3)
  })
;
```

**Note**: esobject is aware of your instance's parent (that is accessible through `instance._parent`) except if you prevented it from retrieving the parent through some parameters per example. `delete()` will automatically forward the parent in the request so you should probably never set this parameter. Prefer the `routing` parameter for most use cases.

----

### 2.6 Index methods - createOrUpdate

Try to create or update the index and its type mappings. `index.createOrUpdate(settings)`.

It computes the mapping for every type and try to create the index with the provided `settings`. If the index already exists, it will try to update its `settings` and the mapping of each type.

We recommend that you call this method before starting your app to ensure your mapping is compliant with the index you want to work with.

```javascript
/*  ---- index.createOrUpdate example ---- */
var esobject = require('esobject');

var Models = // [lots of esobject models]

var index = new esobject.Index(esClient, 'app-index');
index.add.apply(index, Models); // add all types in the index

index.createOrUpdate()
  .then(function() {
    // if you are there, it means it worked

    // do something clever like starting your server
  })
;
```

----

## 3 Instances

### 3.1 Creating an instance

You can create an instance by using the `new` operator on an existing model. It accepts either raw answers from the elasticseach client or a data object that may or may not contain `_id`, `_version` & `_parent` properties.

It also accepts the index linked to the instance as an optional first argument.

```javascript
/*  ---- Creating an instance - example ---- */
var esobject = require('esobject');

var Animal = esobject.create({name: 'Animal'});
var index = new esobject.Index(/* args */);

// -- Creating a new Animal with no data
var myAnimal = new Animal();
var myAnimal2 = new Animal(index);

// -- Creating a new Animal with id = 1 and version = 0
var thisAnimal = new Animal({_id: '1', _version: 0});
var thisAnimal2 = new Animal(index, {_id: '1', _version: 0});
```

----

### 3.2 Instance fields

On a given instance the following fields are available (they are not enumerable and will not be exported by default) :

- `_index`: index the document has been loaded from
- `_type`: type the document has been loaded from
- `_parent`: parent document of this one (if it exists)
- `_id`: id of the document this instance is referring to
- `_version`: version of the document
- `_fields`: object containing the named fields returned by your ES request

----

### 3.3 Instance methods - save

`instance.save([params])` is an alias to `index.save(instance[, params])`. It will throw if the instance has no internal index.

----

### 3.4 Instance methods - delete

`instance.delete([params])` is an alias to `index.delete(instance[, params])`. It will throw if the instance has no internal index.
