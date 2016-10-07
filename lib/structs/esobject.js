import _ from 'lodash';
import Index from './index';

// Basic object containing data linked to a database
export function ESObject(index, data) {
  if (!(index instanceof Index)) {
    data = index;
    index = null;
  }

  data = data || {};

  Object.defineProperties(this, {
    $index: {value: index},
    _parent: {writable: true, value: data._parent || undefined},
    _id: {writable: true, value: data._id || undefined},
    _version: {writable: true, value: data._version || undefined},
    _fields: {value: {}},
  });

  if (data._source) {
    _.extend(this._fields, data.fields || {});
    data = data._source;
  }

  _.extend(this, data || {});
}

// statics
ESObject.isESType = function(Type) {
  return _.isFunction(Type) && Type.prototype instanceof ESObject;
};

// getters & setters
Object.defineProperty(ESObject.prototype, '_index', {get: function() {
  return (this.$index || {}).name;
}});
Object.defineProperty(ESObject.prototype, '_type', {get: function() {
  return this.constructor.lowerName;
}});

// methods
ESObject.prototype.inspect = function() {
  var base = {};
  if (this._parent)
    base._parent = this._parent;
  if (this._id)
    base._id = this._id;
  if (this._version)
    base._version = this._version;
  return _.assign(base, this);
};
// todo: generalize this kind of bypass
ESObject.prototype.save = function() {
  if (!this.$index)
    throw new Error('No index linked with this object');
  return this.$index.save(this, ...arguments);
};
ESObject.prototype.delete = function() {
  if (!this.$index)
    throw new Error('No index linked with this object');
  return this.$index.delete(this, ...arguments);
};
export default ESObject;
