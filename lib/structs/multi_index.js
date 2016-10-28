import {ESObjectError, ESTypeError} from '../errors';
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
  const index = _.find(this.$indexes, {name: name});
  ESObjectError.assert(index, 'NoIndex', {name, action: 'retrieve'});

  return index;
};
MultiIndex.prototype.add = function() {
  _.each(arguments, index => {
    ESTypeError.assert(index instanceof Index, 'InvalidArgument', {fn: 'add', type: 'Index'});
    ESObjectError.assert(this.$indexes.indexOf(index) < 0, 'IndexAgain', {name: index.name});
    ESObjectError.assert(!this.$client || this.$client === index.$client, 'ClientConflict');

    this.$indexes.push(index);
  });

  return this;
};
MultiIndex.prototype.remove = function() {
  _.each(arguments, index => {
    ESTypeError.assert(index instanceof Index, 'InvalidArgument', {fn: 'remove', type: 'Index'});

    const pos = this.$indexes.indexOf(index);
    ESObjectError.assert(pos >= 0, 'NoIndex', {name: index.name, action: 'remove'});

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
