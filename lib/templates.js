'use strict';

define(function(_) {
  // Template caller for import actions
  function importFn(attr, tpl) {
    var cb = _.template(tpl);
    return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
      // Call the template function defining the following attributes:
      // - oldObj (not in context)
      // - newObj (not in context)
      resCtxObj[attr] = cb({
        obj: oldObj,
        raw: newObj,
      });
    };
  }

  // Template caller for export actions
  function exportFn(attr, tpl) {
    var cb = _.template(tpl);
    return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
      // Call the template function using the old obj (not in context)
      // as namespace
      resCtxObj[attr] = cb({obj: oldObj || {}});
    };
  }

  return {
    import: importFn,
    export: exportFn,
  };
});
