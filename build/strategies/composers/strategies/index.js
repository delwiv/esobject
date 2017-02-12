'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.strategies = strategies;

var _set_context = require('./set_context');

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _actions_options = require('./actions_options');

var _actions_options2 = _interopRequireDefault(_actions_options);

var _builder = require('../builder');

var _builder2 = _interopRequireDefault(_builder);

var _contextualize = require('./contextualize');

var _contextualize2 = _interopRequireDefault(_contextualize);

var _errors = require('../../../errors');

var _handle_check = require('./handle_check');

var _handle_check2 = _interopRequireDefault(_handle_check);

var _annotate = require('../../../annotate');

var _browse = require('../../browse');

var _modify_attr_val = require('./modify_attr_val');

var _modify_attr_val2 = _interopRequireDefault(_modify_attr_val);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function getAllStrategiesForPrefix(prefix, property, subActions) {
  return _lodash2.default.map(_lodash2.default.union(_lodash2.default.keys(property['$' + prefix]), _lodash2.default.keys(((property.$array || {})[prefix] || {}).before || {}), _lodash2.default.keys(((property.$array || {})[prefix] || {}).after || {}), (0, _lodash2.default)(subActions).map(strategy => {
    strategy = strategy.$notContextualized || strategy;
    return strategy.strategyPrefix === prefix ? strategy.strategyName : undefined;
  }).filter().value()), strategyName => ({
    prefix: prefix,
    name: strategyName,
    fullName: prefix + strategyName[0].toUpperCase() + strategyName.substr(1)
  }));
}

function strategies(acc, property, propertyName, subActions) {
  if (propertyName === _browse.MAIN_PROP) {
    subActions = new _builder2.default(subActions);
    subActions.next(_builder2.default.then);
    (0, _handle_check2.default)(subActions, _actions_options2.default.import, property);
    acc[propertyName] = _lodash2.default.mapValues(_lodash2.default.extend({ exportDefault: _lodash2.default.noop }, subActions.getBuilds()), _contextualize2.default);
    acc[propertyName].import = acc[propertyName].importDefault || function () {
      throw new _errors.ESObjectError('NoDefaultImport');
    };
    acc[propertyName].export = acc[propertyName].exportDefault;
    return;
  }

  const allStrategies = getAllStrategiesForPrefix('import', property, subActions).concat(getAllStrategiesForPrefix('export', property, subActions));

  _lodash2.default.each(allStrategies, strategy => {
    const localStrategy = (property['$' + strategy.prefix] || {})[strategy.name];
    const subStrategy = (subActions || {})[strategy.fullName];

    const orderedStrategies = [];

    if (localStrategy) orderedStrategies.push((0, _annotate.injector)(localStrategy, (argName, context) => context.get(argName)));
    if (subStrategy) {
      orderedStrategies.push(function (context) {
        for (var _len = arguments.length, strategyArgs = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          strategyArgs[_key - 1] = arguments[_key];
        }

        return _bluebird2.default.try(() => (subStrategy.$notContextualized || subStrategy).apply(undefined, [context].concat(strategyArgs)))
        // Each individual strategy in subActions are returning their attributes values
        // so we need to get the actual object instead before going further
        .then(() => context.get('res'));
      });
    }

    if (strategy.prefix === 'export') orderedStrategies.reverse();

    const saveFn = (0, _modify_attr_val2.default)(propertyName);

    acc.addToBuild(strategy.fullName, (0, _set_context.setContext)({
      actionsDescr: _actions_options2.default[strategy.prefix],
      property: property,
      propertyName: propertyName,
      strategy: function strategy(context) {
        for (var _len2 = arguments.length, strategyArgs = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          strategyArgs[_key2 - 1] = arguments[_key2];
        }

        var prom = _bluebird2.default.resolve();
        _lodash2.default.each(orderedStrategies, strategy => {
          prom = prom.then(() => strategy.apply(undefined, [context].concat(strategyArgs))).tap((0, _modify_attr_val2.default)(context.$propertyName).bind(null, context.$parent));
        });
        return prom;
      },
      strategyName: strategy.name,
      beforeAfter: (0, _set_context.getBeforeAfter)(_actions_options2.default[strategy.prefix], property, strategy.name),
      save: (context, res) => {
        if (_lodash2.default.isObject(res) && _lodash2.default.isEmpty(res) && !_lodash2.default.isArray(res)) res = undefined;
        return saveFn(context, res);
      }
    }));
  });

  if (subActions) {
    acc.next(_builder2.default.then);
    (0, _handle_check2.default)(acc, _actions_options2.default.import, property, propertyName);
  }

  acc.next(_builder2.default.join);
}
strategies.composerName = 'strategies';
strategies.accumulatorBuilder = propertyName => propertyName === _browse.MAIN_PROP ? {} : new _builder2.default();
strategies.accumulatorExtractor = acc => acc instanceof _builder2.default ? acc.getBuilds() : acc;

exports.default = strategies;