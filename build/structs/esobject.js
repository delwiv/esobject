'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ESObject = ESObject;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errors = require('../errors');

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Basic object containing data linked to a database
function ESObject(index, data) {
  if (!(index instanceof _index2.default)) {
    data = index;
    index = null;
  }

  data = data || {};

  Object.defineProperties(this, {
    $index: { value: index },
    _parent: { writable: true, value: data._parent || undefined },
    _id: { writable: true, value: data._id || undefined },
    _version: { writable: true, value: data._version || undefined },
    _fields: { value: {} }
  });

  if (data._source) {
    _lodash2.default.extend(this._fields, data.fields || {});
    data = data._source;
  }

  _lodash2.default.extend(this, data || {});
}

// statics
ESObject.isESType = function (Type) {
  return _lodash2.default.isFunction(Type) && Type.prototype instanceof ESObject;
};

// getters & setters
Object.defineProperty(ESObject.prototype, '_index', { get: function get() {
    return (this.$index || {}).name;
  } });

// methods
ESObject.prototype.inspect = function () {
  var base = {};
  if (this._parent) base._parent = this._parent;
  if (this._id) base._id = this._id;
  if (this._version) base._version = this._version;
  return _lodash2.default.assign(base, this);
};
// todo: generalize this kind of bypass
ESObject.prototype.save = function () {
  var _$index;

  _errors.ESObjectError.assert(this.$index, 'NoIndexLinked', { obj: this });
  return (_$index = this.$index).save.apply(_$index, [this].concat(Array.prototype.slice.call(arguments)));
};
ESObject.prototype.delete = function () {
  var _$index2;

  _errors.ESObjectError.assert(this.$index, 'NoIndexLinked', { obj: this });
  return (_$index2 = this.$index).delete.apply(_$index2, [this].concat(Array.prototype.slice.call(arguments)));
};
exports.default = ESObject;