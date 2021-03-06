'use strict';

const elasticsearch = require('elasticsearch');
const errTree = require('err-tree');
const path = require('path');
const util = require('util');
const yaml = require('js-yaml');

errTree.setDefaultBeautifier('complex');

const esobject = require('../lib');

const client = new elasticsearch.Client({
  // log: 'debug',
});

const index = new esobject.Index(client, 'esobject-test');

//*
function getSimple(index, Test) {
  return index.get(Test, 'simple').catchReturn({notFound: true});
}
//*/
/*
const getSimple = ['index', 'Test', function(i, T) {
  return i.get(T, 'simple').catchReturn({notFound: true});
}];
//*/

const Test = esobject.create({
  name: 'Test',
  stores: index,

  queryLoader: {
    yaml: {
      types: [new yaml.Type('!on', {kind: 'scalar', construct: () => true})],
    },
  },

  statics: {
    getSimple: getSimple,
    getSimples: ['Test', path.join(__dirname, 'find_simple.yaml')],
  },
  methods: {
    getSimple: getSimple,
  },

  strategies: path.join(__dirname, 'test.strategies.yaml'),
});

// process.exit(0)

const index2 = new esobject.Index(client, 'esobject-test2', Test);
const multiIndex = new esobject.MultiIndex(index, index2);

var test = new Test();
test.import({})
  .tap(test => console.log(test))
;

/*
Test.getSimple({index: index})
  .tap(res => console.log('static:', util.inspect(res, {colors: true, depth: null})))
  .call('getSimple')
  .tap(res => console.log('method:', util.inspect(res, {colors: true, depth: null})))
;
//*/

/*
Test.getSimples({index: multiIndex})
  .tap(res => console.log('static simples:', util.inspect(res, {colors: true, depth: null})))
;
//*/

/*
multiIndex.search('Test', {aggs: {test: {value_count: {field: 'simple'}}}}) // eslint-disable-line camelcase
  .tap(res => console.log('search:', util.inspect(res, {colors: true, depth: null})))
  .call('import', [[{name: 'ELT1', sub: [{}, {}, {value: 'third one', test: true}]}, {user: 'toto'}], {name: 'ELT2', sub: [{}]}, {name: 'ELT3'}])
  .tap(res => console.log('import:', util.inspect(res, {colors: true, depth: null})))
  .call('import', [[{name: 'ELT1', sub: [{value: 'third one'}, {}]}, {user: 'toto'}], {name: 'ELT2', sub: [{}]}, {name: 'ELT3'}])
  .tap(res => console.log('import2:', util.inspect(res, {colors: true, depth: null})))
  .call('export')
  .tap(res => console.log('export:', util.inspect(res, {colors: true, depth: null})))
;
//*/

/*
index.get(Test, 'simple')
  .call('import', {name: 'LOVE', simple: false})
  .tap(console.log.bind(console))
  .call('import', {simple: false})
  .tap(console.log.bind(console))
  .call('importSuper', {simple: false})
  .tap(console.log.bind(console))
;
//*/

/*
index.get(Test, 'save_test')
  .tap(res => console.log('get:', util.inspect(res, {colors: true, depth: null})))
  .catch(() => new Test(index, {_id: 'save_test', simple: false}))
  .call('save')
  .tap(res => console.log('save:', util.inspect(res, {colors: true, depth: null})))
  .call('delete')
  .tap(res => console.log('delete:', util.inspect(res, {colors: true, depth: null})))
  .call('save')
  .tap(res => console.log('save:', util.inspect(res, {colors: true, depth: null})))
;
//*/

/*
index.createOrUpdate({number_of_shards: 2, number_of_replicas: 1})
  .tap(res => console.log('mapping:', util.inspect(res, {colors: true, depth: null})))
;
//*/

/*
index.createTemplate('esobject-test', 'esobject-test*', {number_of_shards: 2, number_of_replicas: 1})
  .tap(res => console.log('mapping:', util.inspect(res, {colors: true, depth: null})))
;
//*/

/*
index.get('Test', 'lol')
  .catch(err => console.log('test.js:112', err))
;
//*/
//

/*
index.reindex(new esobject.Index(client, 'esobject-test3'));
//*/
