'use strict';

var expect = require('chai').expect;
var parseStack = require('..').parseStack;

describe('errTree.parseStack()', function() {
  it('is a funtion', function() {
    expect(parseStack).to.be.a('Function');
  });

  it('return an array', function() {
    expect(parseStack('')).to.be.an('Array');
  });

  it('trash every useless line in the stack', function() {
    expect(parseStack('useless\nuseless\nuseless\n')).to.be.empty;
  });

  it('return as many elements in the array as lines in a stack', function() {
    var err = new Error();
    expect(parseStack(err.stack)).to.have.property('length', err.stack.match(/\sat\s/g).length);
  });

  it('each elenent in the array should be an object with the proper properties', function() {
    var parsedStack = parseStack((new Error()).stack);
    parsedStack.forEach(function(ctx) {
      expect(ctx).to.be.an('Object')
        .that.has.ownProperty('path')
        .that.has.ownProperty('dirname')
        .that.has.ownProperty('basepath')
        .that.has.ownProperty('rootpath')
        .that.has.ownProperty('basename')
        .that.has.ownProperty('fn')
        .that.has.ownProperty('as')
        .that.has.ownProperty('line')
        .that.has.ownProperty('column')
      ;
    });
  });
});
