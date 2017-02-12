'use strict';

var expect = require('chai').expect;
var errTree = require('..');
var BasicError = errTree.BasicError;

describe('errTree.BasicError', function() {
  it('is a function', function() {
    expect(BasicError).to.be.a('Function');
  });

  it('can be called with new', function() {
    function test() {
      return new BasicError();
    }

    expect(test).not.to.throw();
  });

  describe('<1 arg>', function() {
    afterEach(function() {
      BasicError.prototype.defaultCode = 500;
      BasicError.prototype.defaultNs = '';
    });

    it('accepts message only', function() {
      var err = new BasicError('testmessage');
      expect(err).to.have.properties({
        ns: '',
        message: 'testmessage',
        code: 500,
        data: {}
      });
    });

    it('select proper defaults', function() {
      BasicError.prototype.defaultCode = 404;
      BasicError.prototype.defaultNs = 'defaultNsTest';
      var err = new BasicError('testmessage');
      expect(err).to.have.properties({
        ns: 'defaultNsTest',
        message: 'testmessage',
        code: 404,
        data: {}
      });
    });
  });

  describe('<2 args>', function() {
    it('accepts 1st argument namespace', function() {
      var err = new BasicError('testns', 'testmessage');
      expect(err).to.have.properties({
        ns: 'testns',
        message: 'testmessage',
        code: 500,
        data: {}
      });
    });

    it('accepts 2nd argument code', function() {
      var err = new BasicError('testmessage', 404);
      expect(err).to.have.properties({
        ns: '',
        message: 'testmessage',
        code: 404,
        data: {}
      });
    });

    it('accepts 2nd argument data', function() {
      var err = new BasicError('testmessage', {test: 'foo'});
      expect(err).to.have.properties({
        ns: '',
        message: 'testmessage',
        code: 500,
        data: {test: 'foo'}
      });
    });
  });

  describe('<3 args>', function() {
    it('accepts 1st argument namespace & 3rd code', function() {
      var err = new BasicError('testns', 'testmessage', 404);
      expect(err).to.have.properties({
        ns: 'testns',
        message: 'testmessage',
        code: 404,
        data: {}
      });
    });

    it('accepts 1st argument namespace & 3rd data', function() {
      var err = new BasicError('testns', 'testmessage', {test: 'foo'});
      expect(err).to.have.properties({
        ns: 'testns',
        message: 'testmessage',
        code: 500,
        data: {test: 'foo'}
      });
    });

    it('accepts 2nd argument code & 3rd data', function() {
      var err = new BasicError('testmessage', 404, {test: 'foo'});
      expect(err).to.have.properties({
        ns: '',
        message: 'testmessage',
        code: 404,
        data: {test: 'foo'}
      });
    });

    it('accepts 2nd argument data & 3rd devdata', function() {
      var err = new BasicError('testmessage', {test: 'foo'}, {devtest: 'bar'});
      expect(err).to.have.properties({
        ns: '',
        message: 'testmessage',
        code: 500,
        data: {test: 'foo', devtest: 'bar'}
      });
    });
  });

  describe('<4 args>', function() {
    it('accepts 1st argument namespace & no dev data', function() {
      var err = new BasicError('testns', 'testmessage', 404, {test: 'foo'});
      expect(err).to.have.properties({
        ns: 'testns',
        message: 'testmessage',
        code: 404,
        data: {test: 'foo'}
      });
    });

    it('accepts 1st message up to devdata', function() {
      var err = new BasicError('testmessage', 404, {test: 'foo'}, {devtest: 'bar'});
      expect(err).to.have.properties({
        ns: '',
        message: 'testmessage',
        code: 404,
        data: {test: 'foo', devtest: 'bar'}
      });
    });

    it('accepts all but code', function() {
      var err = new BasicError('testns', 'testmessage', {test: 'foo'}, {devtest: 'bar'});
      expect(err).to.have.properties({
        ns: 'testns',
        message: 'testmessage',
        data: {test: 'foo', devtest: 'bar'}
      });
    });
  });

  describe('<5 args>', function() {
    afterEach(function() {
      process.env.NODE_ENV = 'test';
    });

    it('accepts all arguments together', function() {
      var err = new BasicError('testns', 'testmessage', 404, {test: 'foo'}, {devtest: 'bar'});
      expect(err).to.have.properties({
        ns: 'testns',
        message: 'testmessage',
        code: 404,
        data: {test: 'foo', devtest: 'bar'}
      });
    });

    it('ignores devdata in production', function() {
      process.env.NODE_ENV = 'production';
      var err = new BasicError('testns', 'testmessage', 404, {test: 'foo'}, {devtest: 'bar'});
      expect(err).to.have.property('data').that.has.not.a.property('devtest');
    });
  });

  describe('#instance', function() {
    var inst;
    beforeEach(function() {
      inst = new BasicError('message');
    });

    it('is an instance of BasicError', function() {
      expect(inst).to.be.an.instanceOf(BasicError);
    });

    it('is an instance of Error', function() {
      expect(inst).to.be.an.instanceOf(Error);
    });

    describe('.toString()', function() {
      it('is a function different from Error', function() {
        expect(inst)
          .to.have.property('toString')
          .that.is.a('Function')
          .and.that.is.not.equal(Error.prototype.toString)
        ;
      });

      it('return a string equal to err.stack', function() {
        expect(inst.toString()).to.be.a('String').that.is.equal(inst.stack);
      });

      it('use the parsed stack in data.originalError if there is one', function() {
        inst = new errTree.ErrtreeError('message', {originalError: new errTree.ErrtreeError()});
        expect(inst.toString()).to.be.a('String').that.is.equal(inst.stack);
      });

      it('use the stack in data.originalError if there is one', function() {
        inst.data.originalError = new Error();
        inst = new errTree.ErrtreeError('message', {originalError: new Error()});
        expect(inst.toString()).to.be.a('String').that.is.equal(inst.stack);
      });

      it('reflect changes in namespace', function() {
        inst.ns = 'my:super:ns';
        expect(inst.toString()).to.be.a('String').that.contain('my:super:ns');
      });

      it('reflect changes in message', function() {
        inst.message = 'new testmessage';
        expect(inst.toString()).to.be.a('String').that.contain('new testmessage');
      });

      it('reflect changes in code', function() {
        inst.code = 404;
        expect(inst.toString()).to.be.a('String').that.contain('code(404)');
      });

      it('reflect changes in parsedStack', function() {
        inst.parsedStack = [];
        expect(inst.toString()).to.be.a('String').that.not.contain(' at ');
      });
    });

    describe('.beautifier()', function() {
      it('is a function', function() {
        expect(inst)
          .to.have.property('beautifier')
          .that.is.a('Function')
        ;
      });

      it('return a string equal to err.stack', function() {
        expect(inst.beautifier(inst)).to.be.a('String').that.is.equal(inst.stack);
      });
    });

    describe('.messageHandler()', function() {
      it('is a function', function() {
        expect(inst)
          .to.have.property('messageHandler')
          .that.is.a('Function')
        ;
      });

      it('return a string equal to err.message', function() {
        expect(inst.messageHandler(inst)).to.be.equal('message');
      });
    });

    describe('.selectExerpt()', function() {
      it('is a function', function() {
        expect(inst)
          .to.have.property('selectExerpt')
          .that.is.a('Function')
        ;
      });

      it('returns falsy if provided argument does not contain a dirname', function() {
        expect(inst.selectExerpt({})).to.be.not.ok;
      });

      it('returns falsy if provided argument contains a dirname with node_modules/ in it', function() {
        expect(inst.selectExerpt({dirname: 'tests/node_modules/tests'})).to.be.not.ok;
      });

      it('returns true otherwise', function() {
        expect(inst.selectExerpt({dirname: 'ok/'})).to.be.true;
      });
    });

    describe('.getExerpt()', function() {
      it('is a function', function() {
        expect(inst)
          .to.have.property('getExerpt')
          .that.is.a('Function')
        ;
      });

      it('return a string containing the current filename', function() {
        expect(inst.getExerpt()).to.be.a('String').that.contain(__filename);
      });

      it('pass options down to file exerpt', function() {
        var res1 = inst.getExerpt();
        var res2 = inst.getExerpt({colors: false});
        expect(res1).not.to.be.equal(res2);
      });

      it('return the first line of a stack when nothing matches', function() {
        inst.parsedStack = [{file: 'file'}];
        expect(inst.getExerpt()).to.be.equal('');
      });
    });

    describe('.toJSON()', function() {
      var nodeEnv = process.env.NODE_ENV;

      afterEach(function() {
        process.env.NODE_ENV = nodeEnv;
      });

      it('is a function', function() {
        expect(inst)
          .to.have.property('toJSON')
          .that.is.a('Function')
        ;
      });

      it('returns an object', function() {
        expect(inst.toJSON()).to.be.an('Object');
      });

      it('should have the ns, code, name, message, data & parsedStack attributes if NODE_ENV ' +
        'is not production', function() {
        process.env.NODE_ENV = 'test';

        expect(inst.toJSON()).to.have.properties({
          ns: inst.ns,
          code: inst.code,
          name: inst.name,
          message: inst.message,
          data: inst.data,
          parsedStack: inst.parsedStack
        });
      });

      it('should have the ns, code, name, message & data attributes if NODE_ENV is production', function() {
        process.env.NODE_ENV = 'production';

        expect(inst.toJSON()).to.have.properties({
          ns: inst.ns,
          code: inst.code,
          name: inst.name,
          message: inst.message,
          data: inst.data
        });

        expect(inst.toJSON()).to.not.have.property('parsedStack');
      });
    });
  });
});
