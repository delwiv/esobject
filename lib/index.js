'use strict';

var r42 = require('r42');

r42
  .config(require('./r42'))
  .inject(function(esobject) {
    module.exports = esobject;
  })
;
