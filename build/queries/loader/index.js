'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.load = exports.defaultLoader = exports.QueryLoader = undefined;

var _loader = require('../../loader');

var _loader2 = _interopRequireDefault(_loader);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const strategiesLoaders = {
  js: require,
  yaml: function yaml() {
    var _strategiesLoaders$ya;

    strategiesLoaders.yaml = require('./yaml').loader;
    return (_strategiesLoaders$ya = strategiesLoaders.yaml).call.apply(_strategiesLoaders$ya, [this].concat(Array.prototype.slice.call(arguments)));
  }
};

class QueryLoader extends _loader2.default {
  constructor(options) {
    super(strategiesLoaders, options);
  }
}

exports.QueryLoader = QueryLoader;
const defaultLoader = exports.defaultLoader = new QueryLoader();
const load = exports.load = defaultLoader.load.bind(defaultLoader);
exports.default = load;