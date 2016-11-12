import {defaultLoader, QueryLoader} from './loader';
import _ from 'lodash';
import {ESInternalError} from '../errors';

function callOrReturn(fnOrScalar, ...args) {
  if (!_.isFunction(fnOrScalar))
    return fnOrScalar;
  return fnOrScalar(...args);
}

export function objectBuilder(array) {
  ESInternalError.assert(_.isArray(array), 'ArrayNeeded', {fn: 'objectBuilder'});

  return _.reduce(array, (acc, val) => {
    const keys = _.keys(val);
    if (keys.length !== 2 || _.difference(keys, ['key', 'value']).length)
      throw new ESInternalError('ArrayOfMapsNeeded', {fn: 'objectBuilder'});

    return function(obj, options) {
      const res = acc(obj, options);
      res[callOrReturn(val.key, obj, options)] = callOrReturn(val.value, obj, options);
      return res;
    };
  }, () => ({}));
}

export function queryReducer(query) {
  return _.cloneWith(query, function cloner(val) {
    if (_.isFunction(val))
      return val;
    else if (!_.isObject(val))
      return _.constant(val);

    return _.reduce(val, (acc, propVal, propName) => {
      propVal = _.cloneWith(propVal, cloner);
      return function(obj, options) {
        const res = acc(obj, options);
        res[propName] = propVal(obj, options);
        return res;
      };
    }, () => _.isArray(val) ? [] : {});
  });
}

export function queryBuilder(/* [loader, ] */ ...Types /* , query */) {
  const loader = Types[0] instanceof QueryLoader ? Types.shift() : defaultLoader;
  const query = _.isString(_.last(Types)) ? loader.load(Types.pop()) : Types.pop();
  const queryFn = queryReducer(query);

  function $builtQuery(index, options, ...Types) {
    return index.search(...Types, queryFn(this, options));
  }
  $builtQuery.$inject = ['index', 'options', ...Types];

  return $builtQuery;
}

export default queryBuilder;
