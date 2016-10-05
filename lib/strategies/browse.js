import * as composers from './composers';
import _ from 'lodash';
import ESObject from '../structs/esobject';

export const MAIN_PROP = Symbol('[<ESOBJECT$MAIN$>]');

function executeComposers(acc, composers, property, propertyName, subResults) {
  _.each(_.castArray(composers), composer => {
    const composerName = composer.composerName || composer.name;
    acc[composerName] = acc[composerName] || {};
    composer(acc[composerName], property, propertyName, (subResults || {})[composerName] || null);
  });
}

function browseStrategies_(strategyDescr, ...composers) {
  return _.transform(strategyDescr.properties || {}, function(acc, property, propertyName) {
    if (_.isString(property) || ESObject.isESType(property))
      property = {type: property};

    var subResults = null;
    if (property.type === 'object')
      subResults = browseStrategies_(property, ...composers);
    else if (ESObject.isESType(property.type))
      subResults = property.type;

    executeComposers(acc, composers, property, propertyName, subResults);
  }, {});
}

export function browseStrategies(strategyDescr, ...composers) {
  const subResults = browseStrategies_(strategyDescr, ...composers);

  const res = {};
  executeComposers(res, composers, strategyDescr, MAIN_PROP, subResults);

  return _.mapValues(res, MAIN_PROP);
}

export default browseStrategies;
export {composers};
