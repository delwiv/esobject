'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MultiIndex = MultiIndex;

var _errors = require('../errors');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function MultiIndex() {
  Object.defineProperty(this, '$indexes', { value: [] });
  this.add.apply(this, arguments);
}
Object.defineProperty(MultiIndex.prototype, 'name', {
  enumerable: true,
  get: function get() {
    return _lodash2.default.map(this.$indexes, 'name');
  }
});
Object.defineProperty(MultiIndex.prototype, '$client', {
  enumerable: true,
  get: function get() {
    return (this.$indexes[0] || {}).$client;
  }
});
MultiIndex.prototype.getIndex = function (name) {
  const index = _lodash2.default.find(this.$indexes, { name: name });
  _errors.ESObjectError.assert(index, 'NoIndex', { name: name, action: 'retrieve' });

  return index;
};
MultiIndex.prototype.add = function () {
  _lodash2.default.each(arguments, index => {
    _errors.ESTypeError.assert(index instanceof _index2.default, 'InvalidArgument', { fn: 'add', type: 'Index' });
    _errors.ESObjectError.assert(this.$indexes.indexOf(index) < 0, 'IndexAgain', { name: index.name });
    _errors.ESObjectError.assert(!this.$client || this.$client === index.$client, 'ClientConflict');

    this.$indexes.push(index);
  });

  return this;
};
MultiIndex.prototype.remove = function () {
  _lodash2.default.each(arguments, index => {
    _errors.ESTypeError.assert(index instanceof _index2.default, 'InvalidArgument', { fn: 'remove', type: 'Index' });

    const pos = this.$indexes.indexOf(index);
    _errors.ESObjectError.assert(pos >= 0, 'NoIndex', { name: index.name, action: 'remove' });

    this.$indexes.splice(pos, 1);
  });

  return this;
};
MultiIndex.prototype.search = _index2.default.prototype.search;
MultiIndex.prototype.getType = _index2.default.prototype.getType;
MultiIndex.prototype.getTypes = function () {
  return _lodash2.default.transform(this.$indexes, (acc, index) => _lodash2.default.extend(acc, index.getTypes()), {});
};

exports.default = MultiIndex;