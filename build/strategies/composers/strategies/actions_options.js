'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.actionsOptions = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _esobject = require('../../../structs/esobject');

var _esobject2 = _interopRequireDefault(_esobject);

var _errors = require('../../../errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function invalidArrayMode(property, propertyName, arrayMode, val) {
  if (!val || !!arrayMode === _lodash2.default.isArray(val)) return;

  _errors.ESTypeError.assert(!val || !!arrayMode === _lodash2.default.isArray(val), arrayMode ? 'ArrayNeeded' : 'NoArrayNeeded', { propertyName: propertyName });
}

const actionsOptions = exports.actionsOptions = {
  import: {
    prefix: 'import',
    ref: 'raw',
    read: 'raw',
    check: (property, propertyName, arrayMode, context) => {
      if (!_lodash2.default.isUndefined(arrayMode)) {
        invalidArrayMode(property, propertyName, arrayMode, context.get('raw', {})[propertyName]);
        invalidArrayMode(property, propertyName, arrayMode, context.get('res')[propertyName]);
      }
    },
    init: (property, propertyName, arrayMode, context) => {
      const old = context.get('old');
      const raw = context.get('raw', {});
      const res = context.get('res');

      const Type = _esobject2.default.isESType(property.type) ? property.type : Object;

      if (!arrayMode) {
        const initValue = propertyName in raw && !raw[propertyName] ? raw : new Type();
        res[propertyName] = res[propertyName] || initValue;
        return;
      }

      const array = _lodash2.default.extend({ dropIfNotImported: true }, _lodash2.default.isObject(property.$array) ? property.$array : {});
      var start = res[propertyName] || [];

      if (array.primary && array.dropIfNotImported) start = _lodash2.default.filter(res[propertyName] || [], val => _lodash2.default.find(raw[propertyName] || [], _lodash2.default.pick(val, array.primary)));else if (array.dropIfNotImported) start = _lodash2.default.union(res[propertyName] || [], raw[propertyName] || []);

      if (start.length) {
        const sortedRaw = new Array(Math.min((raw[propertyName] || []).length, start.length));

        _lodash2.default.each(raw[propertyName] || [], (val, index) => {
          if (array.primary) {
            const primaries = _lodash2.default.isFunction(array.primary) ? array.primary : _lodash2.default.pick(val, array.primary);
            if (_lodash2.default.isFunction(array.primary) || _lodash2.default.size(primaries) === _lodash2.default.castArray(array.primary).length) index = _lodash2.default.findIndex(start, primaries);else index = -1;
          }

          if (index < 0) sortedRaw.push(val);else sortedRaw[index] = val;
        });

        raw[propertyName] = sortedRaw;
      }

      old[propertyName] = _lodash2.default.cloneDeep(start);
      res[propertyName] = start;
    }
  },
  export: {
    prefix: 'export',
    ref: 'res',
    read: 'obj',
    check: (property, propertyName, arrayMode, context) => {
      if (!_lodash2.default.isUndefined(arrayMode) && context.get('res')) invalidArrayMode(property, propertyName, arrayMode, context.get('res')[propertyName]);
    },
    init: _lodash2.default.noop
  }
};

exports.default = actionsOptions;