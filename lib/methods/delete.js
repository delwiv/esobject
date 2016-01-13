'use strict';

define(function(_) {
  // Delete the instance into ES
  return function $delete(options) {
    // Creates configuration
    var config = _.extend({
      id: this._id,
      parent: this._parent,
    }, options);

    // Adds version to it if there is one
    if (this._version)
      config.version = this._version;

    // Put the object into the index
    return this.constructor.client.delete(this.constructor.dbConfig(config))
      .then(function(){
        return {ok: true};
      })
    ;
  };
});
