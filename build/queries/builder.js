'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.objectBuilder = objectBuilder;
exports.queryReducer = queryReducer;
exports.queryBuilder = queryBuilder;

var _loader = require('./loader');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errors = require('../errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function callOrReturn(fnOrScalar) {
  if (!_lodash2.default.isFunction(fnOrScalar)) return fnOrScalar;

  for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  return fnOrScalar.apply(undefined, args);
}

function objectBuilder(array) {
  _errors.ESInternalError.assert(_lodash2.default.isArray(array), 'ArrayNeeded', { fn: 'objectBuilder' });

  return _lodash2.default.reduce(array, (acc, val) => {
    const keys = _lodash2.default.keys(val);
    if (keys.length !== 2 || _lodash2.default.difference(keys, ['key', 'value']).length) throw new _errors.ESInternalError('ArrayOfMapsNeeded', { fn: 'objectBuilder' });

    return function (obj, options) {
      const res = acc(obj, options);
      res[callOrReturn(val.key, obj, options)] = callOrReturn(val.value, obj, options);
      return res;
    };
  }, () => ({}));
}

function queryReducer(query) {
  return _lodash2.default.cloneWith(query, function cloner(val) {
    if (_lodash2.default.isFunction(val)) return val;else if (!_lodash2.default.isObject(val)) return _lodash2.default.constant(val);

    return _lodash2.default.reduce(val, (acc, propVal, propName) => {
      propVal = _lodash2.default.cloneWith(propVal, cloner);
      return function (obj, options) {
        const res = acc(obj, options);
        res[propName] = propVal(obj, options);
        return res;
      };
    }, () => _lodash2.default.isArray(val) ? [] : {});
  });
}

function queryBuilder() /* , query */{
  for (var _len2 = arguments.length, Types = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
    Types[_key2] = arguments[_key2];
  }

  const loader = Types[0] instanceof _loader.QueryLoader ? Types.shift() : _loader.defaultLoader;
  const query = _lodash2.default.isString(_lodash2.default.last(Types)) ? loader.load(Types.pop()) : Types.pop();
  const queryFn = queryReducer(query);

  function $builtQuery(index, options) {
    for (var _len3 = arguments.length, Types = Array(_len3 > 2 ? _len3 - 2 : 0), _key3 = 2; _key3 < _len3; _key3++) {
      Types[_key3 - 2] = arguments[_key3];
    }

    return index.search.apply(index, Types.concat([queryFn(this, options)]));
  }
  $builtQuery.$inject = ['index', 'options'].concat(Types);

  return $builtQuery;
}

exports.default = queryBuilder;