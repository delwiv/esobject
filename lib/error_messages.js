export default {
  ESObjectError: {
    NoDefaultImport: 'No default import strategy.',
    NoDefaultExport: 'No default export strategy.',
    NoIndexLinked: 'No index linked to this object ({{obj._type}}/{{obj._id || "<no id>"}}).',
    NoIndex: 'Impossible to {{action}} store/index {{name}}: not found.',
    NoType: 'Impossible to {{fn}} type {{name}} from store/index: not found',
    TypeConflict: 'The index {{name}} already contains a different type {{type}} than the one provided.',
    IndexConflict: 'Trying to {{fn}} an object from a different index ' +
      '({{obj._index}}/{{obj._type}}/{{obj._id || "<no id>"}}) in index {{name}}',
    ClientConflict: 'Impossible to add an index that does not share the same client that other indexes (for now).',
    TypeAgain: 'Impossible to add a type with name {{name}} in this store because there is alreay one ' +
      'with this name inside.',
    StoreAgain: 'Impossible to add provided store in this store because it is already in there.',
    IndexAgain: 'Impossible to add index {{name}} to multi index because it is already in there.',
    IdChanged: 'Strange error: id seems to have changed during {{fn}} (from {{obj._id}} to {{data._id}}.',
    NoId: 'Trying to {{fn}} an object without an id.',
    NoVersion: 'Trying to {{fn}} an object without a version (you can use force to bypass this).',
  },
  ESClientError: {
    NotFound: 'The document {{request.type}}/{{request.id}} was not found!',
  },
  ESTypeError: {
    ArrayNeeded: 'property {{propertyName}} expecting an array, got something else.',
    NoArrayNeeded: 'property {{propertyName}} expecting a value, got an array.',
    InvalidArgument: 'Invalid argument to {{fn}}. Expected a {{type}}.',
  },
  ESLoadError: {
    BadRequire: 'failed to load file {{file}} ' +
      '{{? if (from) {}}(loaded from {{from}}) {{? } }}' +
      'with message: {{message}}.',
    BadYamlRequireProp: '!require with file {{require}} and prop {{prop}} should not resolve to undefined ' +
      '(from yaml {{file}}).',
    UnknownStrategy: 'Unknown {{type}} strategy {{name}}.',
  },
  ESInternalError: {
    ArrayNeeded: '{{fn}} is expecting an array.',
    ArrayOfMapNeeded: '{{fn}} is expecting an array of object containing (only) key/value properties.',
  },
  ESInjectionError: {
    UnknownContext: 'Unknown context {{name}}.',
  },
};
