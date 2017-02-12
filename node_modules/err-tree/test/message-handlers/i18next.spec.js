'use strict';

var sinon = require('sinon');
var expect = require('chai').expect;
var errTree = require('../..');
var i18next = require('i18next');
var Backend = require('i18next-node-fs-backend');

var i18nextMessageHandler = errTree.messageHandlers.i18next({i18next: i18next});

i18next.use(Backend);

function createError(name, ns, message, code, data) {
  return {
    name: name || 'Test',
    ns: ns || '',
    message: message || 'default_msg',
    code: code || 500,
    data: data || {}
  };
}

describe('errTree.messageHandlers', function() {
  before(function(done) {
    i18next.init({
      lng: 'en',
      ns: ['errors'],
      backend: {
        loadPath: __dirname + '/locales/{{lng}}/{{ns}}.yml',
      },
      debug: false,
    }, function() {
      done();
    });
  });

  describe('#i18next', function() {
    it('is a function', function() {
      expect(i18nextMessageHandler).to.be.a('Function');
    });

    it('throws if instanciated without an options object', function() {
      function test() {
        errTree.messageHandlers.i18next();
      }
      expect(test).to.throw(errTree.ErrtreeError,
        'The options parameter is required to activate the i18next message handler');
    });

    it('throws if instanciated with an invalid option parameter', function() {
      function test() {
        errTree.messageHandlers.i18next(42);
      }
      expect(test).to.throw(errTree.ErrtreeError, 'Invalid options parameter: it should be an object');
    });

    it('throws if instanciated without an options.i18next function', function() {
      function test() {
        errTree.messageHandlers.i18next({i18next: 42});
      }
      expect(test).to.throw(errTree.ErrtreeError,
        'Invalid options.i18next: please provide a valid instance of i18next');
    });

    describe('<i18next values>', function() {
      beforeEach(function() {
        sinon.spy(i18next, 't');
      });
      afterEach(function() {
        i18next.t.restore();
        process.env.NODE_ENV = 'test';
      });

      it('should pass "ns = errors" to translate keys', function() {
        i18nextMessageHandler(createError('Named'));
        expect(i18next.t)
          .to.have.been.calledOnce
          .and.to.have.been.calledWith('Named.default_msg')
        ;
        expect(i18next.t.firstCall.args[1]).to.have.property('ns', 'errors');
      });

      it('should pass "defaultValue: " to translate keys', function() {
        i18nextMessageHandler(createError('Named'));
        expect(i18next.t)
          .to.have.been.calledOnce
          .and.to.have.been.calledWith('Named.default_msg')
        ;
        expect(i18next.t.firstCall.args[1]).to.have.property('defaultValue', '');
      });

      it('should pass "data: data" to translate keys', function() {
        var data = {prop: 'test'};
        i18nextMessageHandler(createError('Named', '', 'default_msg', 500, data));
        expect(i18next.t)
          .to.have.been.calledOnce
          .and.to.have.been.calledWith('Named.default_msg')
        ;
        expect(i18next.t.firstCall.args[1]).to.have.property('data', data);
      });

      it('should pass "err: <err codes, …>" to translate keys', function() {
        i18nextMessageHandler(createError('Named', '', 'default_msg', 404));
        expect(i18next.t)
          .to.have.been.calledOnce
          .and.to.have.been.calledWith('Named.default_msg')
        ;
        expect(i18next.t.firstCall.args[1])
          .to.have.property('err')
          .that.is.deep.equal({
            name: 'Named',
            ns: '',
            code: 404,
            strCode: 'default_msg'
          })
        ;
      });

      it('should add data to root object to translate keys', function() {
        var data = {prop: 'test'};
        i18nextMessageHandler(createError('Named', '', 'default_msg', 404, data));
        expect(i18next.t)
          .to.have.been.calledOnce
          .and.to.have.been.calledWith('Named.default_msg')
        ;
        expect(i18next.t.firstCall.args[1]).to.have.properties(data);
      });

      it('should hide data properties with others on root object to translate keys', function() {
        var data = {ns: 'lol'};
        i18nextMessageHandler(createError('Named', '', 'default_msg', 404, data));
        expect(i18next.t)
          .to.have.been.calledOnce
          .and.to.have.been.calledWith('Named.default_msg')
        ;
        expect(i18next.t.firstCall.args[1]).to.have.properties({
          ns: 'errors',
          data: data
        });
      });

      it('should add context dev by default', function() {
        i18nextMessageHandler(createError('Named', '', 'default_msg', 404));
        expect(i18next.t)
          .to.have.been.calledOnce
          .and.to.have.been.calledWith('Named.default_msg')
        ;
        expect(i18next.t.firstCall.args[1]).to.have.property('context', 'dev');
      });

      it('should not context dev in production', function() {
        process.env.NODE_ENV = 'production';
        i18nextMessageHandler(createError('Named', '', 'default_msg', 404));
        expect(i18next.t)
          .to.have.been.calledOnce
          .and.to.have.been.calledWith('Named.default_msg')
        ;
        expect(i18next.t.firstCall.args[1]).to.have.property('context', null);
      });
    });

    describe('<no ns>', function() {
      it('returns message from <root>.<error name> whenever possible', function() {
        expect(i18nextMessageHandler(createError('Named')))
          .to.be.equal('Named.default_msg')
        ;
      });

      it('returns message from <root> otherwise', function() {
        expect(i18nextMessageHandler(createError())).to.be.equal('default_msg');
      });

      it('fallsback to <root>.key_not_found if everything else fails', function() {
        expect(i18nextMessageHandler(createError('Test', '', 'not_found')))
          .to.be.equal('key_not_found (not_found)')
        ;
      });
    });

    describe('<simple ns>', function() {
      it('returns message in <root>.<ns>.<error name> whenever possible', function() {
        expect(i18nextMessageHandler(createError('Named', 'ns', 'foundnsnamed')))
          .to.be.equal('ns.Named.foundnsnamed')
        ;
      });

      it('returns message from <root>.<error name> otherwise', function() {
        expect(i18nextMessageHandler(createError('Named', 'ns')))
          .to.be.equal('Named.default_msg')
        ;
      });

      it('returns message from <root>.<ns> otherwise', function() {
        expect(i18nextMessageHandler(createError('Named', 'ns', 'foundns')))
          .to.be.equal('ns.foundns')
        ;
      });

      it('returns message from <root> otherwise', function() {
        expect(i18nextMessageHandler(createError('Test', 'ns', 'default_msg')))
          .to.be.equal('default_msg')
        ;
      });

      it('fallsback to <root>.key_not_found if everything else fails', function() {
        expect(i18nextMessageHandler(createError('Test', 'ns', 'not_found')))
          .to.be.equal('key_not_found (not_found)')
        ;
      });
    });

    describe('<sub ns>', function() {
      it('returns message in <root>.<ns>.<sub>.<error name> whenever possible', function() {
        expect(i18nextMessageHandler(createError('Named', 'ns:sub', 'foundnssubnamed')))
          .to.be.equal('ns.sub.Named.foundnssubnamed')
        ;
      });

      it('returns message from <root>.<ns>.<error name> otherwise', function() {
        expect(i18nextMessageHandler(createError('Named', 'ns:sub', 'foundnsnamed')))
          .to.be.equal('ns.Named.foundnsnamed')
        ;
      });

      it('returns message from <root>.<error name> otherwise', function() {
        expect(i18nextMessageHandler(createError('Named', 'ns:sub')))
          .to.be.equal('Named.default_msg')
        ;
      });

      it('returns message from <root>.<ns>.<sub> otherwise', function() {
        expect(i18nextMessageHandler(createError('Named', 'ns:sub', 'foundnssub')))
          .to.be.equal('ns.sub.foundnssub')
        ;
      });

      it('returns message from <root>.<sub> otherwise', function() {
        expect(i18nextMessageHandler(createError('Named', 'ns:sub', 'foundns')))
          .to.be.equal('ns.foundns')
        ;
      });

      it('returns message from <root> otherwise', function() {
        expect(i18nextMessageHandler(createError('Test', 'ns:sub', 'default_msg')))
          .to.be.equal('default_msg')
        ;
      });

      it('fallsback to <root>.key_not_found if everything else fails', function() {
        expect(i18nextMessageHandler(createError('Test', 'ns:sub', 'not_found')))
          .to.be.equal('key_not_found (not_found)')
        ;
      });
    });
  });
});
