import {getBeforeAfter, setContext} from './set_context';
import _ from 'lodash';
import {injector} from '../../../annotate';
import modifyAttrVal from './modify_attr_val';

export function createActions(acc, actionsDescr, property, propertyName, strategies) {
  const arrayStrategies = (property.$array || {})[actionsDescr.prefix] || {};
  const arrayStrategyNames = _.union(_.keys(arrayStrategies.before || {}), _.keys(arrayStrategies.after));

  strategies = strategies || {};

  _.each(arrayStrategyNames, strategyName => {
    if (strategyName in strategies)
      return;
    strategies[strategyName] = res => res;
  });

  _.each(strategies, function(strategy, strategyName) {
    const fullName = actionsDescr.prefix + strategyName[0].toUpperCase() + strategyName.substr(1);
    strategy = injector(strategy, (argName, context) => context.get(argName));

    acc.addToBuild(fullName, setContext({
      actionsDescr: actionsDescr,
      property: property,
      propertyName: propertyName,
      strategy: strategy,
      strategyName: strategyName,
      beforeAfter: getBeforeAfter(actionsDescr, property, strategyName),
      save: modifyAttrVal(propertyName),
    }));
  });
}

export default createActions;
