import _ from 'lodash';
import annotate from '../annotate';
import Promise from 'bluebird';

function createCopyHelper(base) {
  return function $copy(path, root) {
    function $copy(val) {
      return val;
    }
    $copy.$inject = [base + '$' + (root ? 'root' : 'parent') + '$' + path.replace(/\./g, '$')];
    return $copy;
  };
}

export const strategies = {
  import: {
    constant: _.constant,
    copy: createCopyHelper('raw'),
    default: function $default(prev, defaultValue) {
      if (arguments.length < 2) {
        defaultValue = prev;
        prev = strategies.import.id();
      }

      function $default() {
        return Promise.try(() => prev.call(this, ...arguments))
          .then(res => res || (_.isFunction(defaultValue) ? defaultValue() : defaultValue))
        ;
      }
      $default.$inject = prev.$inject || annotate(prev);

      return $default;
    },
    id: function $id(keep) {
      function $id(raw, old) {
        return _.isUndefined(raw) ? old : raw;
      }
      $id.$inject = ['raw'];
      if (keep)
        $id.$inject.push('old');
      return $id;
    },
  },
  export: {
    constant: _.constant,
    copy: createCopyHelper('obj'),
    drop: _.constant(_.constant(undefined)),
    id: function $id() {
      return function $id(obj) {
        return obj;
      };
    },
  },
};

export default strategies;
