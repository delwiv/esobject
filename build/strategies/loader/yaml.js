'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loader = loader;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errors = require('../../errors');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _helpers = require('../helpers');

var _helpers2 = _interopRequireDefault(_helpers);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

const ExportType = new _jsYaml2.default.Type('!export', {
  kind: 'mapping',
  construct: data => {
    var _strategies$export;

    if (!(data.name in _helpers2.default.export)) throw new _errors.ESLoadError('UnknownStrategy', { type: 'export', name: data.name });
    return (_strategies$export = _helpers2.default.export)[data.name].apply(_strategies$export, _toConsumableArray(data.args || []));
  }
});

const ImportType = new _jsYaml2.default.Type('!import', {
  kind: 'mapping',
  construct: data => {
    var _strategies$import;

    if (!(data.name in _helpers2.default.import)) throw new _errors.ESLoadError('UnknownStrategy', { type: 'import', name: data.name });
    return (_strategies$import = _helpers2.default.import)[data.name].apply(_strategies$import, _toConsumableArray(data.args || []));
  }
});

function loader(file) {
  const RequireType = new _jsYaml2.default.Type('!require', {
    kind: 'mapping',
    construct: data => {
      const loaded = (0, _index2.default)(_path2.default.resolve(_path2.default.dirname(file), data.file), file);
      const res = data.prop ? _lodash2.default.get(loaded, data.prop) : loaded;
      _errors.ESLoadError.assert(!_lodash2.default.isUndefined(res), 'BadYamlRequireProp', { require: data.file, prop: data.prop, file: file });
      return res;
    }
  });

  const StrategiesSchema = _jsYaml2.default.Schema.create([ExportType, ImportType, RequireType]);

  return _jsYaml2.default.safeLoad(_fs2.default.readFileSync(file, 'utf8'), {
    filename: file,
    schema: StrategiesSchema
  });
}

exports.default = loader;