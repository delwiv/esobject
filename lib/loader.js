'use strict';

define(function(_, Promise, fs, path, r42) {
  Promise.promisifyAll(fs);

  var yaml;
  var yamlLoader = Promise.method(function(file) {
    if (!yaml) {
      try {
        yaml = r42.inject('js-yaml');
      }
      catch (err) {
        throw new Error('You should add js-yaml to your dependencies to activate yaml ability in esobject');
      }
    }

    return fs.readFileAsync(file)
      .then(function(content) {
        return yaml.safeLoad(content, {filename: file});
      })
    ;
  });

  var loaders = {
    json: require,
    js: require,
    yml: yamlLoader,
    yaml: yamlLoader,
  };

  function load(file) {
    var ext = path.extname(file).substr(1);

    if (!(ext in loaders))
      throw new Error(ext + ' format is not supported in esobject');

    return loaders[ext](path.resolve(file));
  }

  return {
    loaders: loaders,
    load: load,
  };
});
