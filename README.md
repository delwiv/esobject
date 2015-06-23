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

- Methods on the ESObject global object will be referenced as `ESObject#method`
- Methods on the model (result of `ESObject#create`) will be referenced as `Model#method`
- Methods on a particular instance (representing an elasticsearch document) will be referenced as `instance.method`

## Very basic usage
(Let's say we are working with a zoo full of cute little animals.)
```javascript
var ESObject = require('esobject');

// --- Create your model
var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' } 
});

// --- Get an existing instance
Animal.get(id)
  .then(function(animal) {
    // --- (and do something with it)
  })
;

// --- Create a new instance
var myAnimal = new Animal();
myAnimal.species = 'Rockhopper Penguin';
myAnimal.name = 'Etienne';

// --- and save it
myAnimal.save()
  .then(function() {
    console.log('This animal has been saved into Elasticsearch');
  })
;
```
----
## Topics

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
Creating a model is done through the `ESObject#create(options)` method. Possible options are described below. Keep reading!

----

#### 1.1 Creating a model - Elasticsearch connection
When creating a new model you must define its connection with Elasticsearch. This is done through the `db` param of the model creation options. The `db` param is an object containing the Elasticsearch `index`, the `type` the  model is referencing and either a `host` or a full elasticsearch.js `client`.

If you create a connection using the `host` attribute, `db` can also contain any attributes used to create a full elasticsearch.js client (see [here](http://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/configuration.html) for more information)

```javascript
/*  ---- Example using host option ---- */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: {
    index: 'myZoo',
    type: 'animal',
    host: 'http://localhost:9200',
    // --- You can then add any elasticsearch.js Client options
    maxRetries: 9,
    suggestCompression: true,
  }
})
```

```javascript
/*  ---- Example using client option ---- */
var elasticsearch = require('elasticsearch');
var ESObject = require('esobject');

var esClient = new elasticsearch.Client({
    host: 'http://localhost:9200',
    maxRetries: 156,
    sniffOnStart: true,
});

var Animal = ESObject.create({
    db: {
      index: 'myZoo',
      type: 'animals',
      client: esClient,
    }
});
```

----


#### 1.2 Creating a model - Mapping
When creating a new model you may define its Elasticsearch `mapping` (more information about Elasticsearch mapping [here](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html)). This mapping can then be applied with the `Model#createOrUpdateMapping` method.

Mapping can be defined as :

- a javascript object
- a javascript, JSON, or YAML file (js-yaml package will need to be installed separately).
- a function returning the mapping

```javascript
/*  ---- Mapping example - as an object ---- */
var ESObject = require('esobject');

var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' },
    mapping: {
        dynamic: 'strict',
        properties: {
          species: { type: 'string' },
          name: { type: 'string' },
          surname: { type: 'string', index: 'not_analyzed' },
          created: { type: 'date', format: 'date_time' }
        }
    },
});

// --- Synchronize mapping with Elasticsearch
Animal.createOrUpdateMapping()
    .then(function() {
        console.log('Mapping has been created/updated');
    })
;
```
```javascript
/*  ---- Mapping example - as a function ---- */
var ESObject = require('esobject');

var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' },
    mapping: function(params) {
        return {
          dynamic: 'strict',
          ttl: {
            enabled: true,
            default: params.ttl_default
          },
          properties: {
            species: { type: 'string' },
            name: { type: 'string' },
            
        }
    },
});

// --- Synchronize mapping with Elasticsearch
Animal.createOrUpdateMapping({ttl_default: '1d'})
    .then(function() {
        console.log('Mapping has been created/updated');
    })
;
```

```javascript
/*  ---- Mapping example - as a YAML file ---- */
var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' },
    mapping: _dirname + '/animal_mapping.yaml',
});

// --- Synchronize mapping with Elasticsearch
Animal.createOrUpdateMapping()
    .then(function() {
        console.log('Mapping has been created/updated');
    })
;
```

If you use YAML or JSON files to define your mapping, those can contain lodash templates (find more information [here](https://lodash.com/docs#template)) as values. These templates will be compiled with any matching values passed to the `Model#createOrUpdateMapping`. See the example below.

```yaml
# animal_mapping.yaml
dynamic: strict
ttl:
  enabled: true
  default: <%= ttl_default %>
properties: 
  species:
    type: string
  name: 
    type: string
```
```javascript
/*  ---- Mapping example - as a YAML file with lodash templates ---- */
var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' },
    mapping: _dirname + '/animal_mapping.yaml',
});

// --- Synchronize mapping with Elasticsearch
Animal.createOrUpdateMapping({ttl_default: '1d'})
    .then(function() {
        console.log('Mapping has been created/updated');
    })
;
```

----


#### 1.3 Creating a model - Queries
Named `queries` can be defined on your model. They can be used at the model level (`static`), or on a particular `instance`.

Queries can be defined as : 

- a javascript object
- a javascript, JSON, or YAML file (js-yaml package will need to be installed separately)
- a function returning the query

Anything you define will be passed as the body parameter of the elasticsearch.js client.search method (more information [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-search)). 

On an `instance` query, you can access the current instance through the `esobj` parameter. (See the examples below).

- **static** queries can be called with **Model#nameOfYourQuery**
- **instance** queries can be called with **instance.nameOfYourQuery**. 

They will both return a promise resolving an array containing the matching documents. This array will also have 2 properties : 

- `total` : grand total of documents matching your search
- `aggregations` : if this applies

```javascript
/*  ---- Queries examples ---- */
var ESObject = require('esobject');

var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' },
    queries: {
        // --- Static queries, available on the model
        static: {
            // -- as a javascript object
            searchForEtienne: { query: { term: { name: 'Etienne' } } },
            // -- as a YAML file
            searchForQuentin: __dirname + '/search_for_quentin.yaml',
            // -- as a function
            searchByName: function(options) {
                return { query: { term: { name: options.name } } };
            },
        },
        // --- Instance queries, available on an instance
        instance: {
            // -- the current instance is available in the form of options.esobj
            searchHomonyms: function(options) {
                return {
                    query: { term:  { name: options.esobj.name },
                    filter: { not: { term: { _id: options.esobj._id } } }
                };
            },
        }
    }
});

Animal.searchForEtienne()
    .then(function(result){
        console.log(result);
    })
;

Animal.searchByName({name: 'Etienne'})
    .then(function(result){
        console.log(result);
    })
;

// -- If you have an Animal instance (thisAnimal)
thisAnimal.searchHomonyms()
    .then(function(result) {
        console.log("There are " + result.total + " animals named like this one.");
    })
;
```

As for the mapping definition, query defintions through JSON or YAML files can contain lodash templates as values. They will be compiled with any matching values passed to the `Model#nameOfYourQuery` method.

----


#### 1.4 Creating a model - Import and Export Strategies

When creating a new model, you can define `import` and `export` strategies to interface your documents.

The `import` strategy is used to define how data from the real world will be imported into your documents; this strategy can be applied with `instance.import(rawData)`

The `export` strategy let you decide how data from your documents will be exposed in your instance; this strategy can be applied with `instance.export()`.

Both import and export methods will return a promise resolving the modified instance.

Strategies are objects that will link fields of the document to different behaviours. A behaviour can be described as : 

- a value
- a function
- a lodash template
- a sub-strategy 
- helper objects with reserved parameters ($id, $default, $all, ...)

----

#### 1.4.1 Strategy behaviour - as a value

Used to fill an instance property with a direct value. If the value is *undefined*, this property will be ignored by the strategy (on import : this field will not change, on export : this field will not be exported).

```javascript
/* Strategy - as a value - example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  import: {
    // - After an import, this field will always be 'Doe'
    surname: 'Doe',
    // - After an import, this field will remain unchanged
    name: undefined,
  },
  export: {
    // - After an export, this field will always be 'Smith'
    surname: 'Smith',
    // - After an export, this field will not be present
    name: undefined,
  }
});

var myAnimal = new Animal();
myAnimal.name = 'Joseph';
myAnimal.import({ species: 'Tiger', name: 'Freddie', surname: 'Mercury' })
    .then(function(myAnimal){
        // --- At this point : 
        // --- myAnimal.name === 'Joseph'
        // --- myAnimal.surname === 'Doe'
    })
;

myAnimal.export()
    .then(function(myAnimal){
        // --- At this point : 
        // --- myAnimal.name is undefined
        // --- myAnimal.surname === 'Smith'
    })
;
```

----

#### 1.4.2 Strategy behaviour - as a function
Used to describe complex behaviour. The function should return the value for the field being described.

For an `import` behaviour, this function will expose 4 parameters : 

- The value already present before the strategy is applied (`esval`)
- The value of the equivalent field in the raw data being imported (`rawval`)
- The instance being transformed (`esobj`)
- The raw data being imported (`rawobj`)

```javascript
/* Strategy - import as a function - example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  import: {
    // -- In this example, a new value will be imported for this particular field only if it starts with the same character as the value already present
    name: function(esval, rawval, esobj, rawobj) {
      if (rawVal && (esval.charAt(0) === rawval.charAt(0)) {
        return rawval;
      } else {
        return esval;
      }
    },
  },
});

myAnimal = new Animal();
myAnimal.name = 'Mike';

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

For an `export` behaviour, the function will expose 2 parameters : 

- The value already present before the strategy is applied (val)
- The instance before export (esobj)

```javascript
/* Strategy - export as a function - example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  export: {
    // -- In this example, we will expose the name only if the animal is not a timid one
    name: function(val, esobj) {
      if (!esobj.timid) {
        return val;
      } else {
        return undefined;
      }
    },
  },
});

thisAnimal = new Animal();
thisAnimal.name = 'Roger';
thisAnimal.timid = true;

myAnimal.export()
  .then(function(myAnimal) {
    // --- At this point : 
    // --- myAnimal.name == undefined;
  })
;

```

For both `import` and `export` field behaviour functions, you can pass additional parameters. They are available after the exposed ones.

```javascript
/* Strategy - export as a function, additional parameters - example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  export: {
    name: function(val, esobj, param1, param2) { /* Do something clever */ },
  },
  import: {
    name: function(esval, rawval, esobj, rawobj, param1) { /* Do something clever */ },
  },
});

var myAnimal = new Animal();

myAnimal.import(rawData, param1)
  .then(function(myAnimal) { // -- Do something clever });

myAnimal.export(param1, param2)
  .then(function(myAnimal) { // -- Do something clever });
```

----

#### 1.4.3 Strategy behaviour - as a lodash template

You can define `import` and `export` field behaviours with lodash templates (find more information [here](https://lodash.com/docs#template)).

For `import` behaviours, `esobj` (instance before the import) and `raw` (data being passed into import) parameters are available, for `export` only `esobj` is available. See the examples below.

```javascript
/* Strategy - as lodash templates - example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  export: {
    displayName:'<%= esobj.name %> the <%= esobj.species %>',
  },
  import: {
    title: '<%= raw.species %> <%= raw.title %>',
  },
});

var myAnimal = new Animal();
myAnimal.import({name: 'Ned', title: 'King', species: 'Mouse'})
  .then(function(myAnimal) {
    // --- At this point : 
    // --- myAnimal.title == 'Mouse King';
  })
;

var thisAnimal = new Animal();
thisAnimal.name = 'Paul';
thisAnimal.species = 'Seagull';

thisAnimal.export()
  .then(function(thisAnimal) {
    // --- At this point : 
    // --- myAnimal.displayName == 'Paul the Seagull';
  })
;

```

----

#### 1.4.4 Strategy behaviour - sub-strategy

If your document field is a complex one, the associated behaviour can be a full strategy.

```javascript 
/* Strategy - sub-strategy - example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  import: {
    name : function(esval, rawval, esobj, rawobj) { return newVal || oldVal; },
    displayName: '<%= raw.name %> (<%= raw.surname %>)',
    // -- the behaviour for this field will be a full strategy
    informations: {
      age: function(esval, rawval, esobj, rawobj) { return calculateAge(rawobj.birthdate); },
      size: function(esval, rawval, esobj, rawobj) { return rawVal.size + ' centimeters'; },
    }
  },
});

var myAnimal = new Animal();

myAnimal.import({name: 'Tokawasi', surname: 'Toto', species: 'Bull', informations: { size: '176' }, birthdate: '01/01/1995' })
  .then(function(myAnimal){
     // --- At this point : 
     // --- myAnimal.name == 'Tokawasi';
     // --- myAnimal.dislpayName == 'Tokawasi (Toto)';
     // --- myAnimal.informations == { age: 20, size: '176 centimeters' };
  })
;

```

----

#### 1.4.5 Strategy behaviour - helper objects

On an `import` field behaviour : 

- `{$id: true}` will import a new value if it is given, will set the field to undefined if not.
- `{$id: 'keepold'}` will import a new value if it is given, will keep the old value if not.
- `{$default: val}` will set a default value if the field is undefined (this can be coupled with the $id parameter, see examples below)
- `{$rawAttr: 'x.y.z'}` will associate this field with the rawData.x.y.z value. Useful when your imported data doesn't have the same structure as your target instance.
- `{$all : substrategy}` will apply the defined substrategy to all array elements or object properties contained in the field.

On an `export` field behaviour : 

- `{$id: true}` will export the field as-is
- `{$objAttr: 'x.y.z'}` will associate this field with the esobj.x.y.z value. Useful when your exported data doesn't have the same structure as your source instance.
- `{$all : substrategy}` will apply the defined substrategy to all array elements or object properties contained in the field.

See the examples below : 

```javascript 
/* Strategy - helper object - $id/$default/$rawAttr example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  import: {
    species: {$id: true},
    subspecies: {$id: true},
    name: {$id: 'keepold'},
    surname: {$id: true, $default: 'Kiki'},
    age: {$rawAttr: 'informations.age'},
  },
});

var myAnimal = new Animal();
myAnimal.species = 'Turtle';
myAnimal.subspecies = 'Sea Turtle';
myAnimal.name = 'Felipe';
myAnimal.surname = 'Fefe';

myAnimal.import({species: 'Lizard', informations: {age: 154}})
  .then(function(myAnimal) {
    // --- At this point : 
    // --- myAnimal.species == 'Lizard';
    // --- myAnimal.subspecies == undefined;
    // --- myAnimal.name == 'Felipe';
    // --- myAnimal.surname == 'Kiki';
    // --- myAnimal.age = 154;
  })
;

```

```javascript 
/* Strategy - helper object - $objAttr example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  export: {
    species: {$id: true},
    age: {$objAttr: 'informations.age'},
  },
});

var myAnimal = newAnimal();
myAnimal.name = 'Sophie';
myAnimal.species = 'Spider';
myAnimal.informations = { age: 32, size: 12 };

myAnimal.export()
  .then(function(myAnimal) {
    // --- At this point : 
    // --- myAnimal.species = 'Spider'
    // --- myAnimal.age == 32;
  })
;
```

```javascript 
/* Strategy - helper object - $all example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  import: {
    nephews: { 
      $all: { 
        name: {$id: true}, 
        age: {$id, true}
      }
    },
  },
});

var myAnimal = new Animal();

myAnimal.import({
  name: 'Donald',
  nephews: [
    {name: 'Louie', age: 14},
    {name: 'Huey', age: 14},
    {name: 'Dewey'},
  ],
}).then(function(myAnimal) {
    // --- At this point : 
    // --- myAnimal.nephews == [{name: 'Louie', age: 14}, {name: 'Huey', age: 14}, {name: 'Dewey', age: undefined}];
  })
;

```

----

#### 1.4.6 Strategy - `$check` function

A strategy can also contain a validation function called `$check`. This function gets 2 parameters : 

- the instance before the strategy is applied (`esobj`)
- the modified instance after all behaviours have been applied (`resobj`)

Through this function you can verify that the modified instance is exactly what it should be. It is called after all other strategy behaviours have been applied. If this function throws an error, the whole strategy will as well.

```javascript 
/* Strategies - $check example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  import: {
    name: /* some behaviour */,
    surname: /* some behaviour */,
    species: /* some behaviour */,
    $check: function(esobj, resobj) {
      if (resobj.name === undefined) {
        throw new Error('This animal has no name !!!');
      }
    }
  },
});

var myAnimal = new Animal();
myAnimal.import({/* some data */})
  .catch(function(err) { /* Do something clever */ })
  .then(function(myAnimal) { /* Do something clever */ })
; 

```

----

#### 1.5 Creating a model - Named Strategies

When creating a model, you're not bound to just one import and one export strategies. You can define as much strategies as you need with the `imports` and `exports` parameters. You can call them with `instance.nameOfMyStrategy()`.

```javascript 
/* Named strategies - example */
var ESObject = require('esobject');

var Animal = ESObject.create({
  db: db,
  
  // - Regular import/export
  import: {/* Define your strategy here */},
  export: {/* Define your strategy here */},
  
  // - Named strategies
  imports: {
    myImport: {/* Define your strategy here */},
    myOtherImport: {/* Define your strategy here */},
  },
  exports: {
    myExport: {/* Define your strategy here */},
    myOtherExport: {/* Define your strategy here */},
  },
});

var myAnimal = new Animal();

// - Regular import/export
myAnimal.import({/* ... */});
myAnimal.export();

// - Named strategies
myAnimal.myImport({/* ... */});
myAnimal.myOtherImport({/* ... */});
myAnimal.myExport();
myAnimal.myOtherExport();
```
---
## 2 Model methods

----

### 2.1 Model methods - search
Search queries can be executed with `Model#search(query)`. Query definition and returned values are the same as named queries. See the [Creating a model - Queries](#markdown-header-13-creating-a-model-queries) section for more information.

```javascript
/*  ---- Search query example ---- */
var ESObject = require('esobject');

var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' },
});

Animal.search({ query: { term: { name: 'Etienne' } } })
  .then(function(result) {
    console.log(result);
  })
;
 
```

----

### 2.2 Model methods - get
Given its elasticsearch id, you can retrieve an instance with `Method#get(id, [params])`. You can optionnally add an object containing any parameters accepted by the elsaticsearch.js `client#get` method. (See [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-get) for more information about those).

```javascript
/*  ---- Model#get example ---- */
var ESObject = require('esobject');

var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' },
});

Animal.get(id)
  .then(function(myAnimal) {
    // -- Do something with it
  })
;

// -- With elsaticsearch.js client#get options
Animal.get(another_id, {refresh: true, fields: ['name', 'surname']})
  .then(function(myAnimal) {
    // -- Do something with it
  })
;
 
```

### 2.3 Model methods - createOrUpdateMapping
Apply the mapping defined on the model. Any parameters given to this function will be passed to the function defining the mapping. See the [Creating a model - Mapping](#markdown-header-12-creating-a-model-mapping) section.

---
## 3 Instances

----

### 3.1 Creating an instance
You can create an instance by using the `new` operator on an existing model. Optionaly, `id` and `version` can be passed to the constructor.

```javascript
/*  ---- Creating an instance - example ---- */
var ESObject = require('esobject');

var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' },
});

// -- Creating a new Animal
var myAnimal = new Animal();

// -- Creating a new Animal with id = 1 and version = 0
var thisAnimal = new Animal(1, 0);
```

----

### 3.2 Instance fields
On a given instance the following fields are available (they are not enumerable and will not be exported by default) : 

- `_id` : id of the document this instance is referring to
- `_version` : version of the document
- `_ttl` : ttl of the document (if it exists)
- `_parent` : parent document of this one (if it exists)

----

### 3.3 Instance methods - save
Save an instance into elasticsearch. It will return a promise resolving the saved instance. You can optionnally pass an object containing any parameters accepted by the elsaticsearch.js `client#index` method. (See [here](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-index) for more information about those).

```javascript
/*  ---- Saving an instance - example ---- */
var ESObject = require('esobject');

var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' },
});

// -- Creating a new Animal
var myAnimal = new Animal();

myAnimal.import({name: 'Jean', surname: 'Coco', type: 'Rabbit'})
  .then(function(myAnimal) { 
    myAnimal.save()
      .then(function(savedAnimal) {
        /* This animal is now saved into elasticsearch */
      });
  })
; 

// -- Example with elasticsearch.js client#index params
myAnimal.import({name: 'Jeanne', surname: 'PiliPili', type: 'Rabbit'})
  .then(function(myAnimal) { 
    myAnimal.save({versionType: 'internal'})
      .then(function(savedAnimal) {
        /* This animal is now saved into elasticsearch */
      });
  })
; 
// -- You can also use bluebird shortcuts
myAnimal
  .import({name: 'Jean', surname: 'Coco', type: 'Rabbit'})
  .call('save')
  .then(function(savedAnimal) {
    /* This animal is now saved into elasticsearch */
  });

```

----

### 3.4 Instance methods - delete
Delete the document referenced by this instance. Return a promise.

```javascript
/*  ---- Delete - example ---- */
var ESObject = require('esobject');

var Animal = ESObject.create({ 
    db: { host: 'localhost:9200', index: 'myZoo', type: 'animal' },
});


Animal.get(id)
  .then(function(myAnimal) {
    myAnimal.delete()
      .then(function() {
        /* The document has been deleted */
      });
  })
;

```