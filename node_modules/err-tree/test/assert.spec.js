'use strict';

var expect = require('chai').expect;
var createAssert = require('..').createAssert;

describe('errTree.createAssert()', function() {
  it('is a function', function() {
    expect(createAssert).to.be.a('Function');
  });

  describe('-> return value', function() {
    it('is a function', function() {
      expect(createAssert()).to.be.a('Function');
    });

    it('does not throw if its first argument is true', function() {
      var myAssert = createAssert(Error);

      function test() {
        myAssert(true);
      }

      expect(test).to.not.throw();
    });

    it('throws if its first argument is false', function() {
      var myAssert = createAssert(Error);

      function test() {
        myAssert(false);
      }

      expect(test).to.throw(Error);
    });

    it('uses subsequent arguments to create the error', function() {
      var myAssert = createAssert(Error);

      function test() {
        myAssert(false, 'message');
      }

      expect(test).to.throw(Error, 'message');
    });
  });
});
