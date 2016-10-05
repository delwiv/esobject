/**
 * This file is heavily inspired from the annotate function in AngularJS.
 * Thanks a lot to all the AngularJS team.
 */

import _ from 'lodash';

// Annotation

const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
const FN_ARROW_ARGS = /^\s*?\(?([^\)]*?)\)?\s*?=>/m;
const FN_ARG_SPLIT = /,/;
const FN_ARG = /^\s*(_?)(.+?)\1\s*$/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const STRIP_NORMAL_COMMENTS = /((\/\/.*$)|(\/\*([^!][\s\S]*?)?\*\/))/mg;
const MATCH_ARG_COMMENT = /\/\*!\s*?([\S]+)\s*?\*\//m;

export function annotate(fn) {
  if (!_.isFunction(fn))
    throw new Error('[annotate] fn is not a function');

  const $inject = [];
  const fnText = fn.toString().replace(STRIP_NORMAL_COMMENTS, '');
  let argDecl = fnText.match(FN_ARGS);

  if (!argDecl)
    argDecl = fnText.match(FN_ARROW_ARGS);

  _.each(argDecl[1].split(FN_ARG_SPLIT), function(arg) {
    const match = arg.match(MATCH_ARG_COMMENT);

    if (match) {
      $inject.push(match[1]);
      return;
    }

    arg = arg.replace(STRIP_COMMENTS, '');

    arg.replace(FN_ARG, function(all, underscore, name) {
      $inject.push(name);
    });
  });

  return $inject;
}

export function injector(method, resolver) {
  var inject = null;
  if (_.isArray(method)) {
    inject = method.slice(0);
    method = inject.pop();
  }
  else
    inject = method.$inject || annotate(method);

  const getArgs = _.reduce(inject, (prevArgs, argName) => function() {
    const args = prevArgs.call(this, ...arguments);
    args.push(resolver.call(this, argName, ...arguments));
    return args;
  }, () => []);

  return function() {
    return method.call(this, ...getArgs.call(this, ...arguments));
  };
}

export default annotate;
