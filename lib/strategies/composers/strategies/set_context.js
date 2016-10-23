import _ from 'lodash';
import {injector} from '../../../annotate';
import Promise from 'bluebird';

function addSave(value, save, isArray) {
  var prom = Promise.resolve(value);

  if (isArray) {
    prom = prom
      .then(res => res ? res.filter(val => !_.isUndefined(val)) : res)
      .then(res => (res || []).length ? res : undefined)
    ;
  }

  return prom
    .tap(save)
  ;
}

export function getBeforeAfter(actionsDescr, property, strategyName) {
  const strategies = (property.$array || {})[actionsDescr.prefix] || {};

  const resId = res => res;

  const before = (strategies.before || {})[strategyName] || resId;
  const after = (strategies.after || {})[strategyName] || resId;

  return {
    before: injector(before, (argName, context) => context.get(argName)),
    after: injector(after, (argName, context) => context.get(argName)),
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
      return addSave(beforeAfter.before.call(this, propertyContext(), ...strategyArgs), save.bind(this, context), true)
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
            true
          )
        )
        .then(() => addSave(
          beforeAfter.after.call(this, propertyContext(), ...strategyArgs),
          save.bind(this, context),
          true
        ))
      ;
    }

    return addSave(strategy.call(this, propertyContext(), ...strategyArgs), save.bind(this, context));
  }

  contextualizedStrategy.strategyPrefix = actionsDescr.prefix;
  contextualizedStrategy.strategyName = strategyName;

  return contextualizedStrategy;
}

export default setContext;

setContext.getBeforeAfter = getBeforeAfter;
