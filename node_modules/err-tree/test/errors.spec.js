'use strict';

var expect = require('chai').expect;
var errTree = require('..');
var ErrtreeError = errTree.ErrtreeError;

describe('errTree.ErrtreeError', function() {
  it('is a function', function() {
    expect(ErrtreeError).to.be.a('Function');
  });

  it('is a constructor inheriting from errTree.BasicError', function() {
    expect(ErrtreeError)
      .to.have.property('prototype')
      .that.is.an.instanceOf(errTree.BasicError)
    ;
  });

  it('has its own selectExerpt method', function() {
    expect(ErrtreeError.prototype).to.have.ownProperty('selectExerpt');
  });

  it('has its own message handler', function() {
    expect(ErrtreeError.prototype).to.have.ownProperty('messageHandler');
  });
});
