import _ from 'lodash';
import ESObject from '../../structs/esobject';

// todo: review argument names/order
export function mapping(acc, property, propertyName, subMapping) {
  const mapping = _.omitBy(property, (val, key) => key[0] === '$' || key === 'properties');

  if (subMapping)
    mapping.properties = subMapping.properties || subMapping;

  if (ESObject.isESType(mapping.type))
    mapping.type = property.$nested ? 'nested' : 'object';

  if (mapping.parent)
    mapping._parent = {type: mapping.parent};
  if (ESObject.isESType(mapping.parent))
    mapping._parent.type = mapping.parent.lowerName;
  delete mapping.parent;

  if (!_.isEmpty(mapping))
    acc[propertyName] = mapping;
}
mapping.composerName = 'mappings';

export default mapping;
