import create from './create';
import ESObject from './structs/esobject';

export {create, ESObject};
export {Index} from './structs/index';
export {MultiIndex} from './structs/multi_index';
export {Store} from './structs/store';
export {strategies} from './strategies/helpers';

ESObject.create = create;

export default ESObject;
