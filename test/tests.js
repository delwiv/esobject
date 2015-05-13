var Promise = require('bluebird');
var chai = require('chai');
var uuid = require('uuid');
var _ = require('lodash');

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
    $check: _.noop,

    answer: 42,
    answerBool: true,
    tpl: '_<%= raw.field %>_',
    ignored: undefined,
    fnImport: function(prevVal, newVal) {
      return ++newVal || undefined;
    },
    subObj: {
      added: 42,
    },
    subArray: {
      $all: {
        test: 42,
        copiedNoOld: {$id: true},
        copiedWithOld: {$id: 'keepold'},
      },
    },
    subCollection: {
      $all: {
        test: 21,
      },
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
    tpl: '_<%= esobj.field %>_',
    ignored: undefined,
    fnExport: function(prevVal) {
      return ++prevVal;
    },
    subObj: {
      added: 42
    },
  },

  exports: {
    myExport: {
      answer: 'not42',
    },
  },

  queries: {
    instance: {
      sameField: __dirname + '/queries/same_field.yaml',
    },
    static: {
      term: __dirname + '/queries/term.yaml',
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

  it('should allow to execute static queries', function(done) {
    var t = new Test(uuid.v4());

    expect(
      t.save({refresh: true})
        .then(function() {
          return Test.term({filter_on: '_id', filter_with: t._id});
        })
    )
      .to.eventually.have.deep.property('elements[0]._id', t._id)
      .notify(done)
    ;
  });

  it('should allow to execute instance queries', function(done) {
    var t = new Test(uuid.v4());
    t.field = 'value42';

    expect(
      t.save({refresh: true})
        .then(function() {
          var t2 = new Test(uuid.v4());
          t2.field = 'value42';
          return t2.sameField({field: 'field'});
        })
    )
      .to.eventually.have.deep.property('elements[0]._id', t._id)
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
    expect(Test.createOrUpdateMapping({attrType: 'string'}))
      .to.eventually.be.fulfilled
      .and.to.have.deep.property('test.properties.attr.type', 'string')
      .notify(done)
    ;
  });

  it('should be possible to load simple files using loadMapping', function(done) {
    expect(ESObject.loadMapping('test', __dirname + '/mappings/test/main.yaml'))
      .to.eventually.be.fulfilled
      .and.to.have.property('test')
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

    it('should allow to apply a stategy to all sub elements of an array using $all', function(done) {
      var t = new Test();

      expect(
        t.import({subArray: [{}]})
      )
        .to.eventually.have.property('subArray')
          .that.is.an('Array')
          .that.has.deep.property('[0].test', 42)
        .notify(done)
      ;
    });

    it('should allow to apply a stategy to all sub elements of an object using $all', function(done) {
      var t = new Test();

      expect(
        t.import({subCollection: {sub: {}}})
      )
        .to.eventually.have.property('subCollection')
          .that.is.an('Object')
          .that.has.deep.property('sub.test', 21)
        .notify(done)
      ;
    });

    it('should allow to copy an attribute without old with $id: true', function(done) {
      var t = new Test();
      var id = uuid.v4();

      expect(
        t.import({subArray: [{copiedNoOld: id}]})
      )
        .to.eventually.have.deep.property('subArray[0].copiedNoOld', id)
        .notify(done)
      ;
    });

    it('should not restore old with $id: true', function(done) {
      var t = new Test();
      t.subArray = [{copiedNoOld: 42}];
      var id = uuid.v4();

      expect(
        t.import({subArray: [{}]})
      )
        .to.eventually.not.have.deep.property('subArray[0].copiedNoOld')
        .notify(done)
      ;
    });

    it('should allow to copy an attribute without old with $id: keepold', function(done) {
      var t = new Test();
      var id = uuid.v4();

      expect(
        t.import({subArray: [{copiedWithOld: id}]})
      )
        .to.eventually.have.deep.property('subArray[0].copiedWithOld', id)
        .notify(done)
      ;
    });

    it('should not restore old with $id: keepold', function(done) {
      var t = new Test();
      t.subArray = [{copiedWithOld: 42}];
      var id = uuid.v4();

      expect(
        t.import({subArray: [{}]})
      )
        .to.eventually.have.deep.property('subArray[0].copiedWithOld', 42)
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
