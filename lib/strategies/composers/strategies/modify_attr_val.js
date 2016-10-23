import _ from 'lodash';

// Return a method that will modify attr in target with its given value
// Note: if value is undefined, attribute will be deleted from target
export function modifyAttrVal(attr) {
  return function(context, res) {
    const target = context.get('res');

    const pD = Object.getOwnPropertyDescriptor(target, attr);

    if (!pD && _.isUndefined(res))
      return;

    // If value is undefined, delete the attribute
    if (_.isUndefined(res) && pD.configurable)
      delete target[attr];
    // Otherwise, store the new value in the res object
    else
      target[attr] = res;
  };
}

export default modifyAttrVal;
