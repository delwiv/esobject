import _ from 'lodash';
import Index from './index';

export function MultiIndex() {
  Object.defineProperty(this, '$indexes', {value: []});
  this.add(...arguments);
}
Object.defineProperty(MultiIndex.prototype, 'name', {
  enumerable: true,
  get: function() {
    return _.map(this.$indexes, 'name');
  },
});
Object.defineProperty(MultiIndex.prototype, '$client', {
  enumerable: true,
  get: function() {
    return (this.$indexes[0] || {}).$client;
  },
});
MultiIndex.prototype.getIndex = function(name) {
  var index = _.find(this.$indexes, {name: name});

  if (!index)
    throw new Error('Impossible to find index ' + name);

  return index;
};
MultiIndex.prototype.add = function() {
  _.each(arguments, index => {
    if (!(index instanceof Index))
      throw new Error('Invalid argument to MutiIndex.add(). Should be an Index.');

    if (this.$indexes.indexOf(index) >= 0)
      throw new Error('Impossible to add index ' + index.name + ' to multi index because it is already in there.');

    if (this.$client && this.$client !== index.$client)
      throw new Error('Impossible to add an index that does not share the same client that other indexes (for now).');

    this.$indexes.push(index);
  });

  return this;
};
MultiIndex.prototype.remove = function() {
  _.each(arguments, index => {
    if (!(index instanceof Index))
      throw new Error('Invalid argument to MutiIndex.remove(). Should be an Index.');

    var pos = this.$indexes.indexOf(index);
    if (pos < 0)
      throw new Error('Impossible to remove index ' + index.name + ' from multi index : not found.');

    this.$indexes.splice(pos, 1);
  });

  return this;
};
MultiIndex.prototype.search = Index.prototype.search;
MultiIndex.prototype.getType = Index.prototype.getType;
MultiIndex.prototype.getTypes = function() {
  return _.transform(this.$indexes, (acc, index) => _.extend(acc, index.getTypes()), {});
};

export default MultiIndex;
