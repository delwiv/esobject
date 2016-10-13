'use strict';

const _ = require('lodash');
const elasticsearch = require('elasticsearch');
const path = require('path');
const Promise = require('bluebird');
const util = require('util');

const esobject = require('../lib');

const client = new elasticsearch.Client({
  //log: 'debug',
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

  statics: {
    getSimple: getSimple,
    getSimples: ['Test', {query: {term: {simple: true}}}],
  },
  methods: {
    getSimple: getSimple,
  },

  strategies: path.join(__dirname, 'test.strategies.yaml'),
});

const index2 = new esobject.Index(client, 'esobject-test2', Test);
const multiIndex = new esobject.MultiIndex(index, index2);

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

//*
multiIndex.search('Test', {aggs: {test: {value_count: {field: 'simple'}}}}) // eslint-disable-line camelcase
  .tap(res => console.log('search:', util.inspect(res, {colors: true, depth: null})))
  .call('import', [[{name: 'ELT1', sub: [{}, {}, {}]}, {user: 'toto'}], {name: 'ELT2', sub: {}}, {name: 'ELT3'}])
  .tap(res => console.log('import:', util.inspect(res, {colors: true, depth: null})))
  .call('import', [[{name: 'ELT1', sub: [{}, {}]}, {user: 'toto'}], {name: 'ELT2', sub: {}}, {name: 'ELT3'}])
  .tap(res => console.log('import2:', util.inspect(res, {colors: true, depth: null})))
  .call('export')
  .tap(res => console.log('export:', util.inspect(res, {colors: true, depth: null})))
  .catch(e => console.log('test.js:61', e))
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

//*
index.createTemplate('esobject-test', 'esobject-test*', {number_of_shards: 2, number_of_replicas: 1})
  .tap(res => console.log('mapping:', util.inspect(res, {colors: true, depth: null})))
;
//*/
