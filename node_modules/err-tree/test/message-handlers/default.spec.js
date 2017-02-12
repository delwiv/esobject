'use strict';

var expect = require('chai').expect;
var errTree = require('../..');
var defaultMessageHandler = errTree.messageHandlers.default();

describe('errTree.messageHandlers', function() {
  describe('#default', function() {
    it('is a function', function() {
      expect(defaultMessageHandler).to.be.a('Function');
    });

    it('returns err.message', function() {
      expect(defaultMessageHandler({message: 'testmessage'})).to.be.equal('testmessage');
    });
  });
});
