'use strict';

define(function(_, Promise, callers, templates) {
  // Return a callback that will move the cuurent context down
  // one attribute when called before calling the provided callback
  function setContext(attr, cb) {
    // Construct a new method context aware
    return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
      // The resulting object should have the given context
      resCtxObj[attr] = resCtxObj[attr] || (_.isArray((newCtxObj || {})[attr]) ? [] : {});

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

  // Transform an action description into the corresponding function
  function processAction(attr, action, fnCaller, tplCaller) {
    if (attr === '$check')
      return _.noop;
    // If action's value is "undefined", add an action that destroys the attribute
    // from the resulting object to the list of actions
    else if (_.isUndefined(action))
      return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
        delete resCtxObj[attr];
      };
    // If the action's value is a function, add an action that executes the function
    // with the provided function caller & allow async processing
    else if (_.isFunction(action))
      return fnCaller(attr, action);
    // If the action's value is an object, generate a callback that will handle each
    // subaction by calling ourselve recursively, and add it to the action's list
    // after insuring context is changed before its execution
    else if (_.isObject(action)) {
      if (action.$id) {
        switch(action.$id) {
        case 'keepold':
          return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
            resCtxObj[attr] = newCtxObj[attr] || oldCtxObj[attr];
            if (resCtxObj[attr] === undefined)
              delete resCtxObj[attr];
          };
        default:
          return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
            resCtxObj[attr] = newCtxObj[attr];
            if (resCtxObj[attr] === undefined)
              delete resCtxObj[attr];
          };
        }
      }
      else if (action.$all) {
        var subAction = generateActions(action.$all, fnCaller, tplCaller);
        return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          var args = arguments;

          if(!(newCtxObj || {})[attr]) {
            delete resCtxObj[attr];
            return;
          }

          var goThrough = _.isArray(newCtxObj[attr]) ? Promise.map : function() {
            return Promise.props(_.mapValues.apply(_, arguments));
          };

          return goThrough(newCtxObj[attr], function(val, index) {
            return setContext(attr, setContext(index, subAction)).apply(this, args);
          }, this);
        };
      }
      return setContext(attr, generateActions(action, fnCaller, tplCaller));
    }
    // If it is a string, adds a template action to the list
    else if (_.isString(action))
      return tplCaller(attr, action);
    // Otherwise, add a function returning the value to the list
    else
      return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
        resCtxObj[attr] = action;
      };
  }

  // Handle $check actions
  function handleCheck(actions, execute, fnCaller) {
    if (!actions.$check)
      return execute;

    var checkAction = fnCaller('$check', actions.$check);
    return function() {
      return execute.apply(this, arguments)
        .bind(this)
        .return(_.toArray(arguments))
        .spread(checkAction)
      ;
    };
  }

  // Generate a callback that will execute the described actions
  // (using the provided callers to properly handle contexts)
  function generateActions(actions, fnCaller, tplCaller) {
    // Handle generic actions
    var execute = _.reduce(actions, function(prevActions, action, attr) {
      action = processAction(attr, action, fnCaller, tplCaller);
      return function() {
        return Promise.join(
          prevActions.apply(this, arguments),
          action.apply(this, arguments),
          _.noop
        );
      };
    }, function() {
      return Promise.resolve();
    });

    // Handle $check
    execute = handleCheck(actions, execute, fnCaller);

    // Global
    return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
      return execute.apply(this, arguments)
        .return(resObj)
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

    createImportProto: function(importName) {
      // Import merges attributes from a plain object into the instance
      return function $import(plainObj) {
        // oldObj is a deep clone of our object + non enumerable attributes
        // copied over
        var oldObj = _.cloneDeep(this);
        oldObj._id = this._id;
        oldObj._version = this._version;
        oldObj._parent = this._parent;
        oldObj._ttl = this._ttl;

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
