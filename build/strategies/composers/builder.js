'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Builder = undefined;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class Builder {
  constructor() {
    let builds = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    this.builds = _lodash2.default.mapValues(builds, build => ({ attach: Builder.join, fn: build }));
  }

  addToBuild(name, fn) {
    if (!(name in this.builds)) {
      this.builds[name] = { attach: Builder.join, fn: fn };
      return this;
    }

    const prevBuild = _lodash2.default.clone(this.builds[name]);
    this.builds[name].fn = function () {
      for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return prevBuild.attach(() => {
        var _prevBuild$fn;

        return (_prevBuild$fn = prevBuild.fn).call.apply(_prevBuild$fn, [this].concat(args));
      }, () => fn.call.apply(fn, [this].concat(args)));
    };
    this.builds[name].fn.strategyName = prevBuild.fn.strategyName;
    this.builds[name].fn.strategyPrefix = prevBuild.fn.strategyPrefix;

    return this;
  }

  next(handler) {
    _lodash2.default.each(this.builds, build => {
      build.attach = handler;
    });
  }

  getBuilds() {
    return _lodash2.default.mapValues(this.builds, 'fn');
  }
}

exports.Builder = Builder;
Builder.join = function join(fn1, fn2) {
  return _bluebird2.default.join(_bluebird2.default.try(fn1), _bluebird2.default.try(fn2), _lodash2.default.noop);
};

Builder.then = function then(fn1, fn2) {
  return _bluebird2.default.try(fn1).then(fn2).return();
};

exports.default = Builder;