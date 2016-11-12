import * as errors from './errors';
import * as query from './queries/builder';
import create from './create';
import ESObject from './structs/esobject';

export {create, ESObject};
export {Index} from './structs/index';
export {MultiIndex} from './structs/multi_index';
export {query};
export {Store} from './structs/store';
export {strategies} from './strategies/helpers';
export {errors};
export {QueryLoader} from './queries/loader';

export function yaml() {
  return require('js-yaml');
}

ESObject.create = create;

export default ESObject;
