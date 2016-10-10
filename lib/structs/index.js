import _ from 'lodash';
import ESObject from './esobject';
import Promise from 'bluebird';
import Store from './store';
import util from 'util';

function decorateESArray(elts) {
  var strategies = _.reduce(elts, function(acc, elt) {
    var strategies = _.keys(elt.constructor.strategies);

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
            return decorateESArray(res);
          return res;
        })
      ;
    };
  });
  elts.import = elts.importDefault || function() {
    throw new Error('no default import strategy');
  };
  elts.export = elts.exportDefault || function() {
    throw new Error('no default export strategy');
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
  if (name !== this.name)
    throw new Error('Impossible to retrieve index ' + name);
  return this;
};
Index.prototype.get = function get(Type, id, params) {
  return Promise.resolve(this.$client.get(_.extend({}, params || {}, {
    index: this.name,
    type: Type.lowerName,
    id: id,
  })))
    .bind(this)
    .then(function(data) {
      return new Type(this.getIndex(data._index), data);
    })
  ;
};
Index.prototype.search = function search(Types, request, params) {
  Types = Array.prototype.slice.call(arguments, 0, arguments.length - 2);
  request = arguments[arguments.length - 2];
  params = arguments[arguments.length - 1];

  if (ESObject.isESType(request)) {
    Types.push(request);
    request = params;
    params = {};
  }

  var lowerTypeNames = _.map(Types, Type => {
    if (this.getType(Type.name) !== Type)
      throw new Error('The index ' + this.name + ' contains a different type ' + Type.name + ' than the one provided');

    return Type.lowerName;
  });

  return Promise.resolve(this.$client.search(_.extend({
    index: this.name,
    type: lowerTypeNames,
    body: _.merge({fields: ['_source']}, request),
    version: true,
  }, params)))
    .bind(this)
    .then(function(data) {
      var res = _.map(data.hits.hits, data => {
        var Type = _.find(Types, {lowerName: data._type});

        return new Type(this.getIndex(data._index), data);
      });

      res.total = data.hits.total;

      if (data.aggregations)
        res.aggregations = data.aggregations;

      return decorateESArray(res);
    })
  ;
};
Index.prototype.save = function(obj, params) {
  params = params || {};

  if (obj._index && obj._index !== this.name)
    throw new Error('Trying to save an object from a different index (' + obj._index + ') in index ' + this.name);

  return Promise.resolve(this.$client[obj._version || params.force ? 'index' : 'create'](_.extend({
    index: this.name,
    type: obj._type,
    parent: obj._parent,
    id: obj._id,
    version: params.force ? undefined : obj._version,
    body: obj,
  }, params, {force: undefined})))
    .tap(res => {
      if (obj._id && res._id !== obj._id)
        throw new Error('Strange error: id seems to have changed during save…');
      obj._version = res._version;
    })
    .return(obj)
  ;
};
Index.prototype.delete = function(obj, params) {
  params = params || {};

  if (obj._index && obj._index !== this.name)
    throw new Error('Trying to delete an object from a different index (' + obj._index + ') from index ' + this.name);

  if (!obj._id)
    throw new Error('Trying to delete an object without an id');

  if (!obj._version && !params.force)
    throw new Error('Trying to delete an object without a version (you can use force to bypass this)');

  return Promise.resolve(this.$client.delete(_.extend({
    index: this.name,
    type: obj._type,
    parent: obj._parent,
    id: obj._id,
    version: params.force ? undefined : obj._version,
  }, params, {force: undefined})))
    .tap(res => {
      if (res._id !== obj._id)
        throw new Error('Strange error: id seems to have changed during save…');
      obj._version = res._version;
    })
    .return(obj)
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
    .catch(() =>
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
  ;
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

export default Index;
