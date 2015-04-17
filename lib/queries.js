'use strict';

define(function(_, Promise, loader) {
  function queryfy(obj) {
    if (!_.isObject(obj))
      throw new Error('A query should be either an object or a function');

    return _.reduce(obj, function(handlePrevious, val, attr) {
      attr = _.template(attr, {variable: 'data'});
      if (_.isString(val))
        val = _.template(val, {variable: 'data'});
      else if (_.isObject(val))
        val = queryfy(val);
      else
        val = _.constant(val);

      return function(data) {
        var res = handlePrevious(data);
        res[attr(data)] = val(data);
        return res;
      };
    }, _.constant({}));
  }

  function loadQuery(query) {
    return Promise.resolve(_.isString(query) ? loader.load(query) : query)
      .then(function(query) {
        return _.isFunction(query) ? query : queryfy(query);
      })
    ;
  }

  return {
    loadQuery: loadQuery,

    createQueryProto: function(queryName) {
      return function(data) {
        // Allow to access current object easily using obj
        data = _.extend({}, data || {}, {obj: this});

        // Execute the previously generated query callback
        return this.constructor.config[queryName + 'InstanceQuery']
          .bind(this)
          .then(function(query) {
            return this.constructor.search(query(data));
          })
        ;
      };
    },

    createStaticQueryProto: function(queryName) {
      return function(data) {
        // Execute the previously generated query callback
        return this.config[queryName + 'StaticQuery']
          .bind(this)
          .then(function(query) {
            return this.search(query(data || {}));
          })
        ;
      };
    },
  };
});
