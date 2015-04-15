'use strict';

define(function(_, util) {
  // Better printing using console.log()
  return function $inspect(depth) {
    return util.inspect(
      _.extend(
        {},
        _.omit(_.pick(this, ['_id', '_version', '_parent', '_ttl']), _.isUndefined),
        this
      ),
      {depth: depth}
    );
  };
});
