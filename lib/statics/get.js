'use strict';

define(function(_, $initInstance) {
  // Gets element with given id in ES and creates an instance with it
  return function $get(id) {
    // Do the query to ES
    return this.client.get(this.dbConfig({id: id, fields: ['_id', '_source', '_parent', '_ttl']}))
      // Creates an instance with the response
      .then(_.partial($initInstance, this))
    ;
  };
});
