'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.composers = exports.MAIN_PROP = undefined;
exports.browseStrategies = browseStrategies;

var _composers = require('./composers');

var composers = _interopRequireWildcard(_composers);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _esobject = require('../structs/esobject');

var _esobject2 = _interopRequireDefault(_esobject);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

const MAIN_PROP = exports.MAIN_PROP = Symbol('[<ESOBJECT$MAIN$>]');

function executeComposers(acc, composers, property, propertyName, subResults) {
  _lodash2.default.each(_lodash2.default.castArray(composers), composer => {
    const composerName = composer.composerName || composer.name;
    acc[composerName] = acc[composerName] || (composer.accumulatorBuilder ? composer.accumulatorBuilder(propertyName) : {});
    composer(acc[composerName], property, propertyName, (subResults || {})[composerName] || null);
  });
}

function extractAccumulators(subResults, composers) {
  return _lodash2.default.transform(composers, (acc, composer) => {
    const composerName = composer.composerName || composer.name;
    if (composer.accumulatorExtractor) acc[composerName] = composer.accumulatorExtractor(subResults[composerName]);else acc[composerName] = subResults[composerName];
  }, {});
}

function browseStrategies_(strategyDescr) {
  for (var _len = arguments.length, localComposers = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    localComposers[_key - 1] = arguments[_key];
  }

  return extractAccumulators(_lodash2.default.transform(strategyDescr.properties || {}, function (acc, property, propertyName) {
    if (_lodash2.default.isString(property) || _esobject2.default.isESType(property)) property = { type: property };

    var subResults = null;
    if (property.type === 'object' || property.type === 'nested') subResults = browseStrategies_.apply(undefined, [property].concat(localComposers));else if (_esobject2.default.isESType(property.type)) subResults = property.type;

    executeComposers(acc, localComposers, property, propertyName, subResults);
  }, {}), localComposers);
}

function browseStrategies(strategyDescr) {
  for (var _len2 = arguments.length, localComposers = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    localComposers[_key2 - 1] = arguments[_key2];
  }

  const subResults = browseStrategies_.apply(undefined, [strategyDescr].concat(localComposers));

  const res = {};
  executeComposers(res, localComposers, strategyDescr, MAIN_PROP, subResults);

  return _lodash2.default.mapValues(res, MAIN_PROP);
}

exports.default = browseStrategies;
exports.composers = composers;