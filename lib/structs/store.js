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
      if (this.$stores.indexOf(Type) >= 0)
        throw new Error('Provided store already added to the current store.');
      this.$stores.push(Type);
      return;
    }

    if (!ESObject.isESType(Type))
      throw new Error('Invalid argument to Store.add(). Not a type nor a store.');

    if (Type.name in this.$types)
      throw new Error('Impossible to add type ' + Type.name + ' in store : a type with the same name already exists.');

    this.$types[Type.name] = Type;
  });

  return this;
};
Store.prototype.remove = function remove() {
  _.each(arguments, Type => {
    var pos = -1;

    if (Type instanceof Store) {
      pos = this.$stores.indexOf(Type);
      if (pos < 0)
        throw new Error('Provided store not found in the current store.');
      this.$stores.splice(pos, 1);
      return;
    }

    if (!(Type instanceof ESObject))
      throw new Error('Invalid argument to Store.remove(). Not a type.');

    if (!(Type.name in this.$types) || this.$types[Type.name] !== Type)
      throw new Error('Impossible to remove type ' + Type.name + ' from store :type not found.');

    delete this.$types[Type.name];
  });

  return this;
};
Store.prototype.getType = function(typeName) {
  var allTypes = this.getTypes();

  if (!(typeName in allTypes))
    throw new Error('Impossible to find type ' + typeName + ' in index ' + this.name);

  return allTypes[typeName];
};
Store.prototype.getTypes = function getTypes() {
  return _.transform(this.$stores, (acc, store) => _.extend(acc, store.getTypes()), _.extend({}, this.$types));
};

export default Store;
