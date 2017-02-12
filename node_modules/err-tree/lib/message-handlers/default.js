'use strict';

function defaultMessageHandler(err) {
  return err.message;
}

module.exports = function() {
  return defaultMessageHandler;
};
