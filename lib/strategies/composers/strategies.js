import _ from 'lodash';
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

// todo: review argument names/order
function setContext(name, propertyName, strategy, arrayMode, Base) {
  return function(context, ...strategyArgs) {
    const res = context.get('res');
    var raw = {};
    try {
      raw = context.get('raw', {});
    }
    catch (e) {}

    const ref = name.substr(0, 6) === 'import' ? raw[propertyName] : res[propertyName];

    if (!_.isUndefined(arrayMode) && ref && arrayMode !== _.isArray(ref)) {
      throw new Error('property ' + propertyName + ' expecting ' +
        (arrayMode ? 'an array' : 'a plain object') + ', got ' + (arrayMode ? 'something else' : 'an array'));
    }

    arrayMode = _.isUndefined(arrayMode) ? _.isArray(ref) : !!arrayMode;
    res[propertyName] = res[propertyName] || (arrayMode ? [] : new (Base || Object)());

    var propertyContext = context.createSubContext(propertyName);

    if (arrayMode) {
      return Promise.map(ref || [], (val, index) =>
        setContext(name, index, strategy, false, Base).call(this, propertyContext, ...strategyArgs))
        .filter(val => val !== undefined)
        .then(res => res.length ? res : undefined)
      ;
    }

    return strategy.call(this, propertyContext, ...strategyArgs);
  };
}

// todo: review argument names/order
function createActions(prefix, strategies, cache, propertyName, property) {
  _.each(strategies, function(strategy, strategyName) {
    const fullName = prefix + strategyName[0].toUpperCase() + strategyName.substr(1);
    const prevStrategy = cache[fullName] || Promise.resolve;
    strategy = injector(strategy, (argName, context) => context.get(argName));

    cache[fullName] = function(context) {
      // Allow all strategies to run in parallel if there is async operations inside them
      return Promise.join(
        Promise.try(() => prevStrategy(...arguments)),
        Promise.try(() => setContext(fullName, propertyName, strategy, property.$array)(...arguments))
          .then(modifyAttrVal(propertyName, context.get('res'))),
        _.noop
      );
    };
  });
}

function handleCheck(acc, property, propertyName, Base) {
  if (!property.$check)
    return;

  const $check = _.isFunction(property.$check) ? {default: property.$check} : property.$check;
  _.each($check, function(checkFn, name) {
    checkFn = injector(checkFn, (argName, context) => context.get(argName));
    name = 'import' + name[0].toUpperCase() + name.substr(1);

    const prevStrategy = acc[name] || Promise.resolve;
    acc[name] = function(context) {
      return Promise.try(() => prevStrategy(context))
        .then(() => (propertyName ? setContext(name, propertyName, checkFn, property.$array, Base) : checkFn)(context))
      ;
    };
  });
}

// todo: review argument names/order
export function strategies(acc, property, propertyName, subActions) {
  if (propertyName === MAIN_PROP) {
    subActions = _.clone(subActions);
    handleCheck(subActions, property);
    acc[propertyName] = _.mapValues(_.extend({exportDefault: _.noop}, subActions), contextualize);
    acc[propertyName].import = acc[propertyName].importDefault || function() {
      throw new Error('no default import strategy');
    };
    acc[propertyName].export = acc[propertyName].exportDefault;
    return;
  }

  createActions('import', property.$import, acc, propertyName, property);

  const Base = property.type === 'object' || property.type === 'nested' ? Object : property.type;
  _.each(subActions, function(strategy, name) {
    strategy = strategy.$notContextualized || strategy;
    const prevStrategy = acc[name] || Promise.resolve;
    acc[name] = function(context) {
      return Promise.join(
        prevStrategy(context),
        setContext(name, propertyName, strategy, property.$array, Base)(context),
        _.noop
      );
    };
  });

  createActions('export', property.$export, acc, propertyName, property);

  if (subActions)
    handleCheck(acc, property, propertyName, Base);
}
strategies.composerName = 'strategies';

export default strategies;
