'use strict';

define(function(_, Promise, $initInstance, properties) {
  return function $search(query, options) {
    query.version = true;
    query.fields = _.union(query.fields || [], properties.privateNames, ['_source']);

    // Do the query
    return this.client.search(_.extend(this.dbConfig({body: query}), options))
      .then(function(res) {
        // Create each instances
        var objects = _.map(res.hits.hits, _.partial($initInstance, this));

        Object.defineProperty(objects, 'elements', {
          get: function() {
            console.error('.elements is deprecated… search() now returns an array…');
            console.trace();
            return objects;
          },
        });

        return _.extend(objects, {
          // Creates a new exported array (each instance exported)
          export: function() {
            var args = arguments;

            // Map each element of the array to its exported value
            return Promise.map(this, function(val) {
              return val.export.apply(val, args);
            });
          },
          total: res.hits.total,
          aggregations: res.aggregations,
        });
      }.bind(this))
    ;
  };
});
