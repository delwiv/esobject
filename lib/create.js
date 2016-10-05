import {browseStrategies, composers} from './strategies/browse';
import _ from 'lodash';
import ESObject from './structs/esobject';
import {injector} from './annotate';
import load from './strategies/loader';
import util from 'util';

function fnMaker(name, fn) {
  if (!name.match(/^[a-zA-Z_]\w*$/))
    throw new Error('Invalid name for a function : ' + name);

  // eslint-disable-next-line no-new-func
  return new Function('fn', 'return function ' + name + '() { return fn.apply(this, arguments); };')(fn);
}

function createESMethod(method) {
  method = injector(method, (argName, params) => {
    switch (argName) {
    case 'params':
      return params;
    case 'index':
      return params.index;
    default:
      return params.index.getType(argName);
    }
  });

  return function(params) {
    params = params || {};

    if (!_.isObject(params))
      throw new Error('statics of ESObjects should be provided with a single (optional) object parameter.');

    if (!this.$index && !('index' in params))
      throw new Error('Impossible to do dependency injection in an object without an index.');

    const defaultParams = {};
    Object.defineProperty(defaultParams, 'index', {writable: true, value: this.$index});

    params = _.extend(defaultParams, params);

    return method.call(this, params);
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

  _.extend(Type, browseStrategies(load(descrObj.strategies), composers.strategies, composers.mapping));
  _.extend(Type.prototype, Type.strategies);

  return Type;
}
