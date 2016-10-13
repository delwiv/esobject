import {browseStrategies, composers} from './strategies/browse';
import _ from 'lodash';
import ESObject from './structs/esobject';
import {injector} from './annotate';
import load from './strategies/loader';
import queryBuilder from './queries/builder';
import util from 'util';

function fnMaker(name, fn) {
  if (!name.match(/^[a-zA-Z_]\w*$/))
    throw new Error('Invalid name for a function : ' + name);

  // eslint-disable-next-line no-new-func
  return new Function('fn', 'return function ' + name + '() { return fn.apply(this, arguments); };')(fn);
}

function createESMethod(method) {
  if (_.isArray(method))
    method = queryBuilder(...method);

  if (!_.isFunction(method))
    throw new Error('createESMethod expects a function (or a valid array of arguments for queryBuilder)');

  method = injector(method, (argName, options) => {
    switch (argName) {
    case 'options':
      return options;
    case 'index':
      return options.index;
    default:
      return options.index.getType(argName);
    }
  });

  return function(options) {
    options = options || {};

    if (!_.isObject(options))
      throw new Error('statics of ESObjects should be provided with a single (optional) object parameter.');

    if (!this.$index && !('index' in options))
      throw new Error('Impossible to do dependency injection in an object without an index.');

    const defaultOptions = {};
    Object.defineProperty(defaultOptions, 'index', {writable: true, value: this.$index});

    options = _.extend(defaultOptions, options);

    return method.call(this, options);
  };
}

export default function create(descrObj) {
  if (!descrObj.name)
    throw new Error('name property is mandatory');

  var Type = fnMaker(descrObj.name, function() {
    ESObject.apply(this, arguments);
  });
  util.inherits(Type, ESObject);
  Type.lowerName = Type.name.toLowerCase();

  if (descrObj.stores)
    _.invokeMap(_.castArray(descrObj.stores), 'add', Type);

  _.each(descrObj.statics, function(method, name) {
    Type[name] = createESMethod(method).bind({});
  });
  _.each(descrObj.methods, function(method, name) {
    Type.prototype[name] = createESMethod(method);
  });

  const strategies = _.isString(descrObj.strategies) ? load(descrObj.strategies) : descrObj.strategies;
  _.extend(Type, browseStrategies(strategies, composers.strategies, composers.mapping));
  _.extend(Type.prototype, Type.strategies);

  return Type;
}