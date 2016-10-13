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

function setContext(actionsDescr, property, propertyName, strategy, arrayMode = property.$array) {
  return function(context, ...strategyArgs) {
    const ref = context.get(actionsDescr.ref, {});

    actionsDescr.check(property, propertyName, arrayMode, context);

    arrayMode = _.isUndefined(arrayMode) ? _.isArray(ref[propertyName]) : !!arrayMode;

    actionsDescr.init(property, propertyName, arrayMode, context);

    var propertyContext = context.createSubContext(propertyName);

    if (arrayMode) {
      return Promise.map(
        ref[propertyName] || [],
        (val, index) =>
          setContext(actionsDescr, property, index, strategy, false).call(this, propertyContext, ...strategyArgs)
      )
        .filter(val => val !== undefined)
        .then(res => res.length ? res : undefined)
      ;
    }

    return strategy.call(this, propertyContext, ...strategyArgs);
  };
}

function createActions(acc, actionsDescr, property, propertyName, strategies) {
  _.each(strategies, function(strategy, strategyName) {
    const fullName = actionsDescr.prefix + strategyName[0].toUpperCase() + strategyName.substr(1);
    const prevStrategy = acc[fullName] || Promise.resolve;
    strategy = injector(strategy, (argName, context) => context.get(argName));

    acc[fullName] = function(context) {
      // Allow all strategies to run in parallel if there is async operations inside them
      return Promise.join(
        Promise.try(() => prevStrategy(...arguments)),
        Promise.try(() => setContext(actionsDescr, property, propertyName, strategy)(...arguments))
          .then(modifyAttrVal(propertyName, context.get('res'))),
        _.noop
      );
    };
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

function handleCheck(acc, property, propertyName) {
  if (!property.$check)
    return;

  const $check = _.isFunction(property.$check) ? {default: property.$check} : property.$check;
  _.each($check, function(checkFn, name) {
    checkFn = injector(checkFn, (argName, context) => context.get(argName));
    name = 'import' + name[0].toUpperCase() + name.substr(1);

    const prevStrategy = acc[name] || Promise.resolve;
    acc[name] = function(context) {
      return Promise.try(() => prevStrategy(context))
        .then(() =>
          (propertyName ? setContext(actionsOptions.import, property, propertyName, checkFn) : checkFn)(context))
      ;
    };
  });
}

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

  createActions(acc, actionsOptions.import, property, propertyName, property.$import);

  _.each(subActions, function(strategy, name) {
    strategy = strategy.$notContextualized || strategy;
    const prevStrategy = acc[name] || Promise.resolve;
    acc[name] = function(context) {
      return Promise.join(
        prevStrategy(context),
        setContext(actionsOptions[name.substr(0, 6)], property, propertyName, strategy)(context),
        _.noop
      );
    };
  });

  createActions(acc, actionsOptions.export, property, propertyName, property.$export);

  if (subActions)
    handleCheck(acc, property, propertyName);
}
strategies.composerName = 'strategies';

export default strategies;
