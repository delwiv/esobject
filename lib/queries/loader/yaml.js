import {objectBuilder, queryReducer} from '../builder';
import _ from 'lodash';
import {ESLoadError} from '../../errors';
import fs from 'fs';
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

const IfType = new yaml.Type('!if', {
  kind: 'mapping',
  construct: data => {
    if (!_.isFunction(data.test))
      data.test = _.constant(data.test);
    if (!_.isFunction(data.then))
      data.then = queryReducer(data.then);
    if (!_.isFunction(data.else))
      data.else = queryReducer(data.else);

    return (obj, options) => data.test(obj, options) ? data.then(obj, options) : data.else(obj, options);
  },
});

const FilterType = new yaml.Type('!filter', {
  kind: 'sequence',
  construct: data => {
    const dataFn = queryReducer(data);
    return (obj, options) => _.filter(dataFn(obj, options), elt => _.isFunction(elt) ? elt(obj, options) : elt);
  },
});

export function loader(file, options = {}) {
  const RequireType = new yaml.Type('!require', {
    kind: 'mapping',
    construct: data => {
      const loaded = this.load(path.resolve(path.dirname(file), data.file), file);
      const res = data.prop ? _.get(loaded, data.prop) : loaded;
      ESLoadError.assert(!_.isUndefined(res), 'BadYamlRequireProp', {require: data.file, prop: data.prop, file});
      return res;
    },
  });

  const defaultTypes = [ObjectBuilderType, ObjType, OptionsType, IfType, FilterType, RequireType];

  const QueriesSchema = yaml.Schema.create(defaultTypes.concat(_.castArray(options.types || [])));

  return yaml.safeLoad(fs.readFileSync(file, 'utf8'), {
    filename: file,
    schema: QueriesSchema,
  });
}

export default loader;
