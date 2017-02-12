'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.modifyAttrVal = modifyAttrVal;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Return a method that will modify attr in target with its given value
// Note: if value is undefined, attribute will be deleted from target
function modifyAttrVal(attr) {
  return function (context, res) {
    const target = context.get('res');

    if (!target) return;

    const pD = Object.getOwnPropertyDescriptor(target, attr);

    if (!pD && _lodash2.default.isUndefined(res)) return;

    // If value is undefined, delete the attribute
    if (_lodash2.default.isUndefined(res) && pD.configurable) delete target[attr];
    // Otherwise, store the new value in the res object
    else target[attr] = res;
  };
}

exports.default = modifyAttrVal;