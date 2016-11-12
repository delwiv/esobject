import Loader from '../../loader';

const strategiesLoaders = {
  js: require,
  yaml: function() {
    strategiesLoaders.yaml = require('./yaml').loader;
    return strategiesLoaders.yaml.call(this, ...arguments);
  },
};

export class QueryLoader extends Loader {
  constructor(options) {
    super(strategiesLoaders, options);
  }
}

export const defaultLoader = new QueryLoader();
export const load = defaultLoader.load.bind(defaultLoader);
export default load;
