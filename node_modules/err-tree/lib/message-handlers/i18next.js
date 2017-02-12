'use strict';

var _ = require('lodash');
var i18next;

var errors = require('../errors');

function i18nextMessageHandler(err) {
  err.strCode = err.message;
  var ns = err.ns ? err.ns.split(':') : [];
  var keys = [];
  var i;
  for (i = ns.length; i >= 0; --i)
    keys.push(ns.slice(0, i).concat(err.name, err.strCode).join('.'));
  for (i = ns.length; i >= 0; --i)
    keys.push(ns.slice(0, i).concat(err.strCode).join('.'));

  var options = _.extend({}, err.data, {
    ns: 'errors',
    err: {
      name: err.name,
      ns: err.ns,
      code: err.code,
      strCode: err.strCode
    },
    data: err.data,
    defaultValue: '',
    context: process.env.NODE_ENV === 'production' ? null : 'dev'
  });

  var res;
  _.each(keys, function(key) {
    res = i18next.t(key, options);
    return !res;
  });

  return res || i18next.t('key_not_found', options);
}

module.exports = function(options) {
  if (!options)
    throw new errors.ErrtreeError('The options parameter is required to activate the i18next message handler');
  else if (!_.isObject(options))
    throw new errors.ErrtreeError('Invalid options parameter: it should be an object');
  else if (!options.i18next || !options.i18next.init)
    throw new errors.ErrtreeError('Invalid options.i18next: please provide a valid instance of i18next');
  i18next = options.i18next;

  return i18nextMessageHandler;
};
