import {getBeforeAfter, setContext} from './set_context';
import _ from 'lodash';
import actionsOptions from './actions_options';
import Builder from '../builder';
import contextualize from './contextualize';
import {ESObjectError} from '../../../errors';
import handleCheck from './handle_check';
import {injector} from '../../../annotate';
import {MAIN_PROP} from '../../browse';
import modifyAttrVal from './modify_attr_val';
import Promise from 'bluebird';

function getAllStrategiesForPrefix(prefix, property, subActions) {
  return _.map(_.union(
    _.keys(property['$' + prefix]),
    _.keys(((property.$array || {})[prefix] || {}).before || {}),
    _.keys(((property.$array || {})[prefix] || {}).after || {}),
    _(subActions)
      .map(strategy => {
        strategy = strategy.$notContextualized || strategy;
        return strategy.strategyPrefix === prefix ? strategy.strategyName : undefined;
      })
      .filter()
      .value()
  ), strategyName => ({
    prefix: prefix,
    name: strategyName,
    fullName: prefix + strategyName[0].toUpperCase() + strategyName.substr(1),
  }));
}

export function strategies(acc, property, propertyName, subActions) {
  if (propertyName === MAIN_PROP) {
    subActions = new Builder(subActions);
    subActions.next(Builder.then);
    handleCheck(subActions, actionsOptions.import, property);
    acc[propertyName] = _.mapValues(_.extend({exportDefault: _.noop}, subActions.getBuilds()), contextualize);
    acc[propertyName].import = acc[propertyName].importDefault || function() {
      throw new ESObjectError('NoDefaultImport');
    };
    acc[propertyName].export = acc[propertyName].exportDefault;
    return;
  }

  const allStrategies = getAllStrategiesForPrefix('import', property, subActions)
    .concat(getAllStrategiesForPrefix('export', property, subActions))
  ;

  _.each(allStrategies, strategy => {
    const localStrategy = (property['$' + strategy.prefix] || {})[strategy.name];
    const subStrategy = (subActions || {})[strategy.fullName];

    const orderedStrategies = [];

    if (localStrategy)
      orderedStrategies.push(injector(localStrategy, (argName, context) => context.get(argName)));
    if (subStrategy) {
      orderedStrategies.push(function(context, ...strategyArgs) {
        return Promise.try(() => (subStrategy.$notContextualized || subStrategy)(context, ...strategyArgs))
          // Each individual strategy in subActions are returning their attributes values
          // so we need to get the actual object instead before going further
          .then(() => context.get('res'))
        ;
      });
    }

    if (strategy.prefix === 'export')
      orderedStrategies.reverse();

    const saveFn = modifyAttrVal(propertyName);

    acc.addToBuild(strategy.fullName, setContext({
      actionsDescr: actionsOptions[strategy.prefix],
      property: property,
      propertyName: propertyName,
      strategy: function(context, ...strategyArgs) {
        var prom = Promise.resolve();
        _.each(orderedStrategies, strategy => {
          prom = prom
            .then(() => strategy(context, ...strategyArgs))
            .tap(modifyAttrVal(context.$propertyName).bind(null, context.$parent))
          ;
        });
        return prom;
      },
      strategyName: strategy.name,
      beforeAfter: getBeforeAfter(actionsOptions[strategy.prefix], property, strategy.name),
      save: (context, res) => {
        if (_.isObject(res) && _.isEmpty(res))
          res = undefined;
        return saveFn(context, res);
      },
    }));
  });

  if (subActions) {
    acc.next(Builder.then);
    handleCheck(acc, actionsOptions.import, property, propertyName);
  }

  acc.next(Builder.join);
}
strategies.composerName = 'strategies';
strategies.accumulatorBuilder = propertyName => propertyName === MAIN_PROP ? {} : new Builder();
strategies.accumulatorExtractor = acc => acc instanceof Builder ? acc.getBuilds() : acc;

export default strategies;
