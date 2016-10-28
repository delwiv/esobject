import _ from 'lodash';
import {ESLoadError} from './errors';
import path from 'path';

const PRIVATE = Symbol('ESOBJECT$LOADER$PRIVATE');

export class Loader {
  constructor(loaders) {
    this[PRIVATE] = {loaders: loaders};
  }

  load(file, from) {
    ESLoadError.assert(_.isString(file), 'Loader.load() expects a filename!');

    const loader = path.extname(file).substr(1);

    ESLoadError.assert(loader in this[PRIVATE].loaders, 'Unknown loader for file extension ' + loader);

    try {
      return this[PRIVATE].loaders[loader](file);
    }
    catch (err) {
      if (err instanceof ESLoadError)
        throw err;
      throw new ESLoadError('BadRequire', {file, from, message: err.message});
    }
  }
}

export default Loader;
