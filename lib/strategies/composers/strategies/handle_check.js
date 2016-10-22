import {getBeforeAfter, setContext} from './set_context';
import _ from 'lodash';
import actionsOptions from './actions_options';
import {injector} from '../../../annotate';

export function handleCheck(acc, actionsDescr, property, propertyName) {
  if (!property.$check)
    return;

  const $check = _.isFunction(property.$check) ? {default: property.$check} : property.$check;
  _.each($check, function(checkFn, name) {
    checkFn = injector(checkFn, (argName, context) => context.get(argName));
    name = 'import' + name[0].toUpperCase() + name.substr(1);

    const beforeAfter = getBeforeAfter(actionsDescr, property, '$check');

    acc.addToBuild(name, function(context) {
      return (propertyName ? setContext({
        actionsDescr: actionsOptions.import,
        property: property,
        propertyName: propertyName,
        strategy: checkFn,
        beforeAfter: beforeAfter,
      }) : checkFn)(context);
    });
  });
}

export default handleCheck;
