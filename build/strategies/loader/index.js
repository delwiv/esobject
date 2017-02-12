'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.load = undefined;

var _loader = require('../../loader');

var _loader2 = _interopRequireDefault(_loader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const strategiesLoaders = {
  js: require,
  yaml: function yaml() {
    strategiesLoaders.yaml = require('./yaml').loader;
    return strategiesLoaders.yaml.apply(strategiesLoaders, arguments);
  }
};

const loader = new _loader2.default(strategiesLoaders);

const load = exports.load = loader.load.bind(loader);
exports.default = load;