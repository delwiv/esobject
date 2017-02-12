'use strict';

var expect = require('chai').expect;
var errTree = require('..');

describe('errTree()', function() {
  it('is a function', function() {
    expect(errTree).to.be.a('Function');
  });

  it('returns a named function named as the first argument if it is a string', function() {
    expect(errTree('Test')).to.be.a('Function').that.has.a.property('name', 'Test');
  });

  it('returns the provided function if the first argument is a function', function() {
    function Test() {}
    expect(errTree(Test)).to.be.equal(Test);
  });

  it('should throw if first argument is invalid', function() {
    function test() {
      errTree(42);
    }
    expect(test).to.throw(errTree.ErrtreeError,
      'Invalid Error parameter: expected a string or a named function');
  });

  it('should throw if first argument is not a valid name', function() {
    function test() {
      errTree('0test');
    }
    expect(test).to.throw(errTree.ErrtreeError,
      'Invalid Error parameter: invalid name "0test"');
  });

  it('should throw if first argument is an anonymous function', function() {
    function test() {
      errTree(function() {});
    }
    expect(test).to.throw(errTree.ErrtreeError,
      'Invalid Error parameter: expected a named function (an anonymous function was provided)');
  });

  it('should accept an Error inheriting from errTree.BasicError as second argument', function() {
    function test() {
      errTree(function Test() {}, errTree.ErrtreeError);
    }
    expect(test).to.not.throw();
  });

  it('should throw if second argument is not a function nor an object', function() {
    function test() {
      errTree(function Test() {}, 42);
    }
    expect(test).to.throw(errTree.ErrtreeError,
      'Invalid BaseError parameter: a constructor inheriting from BasicError is expected');
  });

  it('should throw if second argument is not inheriting errTree.BaseError', function() {
    function test() {
      errTree(function Test() {}, Error);
    }
    expect(test).to.throw(errTree.ErrtreeError,
      'Invalid BaseError parameter: a constructor inheriting from BasicError is expected');
  });

  it('should throw if third argument is not an object', function() {
    function test() {
      errTree(function Test() {}, errTree.ErrtreeError, 42);
    }
    expect(test).to.throw(errTree.ErrtreeError, 'Invalid options parameter: expected an object');
  });

  it('should accept an options object as second argument', function() {
    function test() {
      errTree(function Test() {}, {defaultCode: 404});
    }
    expect(test).to.not.throw();
  });

  it('should accept an options object as third argument', function() {
    function test() {
      errTree(function Test() {}, errTree.ErrtreeError, {defaultCode: 404});
    }
    expect(test).to.not.throw();
  });

  it('should throw if an invalid option is provided', function() {
    function test() {
      errTree(function Test() {}, {invalid: true});
    }
    expect(test).to.throw(errTree.ErrtreeError,
      'Invalid options parameter: unknown option(s) [invalid].');
  });

  it('should return a function inheriting from the second argument', function() {
    expect(errTree('Test', errTree.ErrtreeError))
      .to.have.property('prototype')
      .that.is.an.instanceOf(errTree.ErrtreeError)
    ;
  });

  it('should add valid options to the prototype of the returned function', function() {
    var options = {
      defaultCode: 404,
      defaultNs: 'testns',
      selectExerpt: function() {},
      messageHandler: function() {},
      beautifier: function() {}
    };
    expect(errTree('Test', options))
      .to.have.property('prototype')
      .that.has.properties(options)
    ;
  });

  it('should add an assert method to the returned function that throws properly', function() {
    var ErrType = errTree('ErrType');
    function test() {
      ErrType.assert(false);
    }
    expect(ErrType).to.have.property('assert').that.is.a('Function');
    expect(test).to.throw(ErrType);
  });

  it('should mutate the selectExerpt option into a proper function if it is a number', function() {
    var options = {selectExerpt: 2};
    var res = errTree('ErrType', options);
    expect(res)
      .to.have.deep.property('prototype.selectExerpt')
      .that.is.equal(options.selectExerpt)
      .that.is.a('Function')
    ;
    expect(options.selectExerpt({}, 2)).to.be.not.ok;
    expect(options.selectExerpt({dirname: '/test'}, 1)).to.be.not.ok;
    expect(options.selectExerpt({dirname: '/test'}, 2)).to.be.ok;
  });

  it('should mutate the selectExerpt option into a proper function if it is a string', function() {
    var options = {selectExerpt: 'test/**'};
    var res = errTree('ErrType', options);
    expect(res)
      .to.have.deep.property('prototype.selectExerpt')
      .that.is.equal(options.selectExerpt)
      .that.is.a('Function')
    ;
    expect(options.selectExerpt({})).to.be.not.ok;
    expect(options.selectExerpt({dirname: 'lib/', path: 'lib/file'})).to.be.not.ok;
    expect(options.selectExerpt({dirname: 'test/', path: 'test/file'})).to.be.ok;
  });

  it('should mutate the selectExerpt option into a proper function if it is a string', function() {
    var options = {selectExerpt: ['test/**', 'test2/**', '!test/file2']};
    var res = errTree('ErrType', options);
    expect(res)
      .to.have.deep.property('prototype.selectExerpt')
      .that.is.equal(options.selectExerpt)
      .that.is.a('Function')
    ;
    expect(options.selectExerpt({})).to.be.not.ok;
    expect(options.selectExerpt({dirname: 'lib/', path: 'lib/file'})).to.be.not.ok;
    expect(options.selectExerpt({dirname: 'test/', path: 'test/file'})).to.be.ok;
    expect(options.selectExerpt({dirname: 'test/', path: 'test/file2'})).to.be.not.ok;
    expect(options.selectExerpt({dirname: 'test2/', path: 'test2/file'})).to.be.ok;
    expect(options.selectExerpt({dirname: 'test2/', path: 'test2/file2'})).to.be.ok;
  });

  it('should mutate properly selectExerpt with only negate patterns', function() {
    var options = {selectExerpt: ['!test/file2', '!test2/file']};
    var res = errTree('ErrType', options);
    expect(res)
      .to.have.deep.property('prototype.selectExerpt')
      .that.is.equal(options.selectExerpt)
      .that.is.a('Function')
    ;
    expect(options.selectExerpt({})).to.be.not.ok;
    expect(options.selectExerpt({dirname: 'lib/', path: 'lib/file'})).to.be.ok;
    expect(options.selectExerpt({dirname: 'test/', path: 'test/file'})).to.be.ok;
    expect(options.selectExerpt({dirname: 'test/', path: 'test/file2'})).to.be.not.ok;
    expect(options.selectExerpt({dirname: 'test2/', path: 'test2/file'})).to.be.not.ok;
    expect(options.selectExerpt({dirname: 'test2/', path: 'test2/file2'})).to.be.ok;
  });
});
