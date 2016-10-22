import _ from 'lodash';
import Builder from './builder';
import Context from '../../context';
import ESObject from '../../structs/esobject';
import {injector} from '../../annotate';
import {MAIN_PROP} from '../browse';
import Promise from 'bluebird';

function contextualizeForImport(strategy) {
  return function(raw, ...args) {
    const options = args[0] || {};
    const index = this.$index || options.index;

    return Promise.try(() => strategy(new Context({
      old: _.cloneDeep(this),
      raw: raw,
      res: this,
    }, _.extend({
      index: index,
      options: options,
      args: args,
    }, index ? index.getTypes() : {})))).return(this);
  };
}

function contextualizeForExport(strategy) {
  return function(...args) {
    const options = args[0] || {};
    const index = this.$index || options.index;

    var res = _.cloneDeepWith(this, function flattenESObjects(value) {
      if (value instanceof ESObject)
        return _.cloneDeepWith(_.assign({}, value), flattenESObjects);
      return undefined;
    });

    return Promise.try(() => strategy(new Context({
      obj: this,
      res: res,
    }, _.extend({
      index: index,
      options: options,
      args: args,
    }, index ? index.getTypes() : {})))).return(res);
  };
}

function contextualize(strategy, name) {
  const res = name.substr(0, 6) === 'import' ? contextualizeForImport(strategy) : contextualizeForExport(strategy);
  res.$notContextualized = strategy;
  return res;
}

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

function setContext({
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

function getBeforeAfter(actionsDescr, property, strategyName) {
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

function createActions(acc, actionsDescr, property, propertyName, strategies) {
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

    const beforeAfter = getBeforeAfter(actionsDescr, property, strategyName);

    acc.addToBuild(fullName, function(context) {
      return Promise.resolve(setContext({
        actionsDescr: actionsDescr,
        property: property,
        propertyName: propertyName,
        strategy: strategy,
        beforeAfter: beforeAfter,
        save: modifyAttrVal(propertyName, context.get('res')),
      })(...arguments));
    });
  });
}

function invalidArrayMode(property, propertyName, arrayMode, val) {
  if (!val || !!arrayMode === _.isArray(val))
    return;

  throw new Error('property ' + propertyName + ' expecting ' + (arrayMode ? 'an array' : 'a value') +
    ', got ' + (arrayMode ? 'something else' : 'an array'));
}

const actionsOptions = {
  import: {
    prefix: 'import',
    ref: 'raw',
    check: (property, propertyName, arrayMode, context) => {
      if (!_.isUndefined(arrayMode)) {
        invalidArrayMode(property, propertyName, arrayMode, context.get('raw', {})[propertyName]);
        invalidArrayMode(property, propertyName, arrayMode, context.get('res')[propertyName]);
      }
    },
    init: (property, propertyName, arrayMode, context) => {
      const old = context.get('old');
      const raw = context.get('raw', {});
      const res = context.get('res');

      const Type = ESObject.isESType(property.type) ? property.type : Object;

      if (!arrayMode) {
        res[propertyName] = res[propertyName] || new Type();
        return;
      }

      const array = _.extend({dropIfNotImported: true}, _.isObject(property.$array) ? property.$array : {});
      var start = array.dropIfNotImported ? [] : res[propertyName] || [];

      if (array.primary && array.dropIfNotImported)
        start = _.filter(res[propertyName] || [], val => _.find(raw[propertyName] || [], _.pick(val, array.primary)));

      if (start.length) {
        const sortedRaw = new Array(Math.min((raw[propertyName] || []).length, start.length));

        _.each(raw[propertyName] || [], (val, index) => {
          if (array.primary) {
            const primaries = _.isFunction(array.primary) ? array.primary : _.pick(val, array.primary);
            if (_.isFunction(array.primary) || _.size(primaries) === _.castArray(array.primary).length)
              index = _.findIndex(start, primaries);
            else
              index = -1;
          }

          if (index < 0)
            sortedRaw.push(val);
          else
            sortedRaw[index] = val;
        });

        raw[propertyName] = sortedRaw;
      }

      old[propertyName] = _.cloneDeep(start);
      res[propertyName] = start;
    },
  },
  export: {
    prefix: 'export',
    ref: 'res',
    check: (property, propertyName, arrayMode, context) => {
      if (!_.isUndefined(arrayMode))
        invalidArrayMode(property, propertyName, arrayMode, context.get('res')[propertyName]);
    },
    init: _.noop,
  },
};

function handleCheck(acc, actionsDescr, property, propertyName) {
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
    const actionsDescr = actionsOptions[name.substr(0, 6)];
    const strategyName = name.length === 6 ? 'default' : name[6].toLowerCase() + name.substr(7);
    const beforeAfter = getBeforeAfter(actionsDescr, property, strategyName);
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
