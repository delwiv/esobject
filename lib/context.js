'use strict';

define(function(_) {
  var Context = this.Context = function Context(parent, situations) {
    if (arguments.length < 2) {
      situations = parent;
      parent = null;
    }

    Object.defineProperty(this, '$parent', {value: parent});

    this.situations = {};
    _.each(situations, function(situation, name) {
      this.situations[name] = {value: situation};
      _.extend(this.situations[name], {
        root: this.root.situations[name],
        parent: this.parent.situations[name],
      });
    }.bind(this));
  };

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
          .mapValues(function(situation) {
            return (situation || {})[attr];
          })
          .value()
      );
    },

    get: function(attr, defaultValue) {
      attr = attr.split('$');

      if (!(attr[0] in this.situations))
        throw new Error('Unknown context ' + attr[0]);

      var inSituations = true;
      var res = _.reduce(attr, function(acc, attr) {
        if (inSituations && !(attr in acc)) {
          inSituations = false;
          acc = acc.value;
        }

        if (!attr)
          return acc;

        return (acc || {})[attr];
      }, this.situations[attr.shift()]);

      if (inSituations)
        res = res.value;

      return res || defaultValue;
    }
  };
});
