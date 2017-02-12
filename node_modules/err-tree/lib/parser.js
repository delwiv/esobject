'use strict';

var _ = require('lodash');
var colorPath = require('color-path');

module.exports = function parseStack(stack) {
  var lines = stack.split(/\r?\n/);
  var regexp = /\s*at (([^ ]+)(\s+\[as ([^\]]+)\])?\s+\()?([^\[:]+):([\d]+):([\d]+)\)?/;

  return _(lines).map(function(line) {
    var match = line.match(regexp);

    if (!match)
      return false;

    return _.extend(colorPath.pathinfo(match[5]), {
      fn: match[2],
      as: match[4],
      line: +match[6],
      column: +match[7]
    });
  }).filter().value();
};
