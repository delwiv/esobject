import _ from 'lodash';
import {injector} from '../../../annotate';
import Promise from 'bluebird';

function addSave(value, save, {isArray = false, noUndefined = false} = {}) {
  var prom = Promise.resolve(value);

  if (isArray) {
    prom = prom.then(res => res ? res.filter(val => !_.isUndefined(val)) : res);

    if (!noUndefined)
      prom = prom.then(res => (res || []).length ? res : undefined);
  }

  return prom.tap(save);
}

export function getBeforeAfter(actionsDescr, property, strategyName) {
  const strategies = (property.$array || {})[actionsDescr.prefix] || {};

  const before = (strategies.before || {})[strategyName];
  const after = (strategies.after || {})[strategyName];

  function noop(context) {
    return context.get('res');
  }

  return {
    before: before ? injector(before, (argName, context) => context.get(argName)) : noop,
    after: after ? injector(after, (argName, context) => context.get(argName)) : noop,
  };
}

export function setContext({
  actionsDescr,
  property,
  propertyName,
  strategy,
  strategyName = strategy.strategyName,
  beforeAfter,
  save,
  $arrayMode = property.$array,
}) {
  save = save || _.noop;

  function contextualizedStrategy(context, ...strategyArgs) {
    const ref = context.get(actionsDescr.ref, {});

    actionsDescr.check(property, propertyName, $arrayMode, context);

    $arrayMode = _.isUndefined($arrayMode) ? _.isArray(ref[propertyName]) : !!$arrayMode;

    actionsDescr.init(property, propertyName, $arrayMode, context);

    if (!context.get(actionsDescr.read)[propertyName])
      return addSave(Promise.resolve(context.get(actionsDescr.ref)[propertyName]), save.bind(null, context), {isArray: false});

    var propertyContext = () => context.createSubContext(propertyName);

    if ($arrayMode) {
      return addSave(
        beforeAfter.before(propertyContext(), ...strategyArgs),
        save.bind(null, context),
        {isArray: true, noUndefined: true}
      )
        .then(() =>
          addSave(
            Promise.map(ref[propertyName] || [], (val, index) =>
              setContext({
                actionsDescr: actionsDescr,
                property: property,
                propertyName: index,
                strategy: strategy,
                strategyName: strategyName,
                beforeAfter: beforeAfter,
                $arrayMode: false,
              })(propertyContext(), ...strategyArgs)),
            save.bind(null, context),
            {isArray: true}
          )
        )
        .then(() => addSave(
          beforeAfter.after(propertyContext(), ...strategyArgs),
          save.bind(null, context),
          {isArray: true}
        ))
      ;
    }

    return addSave(strategy(propertyContext(), ...strategyArgs), save.bind(null, context));
  }

  contextualizedStrategy.strategyPrefix = actionsDescr.prefix;
  contextualizedStrategy.strategyName = strategyName;

  return contextualizedStrategy;
}

export default setContext;

setContext.getBeforeAfter = getBeforeAfter;
