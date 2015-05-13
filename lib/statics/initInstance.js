'use strict';

define(function(_, properties) {
  // Init instance creates a new Class & import attributes from
  // an abject retrieved from ES in it
  return function initInstance(Class, esObj) {
    // New class (provide the object's id & version)
    var obj = new Class(esObj._id, esObj._version);

    _.each(properties.optionalPrivateNames, function(name) {
      if (esObj[name] || (esObj.fields && esObj.fields[name]))
        obj[name] = esObj[name] || esObj.fields[name];
    });

    // For each source's attributes, copy it to the new instance
    _.extend(obj, esObj._source);

    // Return the new instance
    return obj;
  };
});
