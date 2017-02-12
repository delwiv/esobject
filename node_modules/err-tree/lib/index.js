'use strict';

var _ = require('lodash');

var errTree = module.exports = require('./make-error').errTree;

errTree.ErrtreeError = require('./errors').ErrtreeError;
errTree.BasicError = require('./basic-error').BasicError;
errTree.parseStack = require('./parser');
errTree.fileExerpt = require('./file-exerpt');
errTree.beautifiers = require('./beautifiers');
errTree.messageHandlers = require('./message-handlers');
errTree.createAssert = require('./assert').createAssert;

errTree.setDefaultBeautifier = function(beautifier, options) {
  if (_.isString(beautifier))
    beautifier = errTree.beautifiers.get(beautifier, options);

  options = _.defaults(options || {}, {
    onError: false
  });

  var ErrorProto = (options.onError ? Error : errTree.BasicError).prototype;

  ErrorProto.beautifier = errTree.BasicError.prototype.beautifier = beautifier;

  if (!options.onError)
    return;

  ErrorProto.inspect = ErrorProto.toString = errTree.BasicError.prototype.toString;
  ErrorProto.getExerpt = errTree.BasicError.prototype.getExerpt;
  ErrorProto.findExerpt = errTree.BasicError.prototype.findExerpt;

  require('./basic-error').setRendererGetterSetters(ErrorProto);
};
errTree.setDefaultMessageHandler  = function(messageHandler, options) {
  if (_.isString(messageHandler))
    messageHandler = errTree.messageHandlers.get(messageHandler, options);

  errTree.BasicError.prototype.messageHandler = messageHandler;
};

errTree.useUncaughtExceptionHandler = function() {
  process.on('uncaughtException', function(err) {
    console.error('Uncaught exception:\n|');
    console.error((err.beautifier ? err : err.stack).toString().replace(/^/gm, '|  ') + '\n|');
    process.exit(8);
  });
};
