'use strict';

define(function(_, Promise, callers, templates, properties, actions) {
  function strategy(name) {
    return function(strategy) {
      return actions.create(name, strategy, callers[name], templates[name]);
    };
  }

  return {
    import: strategy('import'),
    export: strategy('export'),

    createImportProto: function(importName) {
      // Import merges attributes from a plain object into the instance
      return function $import(plainObj) {
        // oldObj is a deep clone of our object + non enumerable attributes
        // copied over
        var oldObj = _.cloneDeep(this);
        _.extend(oldObj, _.pick(this, properties.privateNames));

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
        return this.constructor.config[importName + 'ImportStrategy'].apply(this, arguments);
      };
    },

    createExportProto: function(exportName) {
      return function $export() {
        // plainObj is a deep clone of this
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
        return this.constructor.config[exportName + 'ExportStrategy'].apply(this, arguments);
      };
    },
  };
});
