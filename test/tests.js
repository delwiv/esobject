var Promise = require('bluebird');
var chai = require('chai');
var uuid = require('uuid');

var ESObject = require('../');
var expect = chai.expect;
chai.use(require('chai-properties'));
chai.use(require('chai-as-promised'));

var Test = ESObject.create({
  db: {
    host: 'localhost:9200',
    /*log: [{
      level: 'debug'
    }],*/

    index: 'esobject-tests',
    type: 'test'
  },

  mapping: __dirname + '/mappings/test',

  import: {
    answer: 42,
    answerBool: true,
    tpl: '_<%= raw.field %>_',
    ignored: undefined,
    fnImport: function(prevVal, newVal) {
      return ++newVal;
    },
    subObj: {
      added: 42,
    },
  },

  imports: {
    myImport: {
      answer: 'not42',
    },
  },

  export: {
    answer: 42,
    answerBool: true,
    tpl: '_<%= obj.field %>_',
    ignored: undefined,
    fnExport: function(prevVal) {
      return ++prevVal;
    },
    subObj: {
      added: 42,
    },
  },

  exports: {
    myExport: {
      answer: 'not42',
    },
  },
});

describe('esobject', function() {
  // Empty index
  beforeEach(function(done) {
    Test.client.indices.deleteMapping(Test.dbConfig({ignore: 404}))
      .nodeify(done)
    ;
  });

  it('should not be possible to create ESObjects directly', function() {
    function test() {
      return new ESObject('id');
    }

    expect(test).to.throw(Error, 'You should not create ESOBjects directly');
  });

  it('should index data using obj.save()', function(done) {
    var id = uuid.v4();
    var t = new Test(id);
    var res = t.save()
      .then(function() {
        return Test.client.get(Test.dbConfig({id: id}));
      })
    ;

    expect(res)
      .to.eventually.have.properties({_id: id})
      .and.to.have.property('_source').that.is.an('Object')
      .notify(done)
    ;
  });

  it('should retrieve data using ESObject.get()', function(done) {
    var id = uuid.v4();
    expect(
      Test.client.index(Test.dbConfig({id: id, body: {}}))
        .then(function() {
          return Test.get(id);
        })
    )
      .to.eventually.be.an.instanceOf(Test)
      .and.to.have.property('_id', id)
      .notify(done)
    ;
  });

  it('should not accept to create to object with the same id', function(done) {
    var id = uuid.v4();

    expect(
      (new Test(id)).save()
        .then(function() {
          return (new Test(id)).save();
        })
    )
      .to.be.rejectedWith(Error, 'DocumentAlreadyExistsException')
      .notify(done)
    ;
  });

  it('should not accept to update an object with an outdated version', function(done) {
    expect(
      (new Test()).save()
        .call('save')
        .then(function(res) {
          res._version = 1;
          return res.save();
        })
    )
      .to.eventually.be.rejectedWith(Error, 'VersionConflictEngineException')
      .notify(done)
    ;
  });

  it('should not accept to update an object with a superior version', function(done) {
    expect(
      (new Test()).save()
        .then(function(res) {
          res._version = 2;
          return res.save();
        })
    )
      .to.eventually.be.rejectedWith(Error, 'VersionConflictEngineException')
      .notify(done)
    ;
  });

  it('should support ttls', function(done) {
    var id = uuid.v4();
    var t = new Test(id);
    t._ttl = 10;

    var follow = expect(
      t.save()
        .then(function() {
          return Test.get(id);
        })
    )
      .to.eventually.be.have.property('_ttl')
        .and.that.is.lt(10)
        .that.is.not.undefined
    ;

    expect(
      follow
        .then(function() {
          return Promise.delay(10);
        })
        .then(function() {
          return Test.get(id);
        })
    )
      .to.eventually.have.property('_ttl', undefined)
      .notify(done)
    ;
  });

  it('should allow searches', function(done) {
    var t = new Test(uuid.v4());
    t.data = 'value';

    expect(
      t.save({refresh: true})
        .then(function() {
          return Test.search({query: {match_all: {}}});
        })
    )
      .to.eventually.have.properties({
        total: 1,
        elements: [{_id: t._id, _version: 1, data: 'value'}]
      })
      .notify(done)
    ;
  });

  it('should allow to export search results', function(done) {
    var t = new Test(uuid.v4());

    expect(
      t.save({refresh: true})
        .then(function() {
          return Test.search({query: {match_all: {}}});
        })
        .get('elements')
        .call('export')
    )
      .to.eventually.have.properties({'0': {answer: 42, answerBool: true}})
      .notify(done)
    ;
  });

  it('should allow deletes', function(done) {
    var id = uuid.v4();

    expect(
      Test.client.index(Test.dbConfig({
        id: id,
        body: {}
      }))
        .then(function() {
          return Test.get(id);
        })
        .catch(function(err) {
          throw new Error('Too soon to fail!');
        })
        .call('delete')
        .then(function() {
          return Test.get(id);
        })
    )
      .to.eventually.be.rejectedWith(Error, 'Not Found')
      .notify(done)
    ;
  });

  it('should support mapping update', function(done) {
    expect(Test.createOrUpdateMapping().catch(function(err) {
      console.log('tests.js:239', err.stack);
      throw err;
    }))
      .to.eventually.be.fulfilled
      .notify(done)
    ;
  });

  describe('export()', function() {
    it('should not import attributes set to undefined', function(done) {
      var t = new Test();

      expect(
        t.export()
      )
        .to.eventually.not.have.property('ignored')
        .notify(done)
      ;
    });

    it('should allow primitive exports', function(done) {
      expect(
        (new Test()).export()
      )
        .to.eventually.have.properties({answer: 42, answerBool: true})
        .notify(done)
      ;
    });

    it('should allow template exports', function(done) {
      var t = new Test();
      t.field = uuid.v4();

      expect(
        t.export()
      )
        .to.eventually.have.property('tpl', '_' + t.field + '_')
        .notify(done)
      ;
    });

    it('should allow function exports', function(done) {
      var t = new Test();
      t.fnExport = 41;

      expect(
        t.export()
      )
        .to.eventually.have.property('fnExport', 42)
        .notify(done)
      ;
    });

    it('should allow sub exports', function(done) {
      var t = new Test();
      t.subObj = {value: 21};

      expect(
        t.export()
      )
        .to.eventually.have.properties({
          subObj: {
            added: 42,
            value: 21,
          },
        })
        .notify(done)
      ;
    });

    it('should support custom exports', function(done) {
      var t = new Test();

      expect(
        t.myExport()
      )
        .to.eventually.have.property('answer', 'not42')
        .notify(done)
      ;
    });
  });

  describe('import()', function() {
    it('should not import attributes set to undefined', function(done) {
      var t = new Test();

      expect(
        t.import({ignored: 42})
      )
        .to.eventually.not.have.property('ignored')
        .notify(done)
      ;
    });

    it('should allow primitive imports', function(done) {
      expect(
        (new Test()).import({})
      )
        .to.eventually.have.properties({answer: 42, answerBool: true})
        .notify(done)
      ;
    });

    it('should allow template imports', function(done) {
      var t = new Test();
      var id = uuid.v4();

      expect(
        t.import({field: id})
      )
        .to.eventually.have.property('tpl', '_' + id + '_')
        .notify(done)
      ;
    });

    it('should allow function imports', function(done) {
      var t = new Test();

      expect(
        t.import({fnImport: 41})
      )
        .to.eventually.have.property('fnImport', 42)
        .notify(done)
      ;
    });

    it('should allow sub imports', function(done) {
      var t = new Test();

      expect(
        t.import({})
      )
        .to.eventually.have.properties({
          subObj: {
            added: 42
          },
        })
        .notify(done)
      ;
    });

    it('should support custom imports', function(done) {
      var t = new Test();

      expect(
        t.myImport()
      )
        .to.eventually.have.property('answer', 'not42')
        .notify(done)
      ;
    });
  });
});
