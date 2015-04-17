'use strict';

define(function(_, Promise, path, glob, fs, loader) {
  glob = Promise.promisify(glob);
  Promise.promisifyAll(fs);

  var globPattern = '**/*.{' + _.keys(loader.loaders).join(',') + '}';

  function compare(a, b) {
    return a <= b ?
      a !== b ?
        -1 :
        0 :
      1
    ;
  }

  function listFiles(folder) {
    return glob(globPattern, {cwd: folder})
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

  function loadMapping(name, folder) {
    return fs.statAsync(folder)
      .then(function(stat) {
        if (!stat.isDirectory())
          return loader.load(folder);

        return listFiles(folder)
          .map(function(file) {
            return Promise.props({
              infos: path.parse(file),
              content: loader.load(path.resolve(folder, file)),
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
      })
      .then(function(mapping) {
        var res = {};
        res[name] = mapping;
        return res;
      })
    ;
  }

  return {
    loadMapping: loadMapping,
  };
});
