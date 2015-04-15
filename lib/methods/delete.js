'use strict';

define(function() {
  // Delete the instance into ES
  return function $delete() {
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
});
