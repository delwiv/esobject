import _ from 'lodash';

export function Context(parent, situations, globals) {
  if (!(parent instanceof Context)) {
    globals = situations;
    situations = parent;
    parent = null;
  }

  Object.defineProperty(this, '$parent', {value: parent});

  // this is needed instead of transform because this.root & this.parent can be === this (line 17 & 18)
  this.situations = {};
  _.each(situations, (situation, name) => {
    this.situations[name] = {value: situation};
    _.extend(this.situations[name], {
      root: this.root.situations[name],
      parent: this.parent.situations[name],
    });
  });

  this.globals = _.transform(globals, (acc, global, name) => {
    acc[name] = {value: global};
  }, {});
}

Context.prototype = {
  get parent() {
    return this.$parent || this;
  },
  get root() {
    return this.$parent ? this.$parent.root : this;
  },

  duplicate: function() {
    return new Context(this.$parent, _.mapValues(this.situations, 'value'));
  },
  createSubContext: function(attr) {
    return new Context(
      this,
      _(this.situations)
        .mapValues('value')
        .mapValues(situation => (situation || {})[attr])
        .value(),
      _.mapValues(this.globals, 'value')
    );
  },

  get: function(attr, defaultValue) {
    const attrArray = attr.split('$');

    if (!(attrArray[0] in this.situations) && !(attrArray[0] in this.globals))
      throw new Error('Unknown context ' + attrArray[0]);

    var inSituations = true;
    var res = _.reduce(attrArray, function(acc, attr) {
      if (inSituations && !(attr in acc)) {
        inSituations = false;
        acc = acc.value;
      }

      if (!attr)
        return acc;

      return (acc || {})[attr];
    }, (attrArray[0] in this.situations ? this.situations : this.globals)[attrArray.shift()]);

    if (inSituations)
      res = res.value;

    return _.isUndefined(res) ? defaultValue : res;
  },
};

export default Context;
