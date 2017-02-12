'use strict';

var _ = require('lodash');
var util = require('util');
var multimatch = require('multimatch');

var assert = require('./assert');

var BasicError;
var ErrtreeError;

var knownOptions = [
  'defaultCode',
  'defaultNs',
  'selectExerpt',
  'messageHandler',
  'beautifier'
];

function fnMaker(name, code) {
  if (!name.match(/^[A-Za-z_$][\w$]*$/))
    throw new ErrtreeError('Invalid Error parameter: invalid name "' + name + '"');

  // jshint -W054
  return (new Function(
    'code',
    'return function ' + name + '() { return code.apply(this, arguments); }'
  ))(code);
  // jshint +W054
}

module.exports.makeError = module.exports.errTree = function errTree(Error, BaseError, options) {
  if (arguments.length === 2 && !_.isFunction(BaseError) && _.isObject(BaseError)) {
    options = BaseError;
    BaseError = null;
  }
  BaseError = BaseError || BasicError;
  options = options || {};

  if (_.isString(Error))
    Error = fnMaker(Error, function() {
      BaseError.apply(this, arguments);
    });
  else if (!_.isFunction(Error))
    throw new ErrtreeError('Invalid Error parameter: expected a string or a named function');
  else if (!Error.name)
    throw new ErrtreeError('Invalid Error parameter: expected a named function (an anonymous function was provided)');

  if (BaseError !== BasicError &&
    (!_.isFunction(BaseError) || !BaseError.prototype || !(BaseError.prototype instanceof BasicError)))
    throw new ErrtreeError('Invalid BaseError parameter: a constructor inheriting from BasicError is expected');

  if (!_.isObject(options))
    throw new ErrtreeError('Invalid options parameter: expected an object');

  var unknownOptions = _.difference(_.keys(options), knownOptions);
  if (unknownOptions.length)
    throw new ErrtreeError('Invalid options parameter: unknown option(s) [' + unknownOptions.join(', ') + '].');

  if (options.selectExerpt) {
    if (_.isNumber(options.selectExerpt)) {
      options.selectExerpt = (function(oldVal) {
        return function(ctx, pos) {
          return ctx.dirname && oldVal === pos;
        };
      })(options.selectExerpt);
    }
    else if (_.isString(options.selectExerpt) || _.isArray(options.selectExerpt)) {
      if (!_.isArray(options.selectExerpt))
        options.selectExerpt = [options.selectExerpt];
      var patterns = options.selectExerpt;
      options.selectExerpt = function(ctx) {
        if (patterns.length && patterns[0][0] === '!')
          patterns.unshift('**');
        return ctx.dirname && multimatch([ctx.path], patterns).length;
      };
    }
  }

  util.inherits(Error, BaseError);
  _.extend(Error.prototype, options);
  Error.assert = assert.createAssert(Error);

  return Error;
};

BasicError = require('./basic-error').BasicError;
ErrtreeError = require('./errors').ErrtreeError;
