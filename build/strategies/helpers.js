'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.strategies = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _annotate = require('../annotate');

var _annotate2 = _interopRequireDefault(_annotate);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function createCopyHelper(base) {
  return function $copy(path, root) {
    function $copy(val) {
      return val;
    }
    $copy.$inject = [base + '$' + (root ? 'root' : 'parent') + '$' + path.replace(/\./g, '$')];
    return $copy;
  };
}

const strategies = exports.strategies = {
  import: {
    constant: _lodash2.default.constant,
    copy: createCopyHelper('raw'),
    default: function $default(prev, defaultValue) {
      if (arguments.length < 2) {
        defaultValue = prev;
        prev = strategies.import.id();
      }

      function $default() {
        return _bluebird2.default.try(() => {
          var _prev;

          return (_prev = prev).call.apply(_prev, [this].concat(Array.prototype.slice.call(arguments)));
        }).then(res => res || (_lodash2.default.isFunction(defaultValue) ? defaultValue() : defaultValue));
      }
      $default.$inject = prev.$inject || (0, _annotate2.default)(prev);

      return $default;
    },
    id: function $id(keep) {
      function $id(raw, old) {
        return _lodash2.default.isUndefined(raw) ? old : raw;
      }
      $id.$inject = ['raw'];
      if (keep) $id.$inject.push('old');
      return $id;
    }
  },
  export: {
    constant: _lodash2.default.constant,
    copy: createCopyHelper('obj'),
    drop: _lodash2.default.constant(_lodash2.default.constant(undefined)),
    id: function $id() {
      return function $id(obj) {
        return obj;
      };
    }
  }
};

exports.default = strategies;