'use strict';

define(function(_, Promise, mappings) {
  return function $createOrUpdateMapping() {
    if (!('mapping' in this.config.descr))
      throw new Error('You should provide a mapping attribute in the description object!');

    return Promise.resolve(
      _.isString(this.config.descr.mapping) ?
        mappings.loadMapping(this.config.descr.mapping) :
        this.config.descr.mapping
    )
      .bind(this)
      .then(function(mapping) {
        return this.client.indices.putMapping(this.dbConfig({
          body: mapping
        })).return(mapping);
      })
    ;
  };
});
