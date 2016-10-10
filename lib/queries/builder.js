import _ from 'lodash';
import load from './loader';

function callOrReturn(fnOrScalar, ...args) {
  if (!_.isFunction(fnOrScalar))
    return fnOrScalar;
  return fnOrScalar(...args);
}

export function objectBuilder(array) {
  if (!_.isArray(array))
    throw new Error('mapBuilder is expecting an array…');

  return _.reduce(array, (acc, val) => {
    const keys = _.keys(val);
    if (keys.length !== 2 || _.difference(keys, ['key', 'value']).length)
      throw new Error('mapBuilder is expecting an array of object containing (only) key/value properties.');

    return function(obj, options) {
      const res = acc(obj, options);
      res[callOrReturn(val.key, obj, options)] = callOrReturn(val.value, obj, options);
      return res;
    };
  }, () => ({}));
}

export function queryBuilder(...Types /* ...Types, query */) {
  const query = _.isString(_.last(Types)) ? load(Types.pop()) : Types.pop();
  const queryFn = _.cloneWith(query, function cloner(val) {
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

  function $builtQuery(index, options, ...Types) {
    return index.search(...Types, queryFn(this, options));
  }
  $builtQuery.$inject = ['index', 'options', ...Types];

  return $builtQuery;
}

export default queryBuilder;
