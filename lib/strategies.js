'use strict';

define(function(_, Promise, callers, templates, properties, actions, context) {
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

        // Replace first argument by the proper context
        Array.prototype.splice.call(arguments, 0, 1, new context.Context({
          old: oldObj,
          raw: plainObj,
          res: this
        }));

        // Executes the previously generated import callback
        return this.constructor.config[importName + 'ImportStrategy'].apply(this, arguments);
      };
    },

    createExportProto: function(exportName) {
      return function $export() {
        // plainObj is a deep clone of this
        var plainObj = _.cloneDeep(this);

        // Add the context before the arguments
        Array.prototype.unshift.call(arguments, new context.Context({
          old: this,
          res: plainObj,
        }));

        // Execute the previously generated export callback
        return this.constructor.config[exportName + 'ExportStrategy'].apply(this, arguments);
      };
    },
  };
});
