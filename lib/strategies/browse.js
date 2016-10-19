import * as composers from './composers';
import _ from 'lodash';
import ESObject from '../structs/esobject';

export const MAIN_PROP = Symbol('[<ESOBJECT$MAIN$>]');

function executeComposers(acc, composers, property, propertyName, subResults) {
  _.each(_.castArray(composers), composer => {
    const composerName = composer.composerName || composer.name;
    acc[composerName] = acc[composerName] ||
      (composer.accumulatorBuilder ? composer.accumulatorBuilder(propertyName) : {});
    composer(acc[composerName], property, propertyName, (subResults || {})[composerName] || null);
  });
}

function extractAccumulators(subResults, composers) {
  return _.transform(composers, (acc, composer) => {
    const composerName = composer.composerName || composer.name;
    if (composer.accumulatorExtractor)
      acc[composerName] = composer.accumulatorExtractor(subResults[composerName]);
    else
      acc[composerName] = subResults[composerName];
  }, {});
}

function browseStrategies_(strategyDescr, ...localComposers) {
  return extractAccumulators(_.transform(strategyDescr.properties || {}, function(acc, property, propertyName) {
    if (_.isString(property) || ESObject.isESType(property))
      property = {type: property};

    var subResults = null;
    if (property.type === 'object' || property.type === 'nested')
      subResults = browseStrategies_(property, ...localComposers);
    else if (ESObject.isESType(property.type))
      subResults = property.type;

    executeComposers(acc, localComposers, property, propertyName, subResults);
  }, {}), localComposers);
}

export function browseStrategies(strategyDescr, ...localComposers) {
  const subResults = browseStrategies_(strategyDescr, ...localComposers);

  const res = {};
  executeComposers(res, localComposers, strategyDescr, MAIN_PROP, subResults);

  return _.mapValues(res, MAIN_PROP);
}

export default browseStrategies;
export {composers};
