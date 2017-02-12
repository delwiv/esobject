'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.loader = loader;

var _builder = require('../builder');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errors = require('../../errors');

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const ObjectBuilderType = new _jsYaml2.default.Type('!object-builder', {
  kind: 'sequence',
  construct: data => (0, _builder.objectBuilder)(data)
});

const ObjType = new _jsYaml2.default.Type('!obj', {
  kind: 'scalar',
  construct: data => obj => _lodash2.default.get(obj, data)
});

const OptionsType = new _jsYaml2.default.Type('!options', {
  kind: 'scalar',
  construct: data => (obj, options) => _lodash2.default.get(options, data)
});

const IfType = new _jsYaml2.default.Type('!if', {
  kind: 'mapping',
  construct: data => {
    if (!_lodash2.default.isFunction(data.test)) data.test = _lodash2.default.constant(data.test);
    if (!_lodash2.default.isFunction(data.then)) data.then = (0, _builder.queryReducer)(data.then);
    if (!_lodash2.default.isFunction(data.else)) data.else = (0, _builder.queryReducer)(data.else);

    return (obj, options) => data.test(obj, options) ? data.then(obj, options) : data.else(obj, options);
  }
});

const FilterType = new _jsYaml2.default.Type('!filter', {
  kind: 'sequence',
  construct: data => {
    const dataFn = (0, _builder.queryReducer)(data);
    return (obj, options) => _lodash2.default.filter(dataFn(obj, options), elt => _lodash2.default.isFunction(elt) ? elt(obj, options) : elt);
  }
});

function loader(file) {
  let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  const RequireType = new _jsYaml2.default.Type('!require', {
    kind: 'mapping',
    construct: data => {
      const loaded = this.load(_path2.default.resolve(_path2.default.dirname(file), data.file), file);
      const res = data.prop ? _lodash2.default.get(loaded, data.prop) : loaded;
      _errors.ESLoadError.assert(!_lodash2.default.isUndefined(res), 'BadYamlRequireProp', { require: data.file, prop: data.prop, file: file });
      return res;
    }
  });

  const defaultTypes = [ObjectBuilderType, ObjType, OptionsType, IfType, FilterType, RequireType];

  const QueriesSchema = _jsYaml2.default.Schema.create(defaultTypes.concat(_lodash2.default.castArray(options.types || [])));

  return _jsYaml2.default.safeLoad(_fs2.default.readFileSync(file, 'utf8'), {
    filename: file,
    schema: QueriesSchema
  });
}

exports.default = loader;