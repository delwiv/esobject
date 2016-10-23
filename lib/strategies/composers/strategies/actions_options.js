import _ from 'lodash';
import ESObject from '../../../structs/esobject';

function invalidArrayMode(property, propertyName, arrayMode, val) {
  if (!val || !!arrayMode === _.isArray(val))
    return;

  throw new Error('property ' + propertyName + ' expecting ' + (arrayMode ? 'an array' : 'a value') +
    ', got ' + (arrayMode ? 'something else' : 'an array'));
}

export const actionsOptions = {
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

export default actionsOptions;