'use strict';

var expect = require('chai').expect;
var errTree = require('../..');
var defaultBeautifier = errTree.beautifiers.default();

describe('errTree.beautifiers', function() {
  describe('#default', function() {
    it('is a function', function() {
      expect(defaultBeautifier).to.be.a('Function');
    });

    it('returns a normal looking error stack when there is no namespace nor code', function() {
      var err = new Error('message');
      var ref = err.stack.toString();

      err.parsedStack = errTree.parseStack(err.stack);
      expect(defaultBeautifier(err)).to.be.equal(ref);
    });

    it('returns a normal looking error stack plus namespace', function() {
      var err = new Error('message');
      var ref = '[my:ns] ' + err.stack.toString();

      err.ns = 'my:ns';
      err.parsedStack = errTree.parseStack(err.stack);
      expect(defaultBeautifier(err)).to.be.equal(ref);
    });

    it('returns a normal looking error stack plus code', function() {
      var err = new Error('message');
      var ref = '[code(404)] ' + err.stack.toString();

      err.code = 404;
      err.parsedStack = errTree.parseStack(err.stack);
      expect(defaultBeautifier(err)).to.be.equal(ref);
    });

    it('returns a normal looking error stack plus namespace & code', function() {
      var err = new Error('message');
      var ref = '[my:ns|code(404)] ' + err.stack.toString();

      err.ns = 'my:ns';
      err.code = 404;
      err.parsedStack = errTree.parseStack(err.stack);
      expect(defaultBeautifier(err)).to.be.equal(ref);
    });

    it('if error name is missing, do not fail and use Error', function() {
      var res;
      function test() {
        var err = new Error('message');
        err = {parsedStack: errTree.parseStack(err.stack)};
        delete err.name;
        res = defaultBeautifier(err);
      }
      expect(test).to.not.throw();
      expect(res).to.contain('Error');
    });
  });
});
