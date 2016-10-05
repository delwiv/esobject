import _ from 'lodash';
import path from 'path';

const strategiesLoaders = {
  yaml: function() {
    strategiesLoaders.yaml = require('./yaml').loader;
    return strategiesLoaders.yaml(...arguments);
  },
  js: require,
};

export function load(strategies) {
  if (!_.isString(strategies))
    return strategies;

  const loader = path.extname(strategies).substr(1);

  if (!(loader in strategiesLoaders))
    throw new Error('Unknown loader for file extension ' + loader);

  return strategiesLoaders[loader](strategies);
}

export default load;
