'use strict';

define(function(_, util, properties) {
  // Better printing using console.log()
  return function $inspect(depth) {
    return util.inspect(
      _.extend(
        {},
        _.omit(_.pick(this, properties.privateNames), _.isUndefined),
        this
      ),
      {depth: depth}
    );
  };
});
