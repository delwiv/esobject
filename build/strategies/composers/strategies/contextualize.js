'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.contextualize = contextualize;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _context = require('../../../context');

var _context2 = _interopRequireDefault(_context);

var _esobject = require('../../../structs/esobject');

var _esobject2 = _interopRequireDefault(_esobject);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function contextualizeForImport(strategy) {
  return function (raw) {
    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    const options = args[0] || {};
    const index = this.$index || options.index;

    return _bluebird2.default.try(() => strategy(new _context2.default({
      old: _lodash2.default.cloneDeep(this),
      raw: raw,
      res: this
    }, _lodash2.default.extend({
      index: index,
      options: options,
      args: args
    }, index ? index.getTypes() : {})))).return(this);
  };
}

function contextualizeForExport(strategy) {
  return function () {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    const options = args[0] || {};
    const index = this.$index || options.index;

    var res = _lodash2.default.cloneDeepWith(this, function flattenESObjects(value, key) {
      if (typeof key === 'symbol') return null;
      if (value instanceof _esobject2.default) return _lodash2.default.cloneDeepWith(_lodash2.default.assign({}, value), flattenESObjects);
      return undefined;
    });

    return _bluebird2.default.try(() => strategy(new _context2.default({
      obj: this,
      res: res
    }, _lodash2.default.extend({
      index: index,
      options: options,
      args: args
    }, index ? index.getTypes() : {})))).return(res);
  };
}

function contextualize(strategy, name) {
  const res = name.substr(0, 6) === 'import' ? contextualizeForImport(strategy) : contextualizeForExport(strategy);
  res.$notContextualized = strategy;
  return res;
}

exports.default = contextualize;