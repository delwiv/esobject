import _ from 'lodash';
import {injector} from '../../../annotate';
import Promise from 'bluebird';

function addSave(value, save, isArray) {
  var prom = Promise.resolve(value);

  if (isArray) {
    prom = prom
      .then(res => _.isArray(res) ? res.filter(val => !_.isUndefined(val)) : res)
      .then(res => !_.isArray(res) || res.length ? res : undefined)
    ;
  }

  return prom
    .tap(save)
  ;
}

export function getBeforeAfter(actionsDescr, property, strategyName) {
  if (!property.$array || property.$array === true)
    return {before: Promise.resolve, after: Promise.resolve};

  const strategies = property.$array[actionsDescr.prefix] || {};

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
  beforeAfter,
  save,
  $arrayMode = property.$array,
}) {
  save = save || _.noop;

  return function(context, ...strategyArgs) {
    const ref = context.get(actionsDescr.ref, {});

    actionsDescr.check(property, propertyName, $arrayMode, context);

    $arrayMode = _.isUndefined($arrayMode) ? _.isArray(ref[propertyName]) : !!$arrayMode;

    actionsDescr.init(property, propertyName, $arrayMode, context);

    var propertyContext = () => context.createSubContext(propertyName);

    if ($arrayMode) {
      return addSave(beforeAfter.before.call(this, propertyContext(), ...strategyArgs), save, true)
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
            save,
            true
          )
        )
        .then(() => addSave(beforeAfter.after.call(this, propertyContext(), ...strategyArgs), save, true))
      ;
    }

    return addSave(strategy.call(this, propertyContext(), ...strategyArgs), save);
  };
}

export default setContext;

setContext.getBeforeAfter = getBeforeAfter;
