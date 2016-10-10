import Loader from '../../loader';

const strategiesLoaders = {
  js: require,
  yaml: function() {
    strategiesLoaders.yaml = require('./yaml').loader;
    return strategiesLoaders.yaml(...arguments);
  },
};

const loader = new Loader(strategiesLoaders);

export const load = loader.load.bind(loader);
export default load;
