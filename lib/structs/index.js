import {ESObjectError, getStackedToESError, ESTypeError} from '../errors';
import _ from 'lodash';
import ESObject from './esobject';
import Promise from 'bluebird';
import Store from './store';
import util from 'util';

function decorateESArray(elts, Types) {
  var strategies = _.reduce(Types, function(acc, Type) {
    var strategies = _.keys(Type.strategies);

    return acc ? _.intersection(acc, strategies) : strategies;
  }, null);

  _.each(strategies, function(strategy) {
    elts[strategy] = function(arg) {
      var args = arguments;
      return Promise.map(this, function(elt, i, length) {
        var applyArgs = args;
        if (_.isArray(arg) && arg.length === length)
          applyArgs = _.castArray(arg[i]);
        return elt[strategy](...applyArgs);
      })
        .then(function(res) {
          res.total = elts.total;

          if (elts.aggregations)
            res.aggregations = elts.aggregations;

          if (strategy.substr(0, 6) === 'import')
            return decorateESArray(res, Types);
          return res;
        })
      ;
    };
  });

  elts.import = elts.importDefault || function() {
    throw new ESObjectError('NoDefaultImport');
  };
  elts.export = elts.exportDefault || function() {
    throw new ESObjectError('NoDefaultExport');
  };

  return elts;
}

export function Index(client, name, ...args) {
  Store.call(this, ...args);

  this.$client = client;
  this.name = name;
}
util.inherits(Index, Store);
Index.prototype.getIndex = function(name) {
  ESObjectError.assert(name === this.name, 'NoIndex', {name: name, action: 'retrieve'});
  return this;
};
Index.prototype.get = function get(Type, id, params) {
  Type = _.isString(Type) ? this.getType(Type) : Type;

  const request = _.extend({}, params || {}, {
    index: this.name,
    type: Type.lowerName,
    id: id,
  });

  return Promise.resolve(this.$client.get(request))
    .bind(this)
    .then(function(data) {
      return new Type(this.getIndex(data._index), data);
    }, getStackedToESError({request}))
  ;
};
Index.prototype.search = function search(Types, request, params) {
  Types = Array.prototype.slice.call(arguments, 0, arguments.length - 2);
  request = arguments[arguments.length - 2];
  params = arguments[arguments.length - 1];

  if (ESObject.isESType(request) || _.isString(request)) {
    Types.push(request);
    request = params;
    params = {};
  }

  Types = _.map(Types, Type => _.isString(Type) ? this.getType(Type) : Type);

  var lowerTypeNames = _.map(Types, Type => {
    ESObjectError.assert(this.getType(Type.name) === Type, 'TypeConflict', {name: this.name, type: Type.name});
    return Type.lowerName;
  });

  var action = params.action || 'search';
  delete params.action;

  return Promise.resolve(this.$client[action](_.extend({
    index: this.name,
    type: lowerTypeNames,
    body: request,
    version: true,
  }, params)))
    .bind(this)
    .then(function(data) {
      var res = _.map((data.hits || {}).hits || [], data => {
        var Type = _.find(Types, {lowerName: data._type});

        return new Type(this.getIndex(data._index), data);
      });

      res.total = (data.hits || {}).total || data.total;
      if ('deleted' in res)
        res.deleted = data.deleted;
      if ('batches' in res)
        res.batches = data.batches;
      if (data.aggregations)
        res.aggregations = data.aggregations;

      return decorateESArray(res, Types);
    }, getStackedToESError())
  ;
};
Index.prototype.save = function(obj, params) {
  params = params || {};

  ESObjectError.assert(!obj._index || obj._index === this.name, 'IndexConflict', {name: this.name, obj, fn: 'save'});

  return Promise.resolve(this.$client[!obj._id || obj._version || params.force ? 'index' : 'create'](_.extend({
    index: this.name,
    type: obj._type,
    parent: obj._parent,
    id: obj._id,
    version: params.force ? undefined : obj._version,
    body: obj,
  }, params, {force: undefined})))
    .tap(data => {
      ESObjectError.assert(!obj._id || obj._id === data._id, 'IdChanged', {obj, data, fn: 'save'});
      obj._id = data._id;
      obj._version = data._version;
    })
    .return(obj)
    .catch(getStackedToESError())
  ;
};
Index.prototype.delete = function(obj, params) {
  params = params || {};

  ESObjectError.assert(!obj._index || obj._index === this.name, 'IndexConflict', {name: this.name, obj, fn: 'delete'});
  ESObjectError.assert(obj._id, 'NoId', {fn: 'delete'});
  ESObjectError.assert(obj._version || params.force, 'NoVersion', {fn: 'delete'});

  return Promise.resolve(this.$client.delete(_.extend({
    index: this.name,
    type: obj._type,
    parent: obj._parent,
    id: obj._id,
    version: params.force ? undefined : obj._version,
  }, params, {force: undefined})))
    .tap(data => {
      ESObjectError.assert(obj._id === data._id, 'IdChanged', {obj, data, fn: 'delete'});
      obj._version = data._version;
    })
    .return(obj)
    .catch(getStackedToESError())
  ;
};
Index.prototype.getMappings = function() {
  return _.transform(this.getTypes(), (acc, Type) => {
    acc[Type.lowerName] = Type.mappings;
  }, {});
};
Index.prototype.createOrUpdate = function(settings) {
  const mappings = this.getMappings();

  // TODO: sort types properly to prevent errors
  return Promise.resolve(this.$client.indices.create({
    index: this.name,
    body: {
      settings: settings,
      mappings: mappings,
    },
  }))
    .catch(err => err.message.match(/index_already_exists_exception/), () =>
      Promise.all(
        _.map(mappings, (val, type) =>
          this.$client.indices.putMapping({
            index: this.name,
            type: type,
            updateAllTypes: true,
            body: {[type]: val},
          })
        )
          .concat(_.isEmpty(settings) ? [] : this.$client.indices.putSettings({
            index: this.name,
            body: _.omit(settings, 'number_of_shards'),
          }))
      ).return({aknowledge: true})
    )
    .catch(getStackedToESError())
  ;
};
Index.prototype.deleteIndex = function(params) {
  return Promise.resolve(this.$client.indices.delete(_.extend({index: this.name}, params || {})));
};
Index.prototype.reindex = function(destIndex, sourceQuery, destQuery, params) {
  ESTypeError.assert(destIndex instanceof Index, 'InvalidArgument', {fn: 'reindex', type: 'Index'});

  return Promise.resolve(this.$client.reindex(_.extend({
    body: {
      source: _.extend({index: this.name}, sourceQuery),
      dest: _.extend({index: destIndex.name}, destQuery),
    },
  }, params)));
};
Index.prototype.createTemplate = function(name, pattern, settings, params) {
  return Promise.resolve(this.$client.indices.putTemplate(_.extend({
    name: name,
    body: {
      template: pattern,
      settings: settings,
      mappings: this.getMappings(),
    },
  }, params)));
};
Index.prototype.refresh = function(params) {
  return Promise.resolve(this.$client.indices.refresh(_.extend({index: this.name}, params)))
    .catch(getStackedToESError())
  ;
};

export default Index;
