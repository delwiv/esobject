'use strict';

define(function(_, Promise, $initInstance, properties) {
  return function $search(query) {
    query.version = true;
    query.fields = _.union(query.fields || [], properties.privateNames, ['_source']);

    // Do the query
    return this.client.search(this.dbConfig({body: query}))
      .bind(this)
      .then(function(res) {
        // Create each instances
        var objects = _.map(res.hits.hits, _.partial($initInstance, this));

        // Creates a new exported array (each instance exported)
        objects.export = function() {
          // Map each element of the array to its exported value
          return Promise.map(this, function(val) {
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
});
