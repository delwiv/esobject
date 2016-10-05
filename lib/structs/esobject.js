import _ from 'lodash';

// Basic object containing data linked to a database
export function ESObject(index, data) {
  if (arguments.length < 2) {
    data = index;
    index = null;
  }

  data = data || {};

  Object.defineProperties(this, {
    $index: {value: index},
    _id: {configurable: true, writable: true, value: data._id || undefined},
    _version: {configurable: true, writable: true, value: data._version || undefined},
    _fields: {configurable: true, value: {}},
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
  return _.assign({_id: this._id, _version: this._version}, this);
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
