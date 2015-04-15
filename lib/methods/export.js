'use strict';

define(function(_, strategies) {
  // Export creates a safe plain object from this instance to use in APIs
  return strategies.createExportProto('export');
});
