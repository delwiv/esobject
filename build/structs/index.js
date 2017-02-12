'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Index = Index;

var _errors = require('../errors');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _esobject = require('./esobject');

var _esobject2 = _interopRequireDefault(_esobject);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _store = require('./store');

var _store2 = _interopRequireDefault(_store);

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function decorateESArray(elts, Types) {
  var strategies = _lodash2.default.reduce(Types, function (acc, Type) {
    var ESType = Type;

    while (!ESType.strategies) ESType = Type.super_;

    var strategies = _lodash2.default.keys(ESType.strategies);

    return acc ? _lodash2.default.intersection(acc, strategies) : strategies;
  }, null);

  _lodash2.default.each(strategies, function (strategy) {
    elts[strategy] = function (arg) {
      var args = arguments;
      return _bluebird2.default.map(this, function (elt, i, length) {
        var applyArgs = args;
        if (_lodash2.default.isArray(arg) && arg.length === length) applyArgs = _lodash2.default.castArray(arg[i]);
        return elt[strategy].apply(elt, _toConsumableArray(applyArgs));
      }).then(function (res) {
        res.total = elts.total;

        if (elts.aggregations) res.aggregations = elts.aggregations;

        if (strategy.substr(0, 6) === 'import') return decorateESArray(res, Types);
        return res;
      });
    };
  });

  elts.import = elts.importDefault || function () {
    throw new _errors.ESObjectError('NoDefaultImport');
  };
  elts.export = elts.exportDefault || function () {
    throw new _errors.ESObjectError('NoDefaultExport');
  };

  return elts;
}

function Index(client, name) {
  for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    args[_key - 2] = arguments[_key];
  }

  _store2.default.call.apply(_store2.default, [this].concat(args));

  this.$client = client;
  this.name = name;
}
_util2.default.inherits(Index, _store2.default);
Index.prototype.getIndex = function (name) {
  _errors.ESObjectError.assert(name === this.name, 'NoIndex', { name: name, action: 'retrieve' });
  return this;
};
Index.prototype.get = function get(Type, id, params) {
  Type = _lodash2.default.isString(Type) ? this.getType(Type) : Type;

  const request = _lodash2.default.extend({}, params || {}, {
    index: this.name,
    type: Type.prototype._type,
    id: id
  });

  return _bluebird2.default.resolve(this.$client.get(request)).bind(this).then(function (data) {
    return new Type(this.getIndex(data._index), data);
  }, (0, _errors.getStackedToESError)({ request: request }));
};
Index.prototype.search = function search(Types, request, params) {
  Types = Array.prototype.slice.call(arguments, 0, arguments.length - 2);
  request = arguments[arguments.length - 2];
  params = arguments[arguments.length - 1];

  if (_esobject2.default.isESType(request) || _lodash2.default.isString(request)) {
    Types.push(request);
    request = params;
    params = {};
  }

  Types = _lodash2.default.map(Types, Type => _lodash2.default.isString(Type) ? this.getType(Type) : Type);

  var lowerTypeNames = _lodash2.default.map(Types, Type => {
    _errors.ESObjectError.assert(this.getType(Type.name) === Type, 'TypeConflict', { name: this.name, type: Type.name });
    return Type.prototype._type;
  });

  var action = params.action || 'search';
  delete params.action;

  return _bluebird2.default.resolve(this.$client[action](_lodash2.default.extend({
    index: this.name,
    type: lowerTypeNames,
    body: request,
    version: true
  }, params))).bind(this).then(function (data) {
    var res = _lodash2.default.map((data.hits || {}).hits || [], data => {
      var Type = _lodash2.default.find(Types, Type => Type.prototype._type === data._type);

      return new Type(this.getIndex(data._index), data);
    });

    res.total = (data.hits || {}).total || data.total;
    if ('deleted' in res) res.deleted = data.deleted;
    if ('batches' in res) res.batches = data.batches;
    if (data.aggregations) res.aggregations = data.aggregations;

    return decorateESArray(res, Types);
  }, (0, _errors.getStackedToESError)());
};
Index.prototype.save = function (obj, params) {
  params = params || {};

  _errors.ESObjectError.assert(!obj._index || obj._index === this.name, 'IndexConflict', { name: this.name, obj: obj, fn: 'save' });

  return _bluebird2.default.resolve(this.$client[!obj._id || obj._version || params.force ? 'index' : 'create'](_lodash2.default.extend({
    index: this.name,
    type: obj._type,
    parent: obj._parent,
    id: obj._id,
    version: params.force ? undefined : obj._version,
    body: obj
  }, params, { force: undefined }))).tap(data => {
    _errors.ESObjectError.assert(!obj._id || obj._id === data._id, 'IdChanged', { obj: obj, data: data, fn: 'save' });
    obj._id = data._id;
    obj._version = data._version;
  }).return(obj).catch((0, _errors.getStackedToESError)());
};
Index.prototype.delete = function (obj, params) {
  params = params || {};

  _errors.ESObjectError.assert(!obj._index || obj._index === this.name, 'IndexConflict', { name: this.name, obj: obj, fn: 'delete' });
  _errors.ESObjectError.assert(obj._id, 'NoId', { fn: 'delete' });
  _errors.ESObjectError.assert(obj._version || params.force, 'NoVersion', { fn: 'delete' });

  return _bluebird2.default.resolve(this.$client.delete(_lodash2.default.extend({
    index: this.name,
    type: obj._type,
    parent: obj._parent,
    id: obj._id,
    version: params.force ? undefined : obj._version
  }, params, { force: undefined }))).tap(data => {
    _errors.ESObjectError.assert(obj._id === data._id, 'IdChanged', { obj: obj, data: data, fn: 'delete' });
    obj._version = data._version;
  }).return(obj).catch((0, _errors.getStackedToESError)());
};
Index.prototype.getMappings = function () {
  return _lodash2.default.transform(this.getTypes(), (acc, Type) => {
    while (!Type.mappings) Type = Type.super_;
    acc[Type.prototype._type] = Type.mappings;
  }, {});
};
Index.prototype.createOrUpdate = function (settings) {
  const mappings = this.getMappings();

  // TODO: sort types properly to prevent errors
  return _bluebird2.default.resolve(this.$client.indices.create({
    index: this.name,
    body: {
      settings: settings,
      mappings: mappings
    }
  })).catch(err => err.message.match(/index_already_exists_exception/), () => _bluebird2.default.all(_lodash2.default.map(mappings, (val, type) => this.$client.indices.putMapping({
    index: this.name,
    type: type,
    updateAllTypes: true,
    body: { [type]: val }
  })).concat(_lodash2.default.isEmpty(settings) ? [] : this.$client.indices.putSettings({
    index: this.name,
    body: _lodash2.default.omit(settings, 'number_of_shards')
  }))).return({ aknowledge: true })).catch((0, _errors.getStackedToESError)());
};
Index.prototype.deleteIndex = function (params) {
  return _bluebird2.default.resolve(this.$client.indices.delete(_lodash2.default.extend({ index: this.name }, params || {})));
};
Index.prototype.reindex = function (destIndex, sourceQuery, destQuery, params) {
  _errors.ESTypeError.assert(destIndex instanceof Index, 'InvalidArgument', { fn: 'reindex', type: 'Index' });

  return _bluebird2.default.resolve(this.$client.reindex(_lodash2.default.extend({
    body: {
      source: _lodash2.default.extend({ index: this.name }, sourceQuery),
      dest: _lodash2.default.extend({ index: destIndex.name }, destQuery)
    }
  }, params)));
};
Index.prototype.createTemplate = function (name, pattern, settings, params) {
  return _bluebird2.default.resolve(this.$client.indices.putTemplate(_lodash2.default.extend({
    name: name,
    body: {
      template: pattern,
      settings: settings,
      mappings: this.getMappings()
    }
  }, params)));
};
Index.prototype.refresh = function (params) {
  return _bluebird2.default.resolve(this.$client.indices.refresh(_lodash2.default.extend({ index: this.name }, params))).catch((0, _errors.getStackedToESError)());
};

exports.default = Index;