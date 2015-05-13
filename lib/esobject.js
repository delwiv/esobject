'use strict';

define(function(_, util, elasticsearch, strategies, methods, statics, mappings, queries, properties) {
  // Basic ESObject constructor
  var ESObject = function(id, version) {
    if (this.constructor === ESObject)
      throw new Error('You should not create ESOBjects directly');

    // Add hidden _id & _version attributes to the object
    Object.defineProperties(this, properties.compute({id: id, version: version}));
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
          exportExportStrategy: descrObj.export && strategies.export(descrObj.export),
          // import actions generated in a callback
          importImportStrategy: descrObj.import && strategies.import(descrObj.import),
        },
      },
      client: {
        value: descrObj.db.client || new elasticsearch.Client(descrObj.db),
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

    // Return the newly created Class with its static methods
    _.extend(Class, statics, function(oldVal, newVal) {
      return _.isFunction(newVal) ? newVal.bind(Class) : (newVal || oldVal);
    });

    // Handle named import strategies
    _.each(descrObj.imports || {}, function(strategy, name) {
      Class.config[name + 'ImportStrategy'] = strategies.import(strategy);
      Class.prototype[name] = strategies.createImportProto(name);
    });

    // Handle named export strategies
    _.each(descrObj.exports || {}, function(strategy, name) {
      Class.config[name + 'ExportStrategy'] = strategies.export(strategy);
      Class.prototype[name] = strategies.createExportProto(name);
    });

    // Handle static queries
    _.each((descrObj.queries || {}).static || {}, function(query, name) {
      Class.config[name + 'StaticQuery'] = queries.loadQuery(query);
      Class[name] = queries.createStaticQueryProto(name);
    });

    // Handle instances queries
    _.each((descrObj.queries || {}).instance || {}, function(query, name) {
      Class.config[name + 'InstanceQuery'] = queries.loadQuery(query);
      Class.prototype[name] = queries.createQueryProto(name);
    });

    return Class;
  };

  ESObject.loadMapping = mappings.loadMapping;

  // Add instance methods to the ESObject prototype
  _.extend(ESObject.prototype, methods);

  return ESObject;
});
