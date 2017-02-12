'use strict';

var _ = require('lodash');
var util = require('util');
var parseStack = require('./parser');
var defaultBeautifier = require('./beautifiers/default');
var defaultMessageHandler = require('./message-handlers/default');
var fileExerpt = require('./file-exerpt');

var BasicError = module.exports.BasicError = function BasicError(ns, message, code, data, devData) {
  if (!_.isString(message)) {
    devData = data;
    data = code;
    code = message;
    message = ns;
    ns = null;
  }
  if (!_.isNumber(code)) {
    devData = data;
    data = code;
    code = null;
  }
  Error.apply(this, arguments);

  this.name = this.constructor.name;
  this.ns = ns;
  if (!this.ns && this.ns !== '')
    this.ns = this.defaultNs || '';
  this.message = message;
  this.code = code || this.defaultCode || 500;
  this.data = data || {};

  if (process.env.NODE_ENV !== 'production')
    _.merge(this.data, devData || {});

  BasicError.captureStackTrace(this, this.constructor);

  this.message = this.messageHandler(this);

  this.toString();
};
util.inherits(BasicError, Error);
function setRendererGetterSetter(prototype, name) {
  Object.defineProperty(prototype, name, {
    enumerable: true,
    get: function() {
      return this['$' + name];
    },
    set: function(value) {
      Object.defineProperty(this, '$' + name, {
        configurable: true,
        value: value
      });
      if (!this.parsedStack)
        return;
      Object.defineProperty(this, 'stack', {
        enumerable: true,
        configurable: true,
        get: function() {
          this.stack = this.beautifier(this);
          return this.stack;
        },
        set: function(value) {
          Object.defineProperty(this, 'stack', {
            enumerable: true,
            configurable: true,
            writable: true,
            value: value
          });
        }
      });
      return value;
    }
  });
}

var setRendererGetterSetters = module.exports.setRendererGetterSetters = function setRendererGetterSetters(prototype) {
  _.each(
    ['ns', 'message', 'code', 'parsedStack'],
    _.partial(setRendererGetterSetter, prototype)
  );
};
setRendererGetterSetters(BasicError.prototype);

BasicError.prototype.toString = BasicError.prototype.inspect = function() {
  // istanbul ignore next (used only in node <0.11)
  if (this.rendering)
    return this.message;

  if (!this.parsedStack) {
    this.rendering = true;
    if (this.data && this.data.originalError && this.data.originalError.parsedStack)
      this.parsedStack = this.data.originalError.parsedStack;
    else {
      this.parsedStack = parseStack(
        this.data && this.data.originalError ?
          this.data.originalError.stack :
          this.stack
      );
    }
    this.rendering = false;
  }

  return this.stack;
};
BasicError.prototype.toJSON = function() {
  var attrs = ['ns', 'code', 'message', 'data', 'name'];

  if (process.env.NODE_ENV !== 'production')
    attrs.push('parsedStack');

  return _.pick(this, attrs);
};
BasicError.prototype.beautifier = defaultBeautifier();
BasicError.prototype.messageHandler = defaultMessageHandler();
BasicError.prototype.selectExerpt = function(ctx) {
  return ctx.dirname && !ctx.dirname.match('node_modules/');
};
BasicError.prototype.getExerpt = function(options) {
  return fileExerpt(
    _.find(this.parsedStack, this.selectExerpt) || this.parsedStack[0],
    options
  ).replace(/^(.)/mg, '|  $1');
};

BasicError.captureStackTrace = Error.captureStackTrace || /* istanbul ignore next */ function(err) {
  err.stack = (new Error()).stack || '';
};
