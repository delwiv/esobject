'use strict';

define(function(_) {
  function templateify(obj) {
    if (!_.isObject(obj))
      throw new Error('A query should be either an object or a function');

    var initialValue = function() {
      return {};
    };

    if (_.isArray(obj)) {
      initialValue = function() {
        return [];
      };
    }

    return _.reduce(obj, function(handlePrevious, val, attr) {
      attr = _.template(attr);
      if (_.isString(val))
        val = _.template(val);
      else if (_.isObject(val))
        val = templateify(val);
      else
        val = _.constant(val);

      return function(data) {
        var res = handlePrevious(data);
        res[attr(data)] = val(data);
        return res;
      };
    }, initialValue);
  }

  return templateify;
});
