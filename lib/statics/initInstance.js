'use strict';

define(function(_) {
  // Init instance creates a new Class & import attributes from
  // an abject retrieved from ES in it
  return function initInstance(Class, esObj) {
    // New class (provide the object's id & version)
    var obj = new Class(esObj._id, esObj._version);

    if (esObj._parent || (esObj.fields && esObj.fields._parent))
      obj._parent = esObj._parent || esObj.fields._parent;

    if (esObj._ttl || (esObj.fields && esObj.fields._ttl))
      obj._ttl = esObj._ttl || esObj.fields._ttl;

    // For each source's attributes, copy it to the new instance
    _.forOwn(esObj._source, function(val, key) {
      obj[key] = val;
    });

    // Return the new instance
    return obj;
  };
});
