'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = create;

var _browse = require('./strategies/browse');

var _errors = require('./errors');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _esobject = require('./structs/esobject');

var _esobject2 = _interopRequireDefault(_esobject);

var _annotate = require('./annotate');

var _loader = require('./strategies/loader');

var _loader2 = _interopRequireDefault(_loader);

var _builder = require('./queries/builder');

var _builder2 = _interopRequireDefault(_builder);

var _loader3 = require('./queries/loader');

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function fnMaker(name, fn) {
  _errors.ESObjectError.assert(name.match(/^[a-zA-Z_]\w*$/), 'Invalid name for a function: ' + name);

  // eslint-disable-next-line no-new-func
  return new Function('fn', 'return function ' + name + '() { return fn.apply(this, arguments); };')(fn);
}

function createESMethod(loader, method) {
  var _$castArray;

  if (_lodash2.default.isArray(method)) method = _builder2.default.apply(undefined, _toConsumableArray((_$castArray = _lodash2.default.castArray(loader || [])).concat.apply(_$castArray, _toConsumableArray(method))));

  _errors.ESTypeError.assert(_lodash2.default.isFunction(method), 'InvalidArgument', { fn: 'createESMethod', type: 'function|Array<>' });

  method = (0, _annotate.injector)(method, (argName, options) => {
    switch (argName) {
      case 'options':
        return options;
      case 'index':
        return options.index;
      default:
        return options.index.getType(argName);
    }
  });

  return function (options) {
    options = options || {};

    if (!_lodash2.default.isObject(options)) throw new _errors.ESObjectError('statics of ESObjects should be provided with a single (optional) object parameter.');

    if (!this.$index && !('index' in options)) throw new _errors.ESObjectError('Impossible to do dependency injection in an object without an index.');

    const defaultOptions = {};
    Object.defineProperty(defaultOptions, 'index', { writable: true, value: this.$index });

    options = _lodash2.default.extend(defaultOptions, options);

    return method.call(this, options);
  };
}

function create(descrObj) {
  if (!descrObj.name) throw new _errors.ESObjectError('name property is mandatory');

  var Type = fnMaker(descrObj.name, function () {
    _esobject2.default.apply(this, arguments);
  });
  _util2.default.inherits(Type, _esobject2.default);
  Type.lowerName = Type.prototype._type = _lodash2.default.snakeCase(Type.name);

  if (descrObj.stores) _lodash2.default.invokeMap(_lodash2.default.castArray(descrObj.stores), 'add', Type);

  const queryLoader = descrObj.queryLoader ? new _loader3.QueryLoader(descrObj.queryLoader) : null;
  _lodash2.default.each(descrObj.statics, function (method, name) {
    Type[name] = createESMethod(queryLoader, method).bind({});
  });
  _lodash2.default.each(descrObj.methods, function (method, name) {
    Type.prototype[name] = createESMethod(queryLoader, method);
  });

  const strategies = _lodash2.default.isString(descrObj.strategies) ? (0, _loader2.default)(descrObj.strategies) : descrObj.strategies;
  _lodash2.default.extend(Type, (0, _browse.browseStrategies)(strategies, _browse.composers.strategies, _browse.composers.mapping));
  _lodash2.default.extend(Type.prototype, Type.strategies);

  return Type;
}