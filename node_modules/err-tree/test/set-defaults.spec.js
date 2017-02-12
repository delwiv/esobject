'use strict';

var _ = require('lodash');
var expect = require('chai').expect;
var errTree = require('..');
var setDefaultMessageHandler = require('..').setDefaultMessageHandler;
var setDefaultBeautifier = require('..').setDefaultBeautifier;

describe('errTree.setDefaultMessageHandler()', function() {
  afterEach(function() {
    setDefaultMessageHandler('default');
  });

  it('is a function', function() {
    expect(setDefaultMessageHandler).to.be.a('Function');
  });

  it('can be called with a name', function() {
    function test() {
      setDefaultMessageHandler('default');
    }

    expect(test).to.not.throw();
  });

  it('should throw if an invalid name is provided', function() {
    function test() {
      setDefaultMessageHandler('invalid');
    }

    expect(test).to.throw(errTree.ErrTreeError);
  });

  it('should change the default messageHandler', function() {
    errTree.BasicError.prototype.messageHandler = undefined;
    setDefaultMessageHandler('default');

    expect(errTree.BasicError.prototype.messageHandler).to.not.be.undefined;
  });

  it('should accept a function', function() {
    errTree.BasicError.prototype.messageHandler = undefined;
    setDefaultMessageHandler(_.identity);

    expect(errTree.BasicError.prototype.messageHandler).to.be.eql(_.identity);
  });

  it('should pass the options to the proper constructor', function() {
    function test() {
      setDefaultMessageHandler('default', 42);
    }

    expect(test).to.throw(errTree.ErrtreeError, 'Options parameter should be an object');
  });
});

describe('errTree.setDefaultBeautifier()', function() {
  var errorToString = Error.prototype.toString;
  var addedFields = [
    'toString',
    'inspect',
    'beautifier',
    'getExerpt',
    'findExerpt'
  ];
  afterEach(function() {
    addedFields.forEach(function(field) {
      delete Error.prototype[field];
    });
    setDefaultBeautifier('default');
    Error.prototype.toString = errorToString;
  });

  it('is a function', function() {
    expect(setDefaultBeautifier).to.be.a('Function');
  });

  it('can be called with a name', function() {
    function test() {
      setDefaultBeautifier('complex');
    }

    expect(test).to.not.throw();
  });

  it('should throw if an invalid name is provided', function() {
    function test() {
      setDefaultBeautifier('invalid');
    }

    expect(test).to.throw(errTree.ErrTreeError);
  });

  it('should accept a function', function() {
    errTree.BasicError.prototype.beautifier = undefined;
    setDefaultBeautifier(errTree.beautifiers.get('default'));

    expect(errTree.BasicError.prototype.beautifier).to.not.be.undefined;
  });

  it('should change the default beautifier', function() {
    errTree.BasicError.prototype.beautifier = undefined;
    setDefaultBeautifier('default');

    expect(errTree.BasicError.prototype.beautifier).to.not.be.undefined;
  });

  it('should pass the options to the proper constructor', function() {
    function test() {
      setDefaultBeautifier('default', 42);
    }

    expect(test).to.throw(errTree.ErrtreeError, 'Options parameter should be an object');
  });

  it('should accept a specific onError option enabling beautifying on all Errors', function() {
    setDefaultBeautifier('default', {onError: true});
    var BasicProto = errTree.BasicError.prototype;
    expect(Error.prototype.toString).to.be.equal(BasicProto.toString);
    expect(Error.prototype.inspect).to.be.equal(BasicProto.toString);
    expect(Error.prototype.beautifier).to.be.equal(BasicProto.beautifier);
    expect(Error.prototype.getExerpt).to.be.equal(BasicProto.getExerpt);
    expect(Error.prototype.findExerpt).to.be.equal(BasicProto.findExerpt);
  });
});
