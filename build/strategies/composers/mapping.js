'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.mapping = mapping;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _esobject = require('../../structs/esobject');

var _esobject2 = _interopRequireDefault(_esobject);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function mapping(acc, property, propertyName, subMapping) {
  const mapping = _lodash2.default.omitBy(property, (val, key) => key[0] === '$' || key === 'properties');

  if (subMapping) mapping.properties = subMapping.properties || subMapping;

  if (_esobject2.default.isESType(mapping.type)) mapping.type = property.$nested ? 'nested' : 'object';

  if (mapping.parent) mapping._parent = { type: mapping.parent };
  if (_esobject2.default.isESType(mapping.parent)) mapping._parent.type = mapping.parent.prototype._type;
  delete mapping.parent;

  if (!_lodash2.default.isEmpty(mapping)) acc[propertyName] = mapping;
}
mapping.composerName = 'mappings';

exports.default = mapping;