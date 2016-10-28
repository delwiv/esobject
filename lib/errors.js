import _ from 'lodash';
import errorMessages from './error_messages';
import errTree from 'err-tree';
import path from 'path';

class MessageHandler {
  constructor() {
    this.store = _.cloneDeepWith(errorMessages, value => _.isString(value) ? _.template(value, {
      evaluate: /\{\{\?(.+?)\}\}/,
      interpolate: /\{\{([^?].*?)\}\}/,
    }) : undefined);
  }

  handle(err) {
    const message = err.data.originalMessage || err.message;

    if (!(err.name in this.store))
      return message;
    if (!(err.message in this.store[err.name]))
      return message;

    const data = _.extend({}, err.data, {
      err: {
        name: err.name,
        ns: err.ns,
        code: err.code,
        strCode: err.strCode,
      },
      data: err.data,
    });

    try {
      return this.store[err.name][err.message](data);
    }
    catch (e) {
      return message;
    }
  }
}

const messageHandler = new MessageHandler();

export const ESObjectError = errTree('ESObjectError', {
  defaultCode: 400,
  defaultNs: 'esobject',
  selectExerpt: ['!**/node_modules/**', '!' + path.join(__dirname, '/**')],
  messageHandler: messageHandler.handle.bind(messageHandler),
});

export const ESInjectionError = errTree('ESInjectionError', ESObjectError);
export const ESLoadError = errTree('ESLoadError', ESObjectError);
export const ESTypeError = errTree('ESTypeError', ESObjectError);
export const ESInternalError = errTree('ESInternalError', ESObjectError, {defaultCode: 500});

export const ESClientError = errTree(function ESClientError(esError, data) {
  ESObjectError.call(this, esError.displayName, esError.status, _.extend({originalMessage: esError.message}, data));
}, ESObjectError);

export function toESError() {
  throw new ESClientError(...arguments);
}

export function getStackedToESError(additionalData) {
  const originalError = new errTree.BasicError('Stack trace error');

  // Remove the current call from the stack (it is not relevant at all)
  originalError.parsedStack.shift();

  additionalData = _.extend(additionalData, {originalError});

  return function stackedToEsError(err) {
    if (err instanceof errTree.BasicError)
      throw err;
    toESError(err, additionalData);
  };
}
