import _ from 'lodash';
import {ESLoadError} from '../../errors';
import fs from 'fs';
import load from './index';
import path from 'path';
import strategies from '../helpers';
import yaml from 'js-yaml';

const ExportType = new yaml.Type('!export', {
  kind: 'mapping',
  construct: data => {
    if (!(data.name in strategies.export))
      throw new ESLoadError('UnknownStrategy', {type: 'export', name: data.name});
    return strategies.export[data.name](...(data.args || []));
  },
});

const ImportType = new yaml.Type('!import', {
  kind: 'mapping',
  construct: data => {
    if (!(data.name in strategies.import))
      throw new ESLoadError('UnknownStrategy', {type: 'import', name: data.name});
    return strategies.import[data.name](...(data.args || []));
  },
});

export function loader(file) {
  const RequireType = new yaml.Type('!require', {
    kind: 'mapping',
    construct: data => {
      const loaded = load(path.resolve(path.dirname(file), data.file), file);
      const res = data.prop ? _.get(loaded, data.prop) : loaded;
      ESLoadError.assert(!_.isUndefined(res), 'BadYamlRequireProp', {require: data.file, prop: data.prop, file});
      return res;
    },
  });

  const StrategiesSchema = yaml.Schema.create([ExportType, ImportType, RequireType]);

  return yaml.safeLoad(fs.readFileSync(file, 'utf8'), {
    filename: file,
    schema: StrategiesSchema,
  });
}

export default loader;
