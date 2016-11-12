import _ from 'lodash';
import {ESLoadError} from './errors';
import path from 'path';

const PRIVATE = Symbol('ESOBJECT$LOADER$PRIVATE');

export class Loader {
  constructor(loaders, options = {}) {
    this[PRIVATE] = {loaders: loaders, options: options};
  }

  load(file, from) {
    ESLoadError.assert(_.isString(file), 'Loader.load() expects a filename!');

    const loader = path.extname(file).substr(1);

    ESLoadError.assert(loader in this[PRIVATE].loaders, 'Unknown loader for file extension ' + loader);

    try {
      const options = this[PRIVATE].options[loader] || {};
      return this[PRIVATE].loaders[loader].call(this, file, options);
    }
    catch (err) {
      if (err instanceof ESLoadError)
        throw err;
      throw new ESLoadError('BadRequire', {file, from, message: err.message});
    }
  }
}

export default Loader;
