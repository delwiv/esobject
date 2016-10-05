import _ from 'lodash';
import annotate from '../annotate';

export const strategies = {
  import: {
    id: function $id(keep) {
      function $id(raw, old) {
        return _.isUndefined(raw) ? old : raw;
      }
      $id.$inject = ['raw'];
      if (keep)
        $id.$inject.push('old');
      return $id;
    },
    default: function $default(prev, defaultValue) {
      if (arguments.length < 2) {
        defaultValue = prev;
        prev = strategies.import.id();
      }

      function $default() {
        return prev.apply(this, arguments) || (_.isFunction(defaultValue) ? defaultValue() : defaultValue);
      }
      $default.$inject = prev.$inject || annotate(prev);

      return $default;
    },
  },
  export: {
    id: function $id() {
      return function $id(obj) {
        return obj;
      };
    },
    copy: function $copy(path, root) {
      function $copy(val) {
        return val;
      }
      $copy.$inject = ['obj$' + (root ? 'root' : 'parent') + '$' + path.replace(/\./g, '$')];
      return $copy;
    },
    drop: _.constant(_.constant(undefined)),
  },
};

export default strategies;
