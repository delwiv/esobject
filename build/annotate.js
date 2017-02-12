'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.annotate = annotate;
exports.injector = injector;

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _errors = require('./errors');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } } /**
                                                                                                                                                                                                 * This file is heavily inspired from the annotate function in AngularJS.
                                                                                                                                                                                                 * Thanks a lot to all the AngularJS team.
                                                                                                                                                                                                 */

// Annotation

const FN_ARGS = /^function\s*[^\(]*\(\s*([^\)]*)\)/m;
const FN_ARROW_ARGS = /^\s*?\(?([^\)]*?)\)?\s*?=>/m;
const FN_ARG_SPLIT = /,/;
const FN_ARG = /^\s*(_?)(.+?)\1\s*$/;
const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
const STRIP_NORMAL_COMMENTS = /((\/\/.*$)|(\/\*([^!][\s\S]*?)?\*\/))/mg;
const MATCH_ARG_COMMENT = /\/\*!\s*?([\S]+)\s*?\*\//m;

function annotate(fn) {
  if (!_lodash2.default.isFunction(fn)) throw new _errors.ESTypeError('[annotate] fn is not a function');

  const $inject = [];
  const fnText = fn.toString().replace(STRIP_NORMAL_COMMENTS, '');
  let argDecl = fnText.match(FN_ARGS);

  if (!argDecl) argDecl = fnText.match(FN_ARROW_ARGS);

  _lodash2.default.each(argDecl[1].split(FN_ARG_SPLIT), function (arg) {
    const match = arg.match(MATCH_ARG_COMMENT);

    if (match) {
      $inject.push(match[1]);
      return;
    }

    arg = arg.replace(STRIP_COMMENTS, '');

    arg.replace(FN_ARG, function (all, underscore, name) {
      $inject.push(name);
    });
  });

  return $inject;
}

function injector(method, resolver) {
  var inject = null;
  if (_lodash2.default.isArray(method)) {
    inject = method.slice(0);
    method = inject.pop();
  } else inject = method.$inject || annotate(method);

  const getArgs = _lodash2.default.reduce(inject, (prevArgs, argName) => function () {
    const args = prevArgs.call.apply(prevArgs, [this].concat(Array.prototype.slice.call(arguments)));
    args.push(resolver.call.apply(resolver, [this, argName].concat(Array.prototype.slice.call(arguments))));
    return args;
  }, () => []);

  function injectable() {
    var _method;

    return (_method = method).call.apply(_method, [this].concat(_toConsumableArray(getArgs.call.apply(getArgs, [this].concat(Array.prototype.slice.call(arguments))))));
  }
  injectable.injected = method;
  return injectable;
}

exports.default = annotate;