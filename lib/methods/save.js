'use strict';

define(function(_) {
  // Save the instance into ES
  return function $save(options) {
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
    // Add ttl support
    if (this._ttl)
      config.ttl = this._ttl;

    // Put the object into the index
    return this.constructor.client.index(_.extend(this.constructor.dbConfig(config), options || {}))
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
});
