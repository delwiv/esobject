import {getBeforeAfter, setContext} from './set_context';
import _ from 'lodash';
import {injector} from '../../../annotate';

// Return a method that will modify attr in target with its given value
// Note: if value is undefined, attribute will be deleted from target
function modifyAttrVal(attr, target) {
  return function(res) {
    // If value is undefined, delete the attribute
    if (res === undefined)
      delete target[attr];
    // Otherwise, store the new value in the res object
    else
      target[attr] = res;
  };
}

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

    acc.addToBuild(fullName, function(context) {
      return setContext({
        actionsDescr: actionsDescr,
        property: property,
        propertyName: propertyName,
        strategy: strategy,
        beforeAfter: getBeforeAfter(actionsDescr, property, strategyName),
        save: modifyAttrVal(propertyName, context.get('res')),
      })(...arguments);
    });
  });
}

export default createActions;
