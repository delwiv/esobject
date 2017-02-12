'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ESClientError = exports.ESInternalError = exports.ESTypeError = exports.ESLoadError = exports.ESInjectionError = exports.ESObjectError = undefined;
exports.toESError = toESError;
exports.getStackedToESError = getStackedToESError;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _error_messages = require('./error_messages');

var _error_messages2 = _interopRequireDefault(_error_messages);

var _errTree = require('err-tree');

var _errTree2 = _interopRequireDefault(_errTree);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class MessageHandler {
  constructor() {
    this.store = _lodash2.default.cloneDeepWith(_error_messages2.default, value => _lodash2.default.isString(value) ? _lodash2.default.template(value, {
      evaluate: /\{\{\?(.+?)\}\}/,
      interpolate: /\{\{([^?].*?)\}\}/
    }) : undefined);
  }

  handle(err) {
    const message = err.data.originalMessage || err.message;

    if (!(err.name in this.store)) return message;
    if (!(err.message in this.store[err.name])) return message;

    const data = _lodash2.default.extend({}, err.data, {
      err: {
        name: err.name,
        ns: err.ns,
        code: err.code,
        strCode: err.strCode
      },
      data: err.data
    });

    try {
      return this.store[err.name][err.message](data);
    } catch (e) {
      return message;
    }
  }
}

const messageHandler = new MessageHandler();

const ESObjectError = exports.ESObjectError = (0, _errTree2.default)('ESObjectError', {
  defaultCode: 400,
  defaultNs: 'esobject',
  selectExerpt: ['!**/node_modules/**', '!' + _path2.default.join(__dirname, '/**')],
  messageHandler: messageHandler.handle.bind(messageHandler)
});

const ESInjectionError = exports.ESInjectionError = (0, _errTree2.default)('ESInjectionError', ESObjectError);
const ESLoadError = exports.ESLoadError = (0, _errTree2.default)('ESLoadError', ESObjectError);
const ESTypeError = exports.ESTypeError = (0, _errTree2.default)('ESTypeError', ESObjectError);
const ESInternalError = exports.ESInternalError = (0, _errTree2.default)('ESInternalError', ESObjectError, { defaultCode: 500 });

const ESClientError = exports.ESClientError = (0, _errTree2.default)(function ESClientError(esError, data) {
  ESObjectError.call(this, esError.displayName, esError.status, _lodash2.default.extend({ originalMessage: esError.message }, data));
}, ESObjectError);

function toESError() {
  throw new (Function.prototype.bind.apply(ESClientError, [null].concat(Array.prototype.slice.call(arguments))))();
}

function getStackedToESError(additionalData) {
  const originalError = new _errTree2.default.BasicError('Stack trace error');

  // Remove the current call from the stack (it is not relevant at all)
  originalError.parsedStack.shift();

  additionalData = _lodash2.default.extend(additionalData, { originalError: originalError });

  return function stackedToEsError(err) {
    if (err instanceof _errTree2.default.BasicError) throw err;
    toESError(err, additionalData);
  };
}