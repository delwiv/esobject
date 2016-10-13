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
          default: strategies.import.default(strategies.import.id(), 'default_import'),
          lol: strategies.import.default('lol_import'),
        },
      },

      test: {
        type: 'boolean',

        $import: {
          default: strategies.import.id(true),
        },
      },
    },
  },
});
