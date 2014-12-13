'use strict';

define(function(_, Promise, util, elasticsearch) {
  // Non exposed functions / values are stored in this object
  var internal = {
    // Return a method that will modify attr in target with its given value
    // Note: if value is undefined, attribute will be deleted from target
    modifyAttrVal: function(attr, target) {
      return function(res) {
        // If value is undefined, delete the attribute
        if (res === undefined)
          delete target[attr];
        // Otherwise, store the new value in the res object
        else
          target[attr] = res;
      };
    },

    /** Action callers (method calling actions with proper arguments) **/

    // fn caller for import actions
    importFnCaller: function(attr, cb) {
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
        .then(internal.modifyAttrVal(attr, resCtxObj));
      };
    },

    // fn caller for export actions
    exportFnCaller: function(attr, cb) {
      // For check attribute, return specific caller
      if (attr === '$check')
        return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
          // Replace first 6 arguments by
          // - resulting object (in context)
          Array.prototype.splice.call(arguments, 0, 6, resCtxObj);
          // Execute action with modified args
          return cb.apply(this, arguments);
        };
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
        .then(internal.modifyAttrVal(attr, resCtxObj));
      };
    },

    // Template caller for import actions
    importTplCaller: function(attr, cb) {
      return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
        // Call the template function defining the following attributes:
        // - oldObj (not in context)
        // - newObj (not in context)
        resCtxObj[attr] = cb({
          obj: oldObj,
          raw: newObj,
        });
      };
    },

    // Template caller for export actions
    exportTplCaller: function(attr, cb) {
      return function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
        // Call the template function using the old obj (not in context)
        // as namespace
        resCtxObj[attr] = cb(oldObj);
      };
    },

    // Return a callback that will move the cuurent context down
    // one attribute when called before calling the provided callback
    setContext: function(attr, cb) {
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
    },

    // Generate a list of callbacks that will execute the described actions
    // (using the provided callers to properly handle contexts)
    generateActions: function(actions, fnCaller, tplCaller) {
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
          checkAction = fnCaller(attr, Promise.method(action));
        // If action's value is "undefined", add an action that destroys the attribute
        // from the resulting object to the list of actions
        else if (_.isUndefined(action))
          resAcc.push(function(oldObj, oldCtxObj, newObj, newCtxObj, resObj, resCtxObj) {
            delete resCtxObj[attr];
          });
        // If the action's value is a function, add an action that executes the function
        // with the provided function caller & allow async processing
        else if (_.isFunction(action))
          resAcc.push(fnCaller(attr, Promise.method(action)));
        // If the action's value is an object, generate a callback that will handle each
        // subaction by calling ourselve recursively, and add it to the action's list
        // after insuring context is changed before its execution
        else if (_.isObject(action))
          resAcc.push(internal.setContext(attr, internal.generateActions(action, fnCaller, tplCaller)));
        // Otherwise, adds a template action to the list
        else
          resAcc.push(tplCaller(attr, _.template(action)));
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
        });
      };
    },

    // Create a callback that will handle actions described
    // (using the provided callers to properly handle contexts)
    // Note: this is only a helper around generateActions
    createActions: function(actions, fnCaller, tplCaller) {
      // Generate an action callback handling each action's description
      var actionFn = internal.generateActions(actions, fnCaller, tplCaller);

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
    },
  };

  // Basic ESObject constructor
  var ESObject = function(id, version) {
    // Add hidden _id & _version attributes to the object
    Object.defineProperties(this, {
      _id: {
        value: id,
        writable: true,
      },
      _version: {
        value: version,
        writable: true,
      },
      _parent: {
        value: undefined,
        writable: true,
      },
    });
  };

  // Creates a specific Object from a description
  ESObject.create = function(descrObj) {
    // Ctor of the new type of element
    function Class() {
      // Call the parent's ctor
      ESObject.apply(this, arguments);
    }

    // Class inherits from ESObject
    util.inherits(Class, ESObject);

    // Add a hidden & write protected config attribute to Class
    // that contain the original description object
    // and actions processed into callbacks
    Object.defineProperties(Class, {
      config: {
        enumerable: true,

        value: {
          // original description object
          descr: descrObj,
          // export actions generated in a callback
          export: internal.createActions(
            descrObj.export,
            internal.exportFnCaller,
            internal.exportTplCaller
          ),
          // import actions generated in a callback
          import: internal.createActions(
            descrObj.import,
            internal.importFnCaller,
            internal.importTplCaller
          ),
        },
      },
      client: {
        value: new elasticsearch.Client(descrObj.db),
      },
      dbConfig: {
        value: function(params) {
          return _.defaults(params, {
            index: descrObj.db.index,
            type: descrObj.db.type
          });
        }
      }
    });

    // Init instance creates a new Class & import attributes from
    // an abject retrieved from ES in it
    function initInstance(esObj) {
      // New class (provide the object's id & version)
      var obj = new Class(esObj._id, esObj._version);

      if (esObj._parent || (esObj.fields && esObj.fields._parent))
        obj._parent = esObj._parent || esObj.fields._parent;

      // For each source's attributes, copy it to the new instance
      _.forOwn(esObj._source, function(val, key) {
        obj[key] = val;
      });

      // Return the new instance
      return obj;
    }

    // Gets element with given id in ES and creates an instance with it
    Class.get = function(id) {
      // Do the query to ES
      return Class.client.get(Class.dbConfig({id: id, fields: ['_id', '_source', '_parent']}))
        // Creates an instance with the response
        .then(initInstance)
      ;
    };

    // Search instances in ES that match the given query and return an
    // array of instances (with an extra export method added to it)
    Class.search = function(query) {
      query.fields = query.fields || [];
      query.fields.push('_id', '_source', '_parent');

      // Do the query
      return Class.client.search(Class.dbConfig({body: query}))
        .then(function(res) {
          // Create each instances
          var objects = _.map(res.hits.hits, initInstance);

          // Creates a new exported array (each instance exported)
          objects.export = function() {
            // Creates a promise with the array
            return Promise.resolve(this)
            // Map each element of the array to its exported value
            .map(function(val) {
              return val.export();
            });
          };

          return {
            total: res.hits.total,
            elements: objects,
            aggregations: res.aggregations,
          };
        })
      ;
    };

    // Return the newly created Class
    return Class;
  };

  // Import merges attributes from a plain object into the instance
  ESObject.prototype.import = function(plainObj) {
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

  // Export creates a safe plain object from this instance to use in APIs
  ESObject.prototype.export = function() {
    // plainObj is a deep clone of this with version copied over
    var plainObj = _.cloneDeep(this);
    plainObj._version = this._version;

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

  // Save the instance into ES
  ESObject.prototype.save = function() {
    // Creates configuration
    var config = {id: this._id, body: this};
    // Adds version to it if there is one
    if (this._version)
      config.version = this._version;
    else
      config.opType = 'create';
    // Adds parent to it if there is one
    if (this._parent)
      config.parent = this._parent;

    // Put the object into the index
    return this.constructor.client.index(this.constructor.dbConfig(config))
      .bind(this)
      // Aferward...
      .then(function(val) {
        // Copy over the new id of our object if needed
        if (!this._id)
          this._id = val._id;
        // Copy over the new version of our object
        this._version = val._version;
        // Return our object
        return this;
      })
    ;
  };

  // Save the instance into ES
  ESObject.prototype.delete = function() {
    // Creates configuration
    var config = {
      id: this._id,
      parent: this._parent,
    };
    // Adds version to it if there is one
    if (this._version)
      config.version = this._version;

    // Put the object into the index
    return this.constructor.client.delete(this.constructor.dbConfig(config))
      .return({ok: true})
    ;
  };

  return ESObject;
});
