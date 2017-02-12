'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.handleCheck = handleCheck;

var _set_context = require('./set_context');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _actions_options = require('./actions_options');

var _actions_options2 = _interopRequireDefault(_actions_options);

var _annotate = require('../../../annotate');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function handleCheck(acc, actionsDescr, property, propertyName) {
  if (!property.$check) return;

  const $check = _lodash2.default.isFunction(property.$check) ? { default: property.$check } : property.$check;
  _lodash2.default.each($check, function (checkFn, name) {
    checkFn = (0, _annotate.injector)(checkFn, (argName, context) => context.get(argName));
    const fullName = 'import' + name[0].toUpperCase() + name.substr(1);

    acc.addToBuild(fullName, function (context) {
      return (propertyName ? (0, _set_context.setContext)({
        actionsDescr: _lodash2.default.defaults({ init: _lodash2.default.noop }, _actions_options2.default.import),
        property: property,
        propertyName: propertyName,
        strategy: checkFn,
        strategyName: name,
        beforeAfter: (0, _set_context.getBeforeAfter)(actionsDescr, property, '$check')
      }) : checkFn)(context);
    });
  });
}

exports.default = handleCheck;