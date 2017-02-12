'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBeforeAfter = getBeforeAfter;
exports.setContext = setContext;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _annotate = require('../../../annotate');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function addSave(value, save) {
  var _ref = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {},
      _ref$isArray = _ref.isArray;

  let isArray = _ref$isArray === undefined ? false : _ref$isArray;
  var _ref$noUndefined = _ref.noUndefined;
  let noUndefined = _ref$noUndefined === undefined ? false : _ref$noUndefined;

  var prom = _bluebird2.default.resolve(value);

  if (isArray) {
    prom = prom.then(res => res ? res.filter(val => !_lodash2.default.isUndefined(val)) : res);

    if (!noUndefined) prom = prom.then(res => (res || []).length ? res : undefined);
  }

  return prom.tap(save);
}

function getBeforeAfter(actionsDescr, property, strategyName) {
  const strategies = (property.$array || {})[actionsDescr.prefix] || {};

  const before = (strategies.before || {})[strategyName];
  const after = (strategies.after || {})[strategyName];

  function noop(context) {
    return context.get('res');
  }

  return {
    before: before ? (0, _annotate.injector)(before, (argName, context) => context.get(argName)) : noop,
    after: after ? (0, _annotate.injector)(after, (argName, context) => context.get(argName)) : noop
  };
}

function setContext(_ref2) {
  let actionsDescr = _ref2.actionsDescr,
      property = _ref2.property,
      propertyName = _ref2.propertyName,
      strategy = _ref2.strategy;
  var _ref2$strategyName = _ref2.strategyName;
  let strategyName = _ref2$strategyName === undefined ? strategy.strategyName : _ref2$strategyName,
      beforeAfter = _ref2.beforeAfter,
      save = _ref2.save;
  var _ref2$$arrayMode = _ref2.$arrayMode;
  let $arrayMode = _ref2$$arrayMode === undefined ? property.$array : _ref2$$arrayMode;

  save = save || _lodash2.default.identity;

  function contextualizedStrategy(context) {
    for (var _len = arguments.length, strategyArgs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      strategyArgs[_key - 1] = arguments[_key];
    }

    const ref = context.get(actionsDescr.ref, {});

    actionsDescr.check(property, propertyName, $arrayMode, context);

    $arrayMode = _lodash2.default.isUndefined($arrayMode) ? _lodash2.default.isArray(ref[propertyName]) : !!$arrayMode;

    actionsDescr.init(property, propertyName, $arrayMode, context);

    const read = context.get(actionsDescr.read, {})[propertyName];
    if (!read && !_lodash2.default.isUndefined(read)) return addSave(_bluebird2.default.resolve(context.get(actionsDescr.ref)[propertyName]), save.bind(null, context), { isArray: false });

    var propertyContext = () => context.createSubContext(propertyName);

    if ($arrayMode) {
      return addSave(beforeAfter.before.apply(beforeAfter, [propertyContext()].concat(strategyArgs)), save.bind(null, context), { isArray: true, noUndefined: true }).then(() => addSave(_bluebird2.default.map(ref[propertyName] || [], (val, index) => setContext({
        actionsDescr: actionsDescr,
        property: property,
        propertyName: index,
        strategy: strategy,
        strategyName: strategyName,
        beforeAfter: beforeAfter,
        $arrayMode: false
      }).apply(undefined, [propertyContext()].concat(strategyArgs))), save.bind(null, context), { isArray: true })).then(() => addSave(beforeAfter.after.apply(beforeAfter, [propertyContext()].concat(strategyArgs)), save.bind(null, context), { isArray: true }));
    }

    return addSave(strategy.apply(undefined, [propertyContext()].concat(strategyArgs)), save.bind(null, context));
  }

  contextualizedStrategy.strategyPrefix = actionsDescr.prefix;
  contextualizedStrategy.strategyName = strategyName;

  return contextualizedStrategy;
}

exports.default = setContext;


setContext.getBeforeAfter = getBeforeAfter;