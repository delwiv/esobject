'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.QueryLoader = exports.errors = exports.strategies = exports.Store = exports.query = exports.MultiIndex = exports.Index = exports.ESObject = exports.create = undefined;

var _index = require('./structs/index');

Object.defineProperty(exports, 'Index', {
  enumerable: true,
  get: function get() {
    return _index.Index;
  }
});

var _multi_index = require('./structs/multi_index');

Object.defineProperty(exports, 'MultiIndex', {
  enumerable: true,
  get: function get() {
    return _multi_index.MultiIndex;
  }
});

var _store = require('./structs/store');

Object.defineProperty(exports, 'Store', {
  enumerable: true,
  get: function get() {
    return _store.Store;
  }
});

var _helpers = require('./strategies/helpers');

Object.defineProperty(exports, 'strategies', {
  enumerable: true,
  get: function get() {
    return _helpers.strategies;
  }
});

var _loader = require('./queries/loader');

Object.defineProperty(exports, 'QueryLoader', {
  enumerable: true,
  get: function get() {
    return _loader.QueryLoader;
  }
});
exports.yaml = yaml;

var _errors = require('./errors');

var errors = _interopRequireWildcard(_errors);

var _builder = require('./queries/builder');

var query = _interopRequireWildcard(_builder);

var _create = require('./create');

var _create2 = _interopRequireDefault(_create);

var _esobject = require('./structs/esobject');

var _esobject2 = _interopRequireDefault(_esobject);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

exports.create = _create2.default;
exports.ESObject = _esobject2.default;
exports.query = query;
exports.errors = errors;
function yaml() {
  return require('js-yaml');
}

_esobject2.default.create = _create2.default;

exports.default = _esobject2.default;