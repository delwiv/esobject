'use strict';

define(function(_, Promise, loader, templateify) {
  function loadQuery(query) {
    return Promise.resolve(_.isString(query) ? loader.load(query) : query)
      .then(function(query) {
        return _.isFunction(query) ? query : templateify(query);
      })
    ;
  }

  return {
    loadQuery: loadQuery,

    createQueryProto: function(queryName) {
      return function(data, options) {
        // Allow to access current object easily using obj
        data = _.extend({}, data || {}, {
          obj: this, // DEPRECATED
          esobj: this,
        });

        // Execute the previously generated query callback
        return this.constructor.config[queryName + 'InstanceQuery']
          .bind(this)
          .then(function(query) {
            return this.constructor.search(query(data), options);
          })
        ;
      };
    },

    createStaticQueryProto: function(queryName) {
      return function(data, options) {
        // Execute the previously generated query callback
        return this.config[queryName + 'StaticQuery']
          .bind(this)
          .then(function(query) {
            return this.search(query(data || {}), options);
          })
        ;
      };
    },
  };
});
