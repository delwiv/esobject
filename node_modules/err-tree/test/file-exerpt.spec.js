'use strict';

var expect = require('chai').expect;
var fileExerpt = require('..').fileExerpt;
var chalk = require('chalk');
var fs = require('fs');

describe('errTree.fileExerpt()', function() {
  it('is a function', function() {
    expect(fileExerpt).to.be.a('Function');
  });

  it('returns an exerpt from a ctx argument', function() {
    var res = fileExerpt({
      path: __filename,
      line: 1,
      column: 1
    });

    expect(res).to.be.a('String').that.contain(__filename);
  });

  it('uses colors by default', function() {
    var res = fileExerpt({
      path: __filename,
      line: 1,
      column: 1
    });

    expect(res).to.be.a('String').that.contain(chalk.yellow(''));
  });

  it('returns 3 lines of exerpt before and after the designated line by default', function() {
    var res = fileExerpt({
      path: __filename,
      line: 4,
      column: 1
    });

    expect(res.split(/\r?\n/).length).to.be.equal(9);
  });

  it('returns nothing when given an invalid path', function() {
    var res = fileExerpt({
      path: '/no/file/is/there',
      line: 4,
      column: 1
    });

    expect(res).to.be.empty;
  });

  it('returns less lines at the top when it has to', function() {
    var res = fileExerpt({
      path: __filename,
      line: 2,
      column: 1
    });

    expect(res.split(/\r?\n/).length).to.be.equal(7);
  });

  it('returns less lines at the bottom when it has to', function() {
    var lines = fs.readFileSync(__filename, 'utf8').split(/\r?\n/).length;
    var res = fileExerpt({
      path: __filename,
      line: lines - 2,
      column: 1
    });

    expect(res.split(/\r?\n/).length).to.be.equal(7);
  });

  describe('options', function() {
    it('should not add colors when options.colors is false', function() {
      var res = fileExerpt({
        path: __filename,
        line: 4,
        column: 1
      }, {colors: false});

      expect(res).to.be.equal(chalk.stripColor(res));
    });

    it('should add options.exerptBefore lines of code before the targeted line in the exerpt', function() {
      var res = fileExerpt({
        path: __filename,
        line: 10,
        column: 1
      }, {exerptBefore: 9});

      expect(res.split(/\r?\n/).length).to.be.equal(15);
    });

    it('should add options.exerptAfter lines of code after the targeted line in the exerpt', function() {
      var res = fileExerpt({
        path: __filename,
        line: 10,
        column: 1
      }, {exerptAfter: 9});

      expect(res.split(/\r?\n/).length).to.be.equal(15);
    });
  });
});
