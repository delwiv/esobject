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

    var propertyContext = () => context.createSubContext(propertyName);

    if ($arrayMode) {
      return addSave(
        beforeAfter.before.call(this, propertyContext(), ...strategyArgs),
        save.bind(this, context),
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
                beforeAfter: beforeAfter,
                $arrayMode: false,
              }).call(this, propertyContext(), ...strategyArgs)),
            save.bind(this, context),
            {isArray: true}
          )
        )
        .then(() => addSave(
          beforeAfter.after.call(this, propertyContext(), ...strategyArgs),
          save.bind(this, context),
          {isArray: true}
        ))
      ;
    }

    propertyContext = propertyContext();

    return addSave(strategy.call(this, propertyContext, ...strategyArgs), save.bind(this, context))
      .then(() => propertyContext.get('res'))
    ;
  }

  contextualizedStrategy.strategyPrefix = actionsDescr.prefix;
  contextualizedStrategy.strategyName = strategyName;

  return contextualizedStrategy;
}

export default setContext;

setContext.getBeforeAfter = getBeforeAfter;
