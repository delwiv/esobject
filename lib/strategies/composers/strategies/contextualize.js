import _ from 'lodash';
import Context from '../../../context';
import ESObject from '../../../structs/esobject';
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

    var res = _.cloneDeepWith(this, function flattenESObjects(value, key) {
      if (typeof key === 'symbol')
        return null;
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

export function contextualize(strategy, name) {
  const res = name.substr(0, 6) === 'import' ? contextualizeForImport(strategy) : contextualizeForExport(strategy);
  res.$notContextualized = strategy;
  return res;
}

export default contextualize;
