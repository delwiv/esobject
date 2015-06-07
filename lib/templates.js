'use strict';

define(function(_) {
  // Template caller for import actions
  function importFn(attr, tpl) {
    var cb = _.template(tpl);
    return function(context) {
      // Call the template function defining the following attributes:
      // - oldObj (not in context)
      // - newObj (not in context)
      context.get('res')[attr] = cb({
        obj: context.get('old$root') || {}, // DEPRECATED
        esobj: context.get('old$root') || {},
        raw: context.get('raw$root') || {},
      });
    };
  }

  // Template caller for export actions
  function exportFn(attr, tpl) {
    var cb = _.template(tpl);
    return function(context) {
      // Call the template function using the old obj (not in context)
      // as namespace
      context.get('res')[attr] = cb({
        obj: context.get('old$root'), // DEPRECATED
        esobj: context.get('old$root'),
      });
    };
  }

  return {
    import: importFn,
    export: exportFn,
  };
});
