import {ESObjectError, ESTypeError} from '../errors';
import _ from 'lodash';
import ESObject from './esobject';

export function Store() {
  this.$types = {};
  this.$stores = [];

  this.add(...arguments);
}
Store.prototype.add = function add(/* ...typesOrStores */) {
  _.each(arguments, Type => {
    if (Type instanceof Store) {
      ESObjectError.assert(this.$stores.indexOf(Type) < 0, 'StoreAgain');
      this.$stores.push(Type);
      return;
    }

    ESTypeError.assert(ESObject.isESType(Type), 'InvalidArgument', {fn: 'add', type: 'ESObject class'});
    ESObjectError.assert(!(Type.name in this.$types), 'TypeAgain', {name: Type.name});

    this.$types[Type.name] = Type;
  });

  return this;
};
Store.prototype.remove = function remove() {
  _.each(arguments, Type => {
    var pos = -1;

    if (Type instanceof Store) {
      pos = this.$stores.indexOf(Type);
      ESObjectError.assert(pos >= 0, 'NoIndex', {action: 'remove', name: this.name || '<store>'});
      this.$stores.splice(pos, 1);
      return;
    }

    ESTypeError.assert(ESObject.isESType(Type), 'InvalidArgument', {fn: 'remove', type: 'ESObject class'});
    if (!(Type.name in this.$types) || this.$types[Type.name] !== Type)
      throw new ESObjectError('NoType', {name: Type.name, fn: 'remove'});

    delete this.$types[Type.name];
  });

  return this;
};
Store.prototype.getType = function(typeName) {
  var allTypes = this.getTypes();
  ESObjectError.assert(typeName in allTypes, 'NoType', {name: typeName, fn: 'get type'});

  return allTypes[typeName];
};
Store.prototype.getTypes = function getTypes() {
  return _.transform(this.$stores, (acc, store) => _.extend(acc, store.getTypes()), _.extend({}, this.$types));
};

export default Store;
