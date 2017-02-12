'use strict';

var _ = require('lodash');
var errors = require('../errors');

module.exports.default = require('./default');
module.exports.i18next = require('./i18next');

module.exports.get = function get(name, options) {
  if (!(name in module.exports))
    throw new errors.ErrtreeError('Invalid message handler (' + name + ')');
  if (options && !_.isObject(options))
    throw new errors.ErrtreeError('Options parameter should be an object');
  return module.exports[name](options);
};
