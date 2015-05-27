'use strict';

define(function(_, Promise) {
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

  // This method knows how to assign a value in the resulting object
  function assignData(type, attr, value) {
    return value === undefined ?
      function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
        if ((Object.getOwnPropertyDescriptor(resCtxObj, attr) || {configurable: true}).configurable)
          delete resCtxObj[attr];
        else
          resCtxObj[attr] = undefined;
      } :
      function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
        resCtxObj[attr] = value;
      }
    ;
  }

  // All supported actions are listed here
  var actions = {
    $check: {
      priority: 1,
      test: function(attr, action) {
        return attr === '$check';
      },
      all: function(type, attr, action, fnCaller, tplCaller) {
        return fnCaller(attr, action);
      },
    },
    function: {
      test: function(attr, action) {
        return _.isFunction(action);
      },
      all: function(type, attr, action, fnCaller) {
        return fnCaller(attr, action);
      },
    },
    $objAttr: {
      continue: true,
      test: function(attr, action) {
        return _.isObject(action) && action.$objAttr;
      },
      all: function(type, attr, action) {
        return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          resCtxObj[attr] = _.reduce(action.$objAttr.split('.'), function(acc, attr) {
            return (acc || {})[attr];
          }, oldObj);
        };
      },
    },
    $rawAttr: {
      continue: true,
      test: function(attr, action) {
        return _.isObject(action) && action.$rawAttr;
      },
      import: function(type, attr, action) {
        return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          resCtxObj[attr] = _.reduce(action.$rawAttr.split('.'), function(acc, attr) {
            return (acc || {})[attr];
          }, newObj);
        };
      },
    },
    $idtrue: {
      continue: true,
      test: function(attr, action) {
        return _.isObject(action) && action.$id === true;
      },
      import: function(type, attr, action) {
        return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          assignData(type, attr, newCtxObj[attr]).apply(this, arguments);
        };
      },
      export: function(type, attr, action) {
        return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          assignData(type, attr, oldCtxObj[attr]).apply(this, arguments);
        };
      },
    },
    $idkeepold: {
      name: '$id: keepold',
      continue: true,
      test: function(attr, action) {
        return _.isObject(action) && action.$id === 'keepold';
      },
      import: function(type, attr, action) {
        return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          assignData(type, attr, newCtxObj[attr] || oldCtxObj[attr]).apply(this, arguments);
        };
      },
    },
    $all: {
      continue: true,
      test: function(attr, action) {
        return _.isObject(action) && _.isObject(action.$all);
      },
      all: function(type, attr, action, fnCaller, tplCaller) {
        var subAction = generateActions(type, action.$all, fnCaller, tplCaller);
        return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          var args = arguments;

          var throughObj = type === 'import' ? newCtxObj : resCtxObj;

          if(!(throughObj || {})[attr]) {
            delete resCtxObj[attr];
            return;
          }

          var goThrough = _.isArray(throughObj[attr]) ? Promise.map : function() {
            return Promise.props(_.mapValues.apply(_, arguments));
          };

          return goThrough(throughObj[attr], function(val, index) {
            return setContext(attr, setContext(index, subAction)).apply(this, args);
          }, this);
        };
      },
    },
    $default: {
      continue: true,
      test: function(attr, action) {
        return _.isObject(action) && !!action.$default;
      },
      all: function(type, attr, action, fnCaller, tplCaller) {
        var defaultValue = processAction(type, attr, action.$default, fnCaller, tplCaller).execute;
        return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          if (!_.isUndefined(resCtxObj[attr]))
            return;
          return defaultValue.apply(this, arguments);
        };
      },
    },
    $unknown: {
      test: function(attr, action) {
        return _.isObject(action) && _.any(action, function(val, attr) {
          return attr[0] === '$';
        });
      },
      all: function(type, attr, action) {
        var offensive = _.find(_.keys(action), function(attr) {
          return attr[0] === '$';
        });
        throw new Error('strategy ' + offensive + ' either does not exists or does not support ' + action[offensive]);
      },
    },
    object: {
      test: function(attr, action) {
        return _.isObject(action);
      },
      all: function(type, attr, action, fnCaller, tplCaller) {
        return setContext(attr, generateActions(type, action, fnCaller, tplCaller));
      },
    },
    template: {
      test: function(attr, action) {
        return _.isString(action);
      },
      all: function(type, attr, action, fnCaller, tplCaller) {
        return tplCaller(attr, action);
      },
    },
    value: {
      test: function(attr, action) {
        return true;
      },
      all: assignData,
    },
  };

  // Used to generate error messages when using an unavailable strategy
  function defaultDescriptor(type, actionDescriptor) {
    return function() {
      throw new Error(actionDescriptor.name + ' is not available in ' + type + ' strategies…');
    };
  }

  // Transform an action description into the corresponding function
  function processAction(type, attr, action, fnCaller, tplCaller) {
    return _.reduce(actions, function(acc, actionDescriptor, actionName) {
      var isMatching = actionDescriptor.test(attr, action);

      if (!isMatching) {
        acc.canContinue = !acc.agglomerated || acc.canContinue && actionDescriptor.continue;
        return acc;
      }

      if (!acc.canContinue || acc.agglomerated && !actionDescriptor.continue)
        return acc;

      ++acc.agglomerated;

      acc.canContinue = actionDescriptor.continue;

      if (_.isUndefined(acc.priority))
        acc.priority = actionDescriptor.priority || 0;

      if ((actionDescriptor.priority || 0) !== acc.priority)
        throw new Error('Agglomerating actions of different priorities is not supported!');

      var prevExecute = acc.execute;
      var currentExecute = (
        actionDescriptor[type] ||
          actionDescriptor.all ||
          defaultDescriptor(type, actionDescriptor)
      )(type, attr, action, fnCaller, tplCaller);

      acc.execute = function() {
        return prevExecute.apply(this, arguments)
          .bind(this)
          .return(_.toArray(arguments))
          .spread(currentExecute)
        ;
      };

      return acc;
    }, {
      execute: function() {
        return Promise.resolve();
      },
      agglomerated: 0,
      canContinue: true,
    });
  }

  // Generate a callback that will execute the described actions
  // (using the provided callers to properly handle contexts)
  function generateActions(type, actions, fnCaller, tplCaller) {
    var execute = _(actions)
      // Create a method for each actions
      .map(function(action, attr) {
        return processAction(type, attr, action, fnCaller, tplCaller);
      })
      // Group them by priority
      .groupBy('priority')
      // Sort each group with its priority
      .sortBy(function(val, attr) {
        return +attr;
      })
      // Execute each action in a group in parallel and each group sequencally
      .reduce(function(prevGroups, priorityGroup) {
        // Reduce the group into a big parrallel execution function
        priorityGroup = _.reduce(priorityGroup, function(prevActions, action) {
          return function() {
            // Execute previous actions in parrallel to this one
            return Promise.join(
              prevActions.apply(this, arguments),
              action.execute.apply(this, arguments),
              _.noop
            );
          }
        }, Promise.resolve);

        // Return a function executing the previous groups and then the current one
        return function() {
          return prevGroups.apply(this, arguments)
            .bind(this)
            .return(_.toArray(arguments))
            .spread(priorityGroup)
          ;
        }
      }, Promise.resolve)
    ;

    // Execute all actions in the correct order before returning the resulting object
    return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
      return execute.apply(this, arguments)
        .return(resObj)
      ;
    };
  }

  // Create a callback that will handle actions described
  // (using the provided callers to properly handle contexts)
  // Note: this is only a helper around generateActions
  function createActions(type, actions, fnCaller, tplCaller) {
    // Generate an action callback handling each action's description
    var actionFn = generateActions(type, actions, fnCaller, tplCaller);

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

  return {
    create: createActions,
  };
});
