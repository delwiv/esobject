'use strict';

define(function(_, Promise) {
  // Return a method that will modify attr in target with its given value
  // Note: if value is undefined, attribute will be deleted from target
  function modifyAttrVal(attr, target) {
    return function(res) {
      // If value is undefined, delete the attribute
      if (res === undefined)
        delete target[attr];
      // Otherwise, store the new value in the res object
      else
        target[attr] = res;
    };
  }

  // fn caller for import actions
  function importFn(attr, cb) {
    cb = Promise.method(cb);

    // For check attribute, return specific caller
    if (attr === '$check')
      return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
        // Replace first 6 arguments by
        // - old object (in context)
        // - resulting object (in context)
        Array.prototype.splice.call(arguments, 0, 6, oldCtxObj, resCtxObj);
        // Execute action with modified args
        return cb.apply(this, arguments);
      };

    // Otherwise return generic caller
    return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
      // Replace first 6 arguments by :
      // - old attribute's value
      // - new attribute's value
      // - old object
      // - new object
      Array.prototype.splice.call(arguments, 0, 6,
        oldCtxObj[attr],
        newCtxObj[attr],
        oldObj,
        newObj
      );
      // Execute action with modified args
      return cb.apply(this, arguments)
        // When it is done, modify the attribute's value properly
        .then(modifyAttrVal(attr, resCtxObj))
      ;
    };
  }

  // fn caller for export actions
  function exportFn(attr, cb) {
    cb = Promise.method(cb);

    // For check attribute, return specific caller
    if (attr === '$check')
      return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
        // Replace first 6 arguments by
        // - resulting object (in context)
        Array.prototype.splice.call(arguments, 0, 6, resCtxObj);
        // Execute action with modified args
        return cb.apply(this, arguments);
      };

    // Otherwise return generic caller
    return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
      Array.prototype.splice.call(arguments, 0, 6,
        oldCtxObj[attr],
        null,
        oldObj,
        null
      );
      // Execute action with modified args
      return cb.apply(this, arguments)
        // When it is done, modify the attribute's value properly
        .then(modifyAttrVal(attr, resCtxObj))
      ;
    };
  }

  return {
    import: importFn,
    export: exportFn,
  };
});
