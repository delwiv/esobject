import _ from 'lodash';
import Promise from 'bluebird';

export class Builder {
  constructor(builds = {}) {
    this.builds = _.mapValues(builds, build => ({attach: Builder.join, fn: build}));
  }

  addToBuild(name, fn) {
    if (!(name in this.builds)) {
      this.builds[name] = {attach: Builder.join, fn: fn};
      return this;
    }

    const prevBuild = _.clone(this.builds[name]);
    this.builds[name].fn = function(...args) {
      return prevBuild.attach(() => prevBuild.fn.call(this, ...args), () => fn.call(this, ...args));
    };
    this.builds[name].fn.strategyName = prevBuild.fn.strategyName;
    this.builds[name].fn.strategyPrefix = prevBuild.fn.strategyPrefix;

    return this;
  }

  next(handler) {
    _.each(this.builds, build => {
      build.attach = handler;
    });
  }

  getBuilds() {
    return _.mapValues(this.builds, 'fn');
  }
}

Builder.join = function join(fn1, fn2) {
  return Promise.join(Promise.try(fn1), Promise.try(fn2), _.noop);
};

Builder.then = function then(fn1, fn2) {
  return Promise.try(fn1).then(fn2).return();
};

export default Builder;
