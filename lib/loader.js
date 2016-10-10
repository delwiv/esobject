import _ from 'lodash';
import path from 'path';

const PRIVATE = Symbol('ESOBJECT$LOADER$PRIVATE');

export class Loader {
  constructor(loaders) {
    this[PRIVATE] = {loaders: loaders};
  }

  load(file) {
    if (!_.isString(file))
      throw new Error('Loader.load() expects a filename!');

    const loader = path.extname(file).substr(1);

    if (!(loader in this[PRIVATE].loaders))
      throw new Error('Unknown loader for file extension ' + loader);

    return this[PRIVATE].loaders[loader](file);
  }
}

export default Loader;
