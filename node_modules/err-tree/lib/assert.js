'use strict';

function newApply(Ctor, args) {
  Array.prototype.unshift.call(args, Ctor);
  return new (Function.prototype.bind.apply(Ctor, args))();
}

module.exports.createAssert = function(ErrorType) {
  return function assert(condition) {
    if (condition)
      return;


    throw newApply(ErrorType, Array.prototype.slice.call(arguments, 1));
  };
};
