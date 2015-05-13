'use strict';

define(function(_, $initInstance, properties) {
  // Gets element with given id in ES and creates an instance with it
  return function $get(id, options) {
    options = _.extend({}, options || {}, {
      id: id,
      fields: properties.privateNames.concat('_source'),
    });

    // Do the query to ES
    return this.client.get(this.dbConfig(options))
      // Creates an instance with the response
      .then(_.partial($initInstance, this))
    ;
  };
});
