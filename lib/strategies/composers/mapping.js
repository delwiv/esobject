import _ from 'lodash';
import ESObject from '../../structs/esobject';

// todo: review argument names/order
export function mapping(acc, property, propertyName, subMapping) {
  const mapping = _.omitBy(property, (val, key) => key[0] === '$' || key === 'properties');

  if (subMapping)
    mapping.properties = subMapping.properties || subMapping;

  if (ESObject.isESType(mapping.type))
    mapping.type = 'object';

  if (ESObject.isESType(mapping.parent))
    mapping.parent = mapping.parent.lowerName;

  if (!_.isEmpty(mapping))
    acc[propertyName] = mapping;
}
mapping.composerName = 'mappings';

export default mapping;
