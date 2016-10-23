import {getBeforeAfter, setContext} from './set_context';
import _ from 'lodash';
import actionsOptions from './actions_options';
import Builder from '../builder';
import contextualize from './contextualize';
import createActions from './create_actions';
import handleCheck from './handle_check';
import {MAIN_PROP} from '../../browse';

export function strategies(acc, property, propertyName, subActions) {
  if (propertyName === MAIN_PROP) {
    subActions = new Builder(subActions);
    subActions.next(Builder.then);
    handleCheck(subActions, actionsOptions.import, property);
    acc[propertyName] = _.mapValues(_.extend({exportDefault: _.noop}, subActions.getBuilds()), contextualize);
    acc[propertyName].import = acc[propertyName].importDefault || function() {
      throw new Error('no default import strategy');
    };
    acc[propertyName].export = acc[propertyName].exportDefault;
    return;
  }

  createActions(acc, actionsOptions.import, property, propertyName, property.$import);

  acc.next(Builder.then);

  _.each(subActions, function(strategy, name) {
    strategy = strategy.$notContextualized || strategy;
    if (strategy.name === 'noop')
      return;
    const actionsDescr = actionsOptions[strategy.strategyPrefix];
    const beforeAfter = getBeforeAfter(actionsDescr, property, strategy.strategyName);
    acc.addToBuild(name, setContext({
      actionsDescr: actionsDescr,
      property: property,
      propertyName: propertyName,
      strategy: strategy,
      beforeAfter: beforeAfter,
    }));
  });

  acc.next(Builder.then);

  createActions(acc, actionsOptions.export, property, propertyName, property.$export);

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
