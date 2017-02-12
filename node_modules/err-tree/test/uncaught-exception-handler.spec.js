'use strict';

var sinon = require('sinon');
var expect = require('chai').expect;
var errTree = require('../');
var useUncaughtExceptionHandler = require('..').useUncaughtExceptionHandler;

describe('errTree.useUncaughtExceptionHandler()', function() {
  var listeners = process.listeners('uncaughtException');
  var error = console.error;
  var domain;
  before(function() {
    domain = process.domain;
    if (domain)
      domain.exit();
  });
  beforeEach(function() {
    sinon.stub(process, 'exit');
    console.error = sinon.stub();
    process.removeAllListeners('uncaughtException');
  });
  afterEach(function() {
    process.exit.restore();
    console.error = error;
  });
  after(function() {
    listeners.forEach(function(listener) {
      process.on('uncaughtException', listener);
    });
    if (domain)
      domain.enter();
  });

  it('should add an uncaughtException listener to process', function() {
    useUncaughtExceptionHandler();
    expect(process.listeners('uncaughtException').length).to.be.equal(1);
  });

  it('should write the error on the stderr using console.error', function(done) {
    useUncaughtExceptionHandler();
    process.on('uncaughtException', function() {
      try {
        expect(console.error)
          .to.have.been.calledTwice
          .and.to.have.been.calledWith('Uncaught exception:\n|')
        ;
      }
      catch (err) {
        return done(err);
      }
      done();
    });
    process.nextTick(function() {
      throw new errTree.ErrtreeError('uncaught');
    });
  });

  it('should also print root Errors', function(done) {
    useUncaughtExceptionHandler();
    process.on('uncaughtException', function() {
      try {
        expect(console.error)
          .to.have.been.calledTwice
          .and.to.have.been.calledWith('Uncaught exception:\n|')
        ;
      }
      catch (err) {
        return done(err);
      }
      done();
    });
    process.nextTick(function() {
      throw new Error('uncaught');
    });
  });

  it('should exit with status 8 when an exception is thrown', function(done) {
    useUncaughtExceptionHandler();
    process.on('uncaughtException', function() {
      try {
        expect(process.exit)
          .to.have.been.calledOnce
          .and.to.have.been.calledWith(8)
        ;
      }
      catch (err) {
        return done(err);
      }
      done();
    });
    process.nextTick(function() {
      throw new Error('uncaught');
    });
  });
});
