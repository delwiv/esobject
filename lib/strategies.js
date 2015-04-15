'use strict';

define(function(_, Promise, callers, templates) {
  // Return a callback that will move the cuurent context down
  // one attribute when called before calling the provided callback
  function setContext(attr, cb) {
    // Construct a new method context aware
    return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
      // The resulting object should have the given context
      resCtxObj[attr] = resCtxObj[attr] || {};

      // Replace the first 6 arguments by
      // - oldObj (no context)
      // - oldCtxObj.attr
      // - newObj
      // - newCtxObj.attr
      // - resObj
      // - resCtxObj
      Array.prototype.splice.call(arguments, 0, 6,
        oldObj,
        (oldCtxObj || {})[attr] || {},
        newObj,
        (newCtxObj || {})[attr] || {},
        resObj,
        resCtxObj[attr]
      );

      // Execute the callback with the modified arguments
      return cb.apply(this, arguments);
    };
  }

  // Generate a list of callbacks that will execute the described actions
  // (using the provided callers to properly handle contexts)
  function generateActions(actions, fnCaller, tplCaller) {
    // This array will be populated with each action methods to execute
    var resAcc = [];

    // This action will be populated by the checking function if it exists
    // (it NEEDS to be executed LAST)
    var checkAction = null;

    // For each action described in the definition object
    _.forOwn(actions, function(action, attr) {
      // If the action is a checker, define the checkAction variable with the
      // proper callback to execute it
      if (attr === '$check')
        checkAction = fnCaller(attr, action);
      // If action's value is "undefined", add an action that destroys the attribute
      // from the resulting object to the list of actions
      else if (_.isUndefined(action))
        resAcc.push(function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          delete resCtxObj[attr];
        });
      // If the action's value is a function, add an action that executes the function
      // with the provided function caller & allow async processing
      else if (_.isFunction(action))
        resAcc.push(fnCaller(attr, action));
      // If the action's value is an object, generate a callback that will handle each
      // subaction by calling ourselve recursively, and add it to the action's list
      // after insuring context is changed before its execution
      else if (_.isObject(action))
        resAcc.push(setContext(attr, generateActions(action, fnCaller, tplCaller)));
      // If it is a string, adds a template action to the list
      else if (_.isString(action))
        resAcc.push(tplCaller(attr, action));
      // Otherwise, add a function returning the value to the list
      else
        resAcc.push(function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          resCtxObj[attr] = action;
        });
    });

    // Return a callback that will execute properly each action
    return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
      // Set args here to be able to access it from lower scopes
      var args = arguments;

      // Execute every actions, resulting in an array of promises
      var promises = resAcc.map(function(action) {
        return action.apply(this, args);
      }, this);

      // Wait for all promises to be resolved
      // the || [true] insure a promise is created & immediately resolved
      // when there is no action
      return Promise.all(promises)
        // Then execute the checkAction if there is one
        .then(function() {
          if (!checkAction)
            return;
          return checkAction.apply(this, args);
        })
        // Then return the resulting object
        .then(function() {
          return resObj;
        })
      ;
    };
  }

  // Create a callback that will handle actions described
  // (using the provided callers to properly handle contexts)
  // Note: this is only a helper around generateActions
  function createActions(actions, fnCaller, tplCaller) {
    // Generate an action callback handling each action's description
    var actionFn = generateActions(actions, fnCaller, tplCaller);

    // Return a callback that will execute properly each action
    return function(oldObj, newObj, resObj) {
      // Replace the first 3 arguments by 6 (doubling each one)
      // (right now, each object & context are the same thing)
      Array.prototype.splice.call(arguments, 0, 3,
        oldObj,
        oldObj,
        newObj,
        newObj,
        resObj,
        resObj
      );

      // Execute all actions
      return actionFn.apply(this, arguments);
    };
  }

  function strategy(name) {
    return function(strategy) {
      return createActions(strategy, callers[name], templates[name]);
    };
  }

  return {
    import: strategy('import'),
    export: strategy('export'),
  };
});
