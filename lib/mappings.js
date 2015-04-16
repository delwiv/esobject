'use strict';

define(function(_, Promise, path, glob, fs, r42) {
  var glob = Promise.promisify(glob);
  Promise.promisifyAll(fs);

  var yaml;

  var loaders = {
    json: require,
    js: require,
    yaml: Promise.method(function(file) {
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
    }),
  };

  function load(file) {
    var ext = path.extname(file).substr(1);

    if (!ext in loaders)
      throw new Error(ext + ' format is not supported in esobject');

    return loaders[ext](path.resolve(file));
  }

  function compare(a, b) {
    return a <= b ?
      a !== b ?
        -1 :
        0 :
      1
    ;
  }

  function listFiles(folder) {
    return glob('**/*.{js,json,yaml}', {cwd: folder})
      .call('sort', function(a, b) {
        var aInfos = path.parse(a);
        var bInfos = path.parse(b);

        if (aInfos.name === 'main')
          return bInfos.name !== 'main' ? -1 : compare(a.length, b.length) || compare(a, b);
        else if (bInfos.name === 'main')
          return 1;

        return compare(a, b);
      })
    ;
  }

  function loadMapping(folder) {
    return listFiles(folder)
      .map(function(file) {
        return Promise.props({
          infos: path.parse(file),
          content: load(path.resolve(folder, file)),
        });
      })
      .reduce(function(mapping, file) {
        _.merge(_.reduce(path.join(file.infos.dir, file.infos.name).split(/[/\\]/), function(mapping, name) {
          if (name === 'main')
            return mapping;

          if (!mapping.properties)
            mapping.properties = {};

          if (!(name in mapping.properties))
            mapping.properties[name] = {};

          return mapping.properties[name];
        }, mapping), file.content);

        return mapping;
      }, {})
    ;
  }

  return {
    loadMapping: loadMapping,
  };
});
