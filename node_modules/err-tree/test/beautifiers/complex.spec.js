'use strict';

var expect = require('chai').expect;
var errTree = require('../..');
var complexBeautifier = errTree.beautifiers.complex();
var chalk = require('chalk');

describe('errTree.beautifiers', function() {
  describe('#complex', function() {
    var err;
    beforeEach(function() {
      err = new errTree.BasicError('message');
      // tweak stack trace to add an as in it
      err.parsedStack[1].as = 'astest';
    });

    it('is a function', function() {
      expect(complexBeautifier).to.be.a('Function');
    });

    it('uses colors by default', function() {
      expect(complexBeautifier(err))
        .to.not.be.equal(chalk.stripColor(complexBeautifier(err)))
      ;
    });

    it('supports ns', function() {
      err.ns = 'my:sub:ns';
      function test() {
        complexBeautifier(err);
      }
      expect(test).to.not.throw();
    });

    it('does not fail when code is missing', function() {
      err.code = undefined;
      function test() {
        complexBeautifier(err);
      }
      expect(test).to.not.throw();
    });

    it('does not fail when message is missing', function() {
      err.message = undefined;
      var res;
      function test() {
        res = complexBeautifier(err);
      }
      expect(test).to.not.throw();
      expect(res).to.contain('<missing error message>');
    });

    it('does not fail when function is not specified in a stack entry', function() {
      delete err.parsedStack[1].fn;
      function test() {
        complexBeautifier(err);
      }
      expect(test).to.not.throw();
    });

    it('contains a file exerpt by default', function() {
      expect(complexBeautifier(err)).to.contain(__filename);
    });

    it('option exerpt can disable the exerpt rendering', function() {
      var complex = errTree.beautifiers.complex({exerpt: false});
      expect(complex(err)).to.not.contain(__filename);
    });

    it('option colors can disable the colors in rendering', function() {
      var complex = errTree.beautifiers.complex({colors: false});
      var render = complex(err);
      expect(render).to.be.equal(chalk.stripColor(render));
    });

    it('other options are also passed to file exerpt', function() {
      var complex = errTree.beautifiers.complex({exerptAfter: 10});
      expect(complex(err)).to.not.be.equal(complexBeautifier(err));
    });
  });
});
