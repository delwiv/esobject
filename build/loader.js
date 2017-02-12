'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Loader = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errors = require('./errors');

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const PRIVATE = Symbol('ESOBJECT$LOADER$PRIVATE');

class Loader {
  constructor(loaders) {
    let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    this[PRIVATE] = { loaders: loaders, options: options };
  }

  load(file, from) {
    _errors.ESLoadError.assert(_lodash2.default.isString(file), 'Loader.load() expects a filename!');

    const loader = _path2.default.extname(file).substr(1);

    _errors.ESLoadError.assert(loader in this[PRIVATE].loaders, 'Unknown loader for file extension ' + loader);

    try {
      const options = this[PRIVATE].options[loader] || {};
      return this[PRIVATE].loaders[loader].call(this, file, options);
    } catch (err) {
      if (err instanceof _errors.ESLoadError) throw err;
      throw new _errors.ESLoadError('BadRequire', { file: file, from: from, message: err.message });
    }
  }
}

exports.Loader = Loader;
exports.default = Loader;