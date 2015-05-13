'use strict';

define(function(_) {
  function getValue(name) {
    return function(values) {
      return {
        value: values[name],
        writable: true,
      };
    };
  }

  var properties = {
    _id: getValue('id'),
    _version: getValue('version'),
    _parent: getValue('parent'),
    _ttl: getValue('ttl'),
  };

  var privateNames = _.keys(properties);

  return {
    privateNames: privateNames,
    optionalPrivateNames: _.difference(privateNames, ['_id', '_parent']),
    compute: function(values) {
      return _.mapValues(properties, function(creator) {
        return creator(values);
      });
    },
  };
});
