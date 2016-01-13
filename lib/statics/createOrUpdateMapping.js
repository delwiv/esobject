'use strict';

define(function(_, Promise, mappings, templateify) {
  return function $createOrUpdateMapping(data) {
    if (!('mapping' in this.config.descr))
      throw new Error('You should provide a mapping attribute in the description object!');

    return Promise.resolve(
      _.isString(this.config.descr.mapping) ?
        mappings.loadMapping(this.config.descr.db.type, this.config.descr.mapping) :
        this.config.descr.mapping
    )
      .bind(this)
      .then(function(mapping) {
        if (!_.isFunction(mapping))
          mapping = templateify(mapping);
        mapping = mapping(data);
        return this.client.indices.putMapping(this.dbConfig({body: mapping})).then(function(mapping) {
          return mapping;
        });
      })
    ;
  };
});
