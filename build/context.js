'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Context = Context;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errors = require('./errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Context(parent, situations, globals) {
  if (!(parent instanceof Context) && (!_lodash2.default.isObject(parent) || !(parent.ref instanceof Context))) {
    globals = situations;
    situations = parent;
    parent = null;
  }

  if (!parent || parent instanceof Context) parent = { ref: parent || null };

  Object.defineProperty(this, '$parent', { value: parent.ref });
  Object.defineProperty(this, '$propertyName', { value: parent.propertyName });

  // this is needed instead of transform because this.root & this.parent can be === this (line 17 & 18)
  this.situations = {};
  _lodash2.default.each(situations, (situation, name) => {
    this.situations[name] = { value: situation };
    _lodash2.default.extend(this.situations[name], {
      root: this.root.situations[name],
      parent: this.parent.situations[name]
    });
  });

  this.globals = _lodash2.default.transform(globals, (acc, global, name) => {
    acc[name] = { value: global };
  }, {});
}

Context.prototype = {
  get parent() {
    return this.$parent || this;
  },
  get root() {
    return this.$parent ? this.$parent.root : this;
  },

  duplicate: function duplicate() {
    let newSituations = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    let newGlobals = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    return new Context(this.$parent, _lodash2.default.extend({}, _lodash2.default.mapValues(this.situations, 'value'), newSituations), _lodash2.default.extend({}, _lodash2.default.mapValues(this.globals, 'value'), newGlobals));
  },
  createSubContext: function createSubContext(attr) {
    return new Context({ ref: this, propertyName: attr }, (0, _lodash2.default)(this.situations).mapValues('value').mapValues(situation => (situation || {})[attr]).value(), _lodash2.default.mapValues(this.globals, 'value'));
  },

  get: function get(attr, defaultValue) {
    const attrArray = attr.split('$');

    if (!(attrArray[0] in this.situations) && !(attrArray[0] in this.globals)) throw new _errors.ESInjectionError('UnknownContext', { name: attrArray[0] });

    var inSituations = true;
    var res = _lodash2.default.reduce(attrArray, function (acc, attr) {
      if (inSituations && !(attr in acc)) {
        inSituations = false;
        acc = acc.value;
      }

      if (!attr) return acc;

      return (acc || {})[attr];
    }, (attrArray[0] in this.situations ? this.situations : this.globals)[attrArray.shift()]);

    if (inSituations) res = res.value;

    return _lodash2.default.isUndefined(res) ? defaultValue : res;
  }
};

exports.default = Context;