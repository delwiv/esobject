'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Store = Store;

var _errors = require('../errors');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _esobject = require('./esobject');

var _esobject2 = _interopRequireDefault(_esobject);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Store() {
  this.$types = {};
  this.$stores = [];

  this.add.apply(this, arguments);
}
Store.prototype.add = function add() /* ...typesOrStores */{
  _lodash2.default.each(arguments, Type => {
    if (Type instanceof Store) {
      _errors.ESObjectError.assert(this.$stores.indexOf(Type) < 0, 'StoreAgain');
      this.$stores.push(Type);
      return;
    }

    _errors.ESTypeError.assert(_esobject2.default.isESType(Type), 'InvalidArgument', { fn: 'add', type: 'ESObject class' });
    _errors.ESObjectError.assert(!(Type.name in this.$types), 'TypeAgain', { name: Type.name });

    this.$types[Type.name] = Type;
  });

  return this;
};
Store.prototype.remove = function remove() {
  _lodash2.default.each(arguments, Type => {
    var pos = -1;

    if (Type instanceof Store) {
      pos = this.$stores.indexOf(Type);
      _errors.ESObjectError.assert(pos >= 0, 'NoIndex', { action: 'remove', name: this.name || '<store>' });
      this.$stores.splice(pos, 1);
      return;
    }

    _errors.ESTypeError.assert(_esobject2.default.isESType(Type), 'InvalidArgument', { fn: 'remove', type: 'ESObject class' });
    if (!(Type.name in this.$types) || this.$types[Type.name] !== Type) throw new _errors.ESObjectError('NoType', { name: Type.name, fn: 'remove' });

    delete this.$types[Type.name];
  });

  return this;
};
Store.prototype.getType = function (typeName) {
  var allTypes = this.getTypes();
  _errors.ESObjectError.assert(typeName in allTypes, 'NoType', { name: typeName, fn: 'get type' });

  return allTypes[typeName];
};
Store.prototype.getTypes = function getTypes() {
  return _lodash2.default.transform(this.$stores, (acc, store) => _lodash2.default.extend(acc, store.getTypes()), _lodash2.default.extend({}, this.$types));
};

exports.default = Store;