'use strict';

define(function(_) {
  // Import merges attributes from a plain object into the instance
  return function $import(plainObj) {
    // oldObj is a deep clone of our object + non enumerable attributes
    // copied over
    var oldObj = _.cloneDeep(this);
    oldObj._id = this._id;
    oldObj._version = this._version;

    // Remove first argument and replace it with
    // - oldObj
    // - plainObj (that will get the newObj role)
    // - this (resObj <=> target)
    Array.prototype.splice.call(arguments, 0, 1,
      oldObj,
      plainObj,
      this
    );

    // Executes the previously generated import callback
    return this.constructor.config.import.apply(this, arguments);
  };
});
