'use strict';

const _ = require('lodash');

module.exports.addTotal = raw => raw ? raw + ' total' : undefined;
module.exports.simple = (old, raw) => _.isUndefined(raw) ? old : raw;
module.exports.user = function(/*! options$user */ user) { // eslint-disable-line spaced-comment
  return user;
};
module.exports.inlineSub = {test: _.constant('toto')};
module.exports.checkTest = function(res) {
  console.log('check:', require('util').inspect(res, {colors: true, depth: null}));
};
module.exports.dropTest = function(res) {
  return _.filter(res || [], elt => !elt.test);
};
module.exports.returnUndefined = function() {
};
