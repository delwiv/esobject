import _ from 'lodash';
import fs from 'fs';
import load from './index';
import {objectBuilder} from '../builder';
import path from 'path';
import yaml from 'js-yaml';

const ObjectBuilderType = new yaml.Type('!object-builder', {
  kind: 'sequence',
  construct: data => objectBuilder(data),
});

const ObjType = new yaml.Type('!obj', {
  kind: 'scalar',
  construct: data => obj => _.get(obj, data),
});

const OptionsType = new yaml.Type('!options', {
  kind: 'scalar',
  construct: data => (obj, options) => _.get(options, data),
});

export function loader(file) {
  const RequireType = new yaml.Type('!require', {
    kind: 'mapping',
    construct: data => {
      const loaded = load(path.resolve(path.dirname(file), data.file));
      const res = data.prop ? _.get(loaded, data.prop) : loaded;

      if (_.isUndefined(res)) {
        throw new Error('!require with file ' + data.file + ' and prop ' + data.prop +
          ' should not resolve to undefined (loaded from yaml ' + file + ')');
      }

      return res;
    },
  });

  const QueriesSchema = yaml.Schema.create([ObjectBuilderType, ObjType, OptionsType, RequireType]);

  return yaml.safeLoad(fs.readFileSync(file, 'utf8'), {
    filename: file,
    schema: QueriesSchema,
  });
}

export default loader;
