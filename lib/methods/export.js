'use strict';

define(function(_) {
  // Export creates a safe plain object from this instance to use in APIs
  return function $export() {
    // plainObj is a deep clone of this with version copied over
    var plainObj = _.cloneDeep(this);

    // Create first arguments
    // - currentObj (this)
    // - null (no new obj)
    // - plainObj (exported target)
    Array.prototype.unshift.call(arguments,
      this,
      null,
      plainObj
    );

    // Execute the previously generated export callback
    return this.constructor.config.export.apply(this, arguments);
  };
});
