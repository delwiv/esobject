'use strict';

define(function(_) {
  // Better printing using console.log()
  return function $inspect() {
    return _.extend({}, _.omit(_.pick(this, ['_id', '_version', '_parent', '_ttl']), _.isUndefined), this);
  };
});
