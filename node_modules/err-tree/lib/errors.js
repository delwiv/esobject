'use strict';

var makeError = require('./make-error').makeError;
var defaultMessageHandler = require('./message-handlers/default');

module.exports.ErrtreeError = makeError('ErrtreeError', {
  selectExerpt: ['!**/node_modules/**', '!' + __dirname + '/**'],
  messageHandler: defaultMessageHandler()
});
