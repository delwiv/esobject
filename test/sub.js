'use strict';

const esobject = require('../lib');

const strategies = esobject.strategies;

module.exports = esobject.create({
  name: 'Sub',

  strategies: {
    properties: {
      value: {
        type: 'string',

        $import: {
          default: strategies.import.default('default_import'),
          lol: strategies.import.default('lol_import'),
        },
      },

      test: 'boolean',
    },
  },
});
