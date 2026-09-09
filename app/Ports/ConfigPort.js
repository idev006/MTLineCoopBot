/**
 * @fileoverview Ports.ConfigPort
 * Read-only configuration contract.
 */
var Ports = Ports || {};

Ports.ConfigPort = (() => {
  'use strict';

  function assertImplemented(config) {
    if (!config || typeof config.get !== 'function') {
      throw new Error('ConfigPort requires get()');
    }
    return config;
  }

  function assertValidatable(config) {
    const c = assertImplemented(config);
    if (typeof c.validate !== 'function') {
      throw new Error('ConfigPort validatable capability requires validate()');
    }
    return c;
  }

  return { assertImplemented, assertValidatable };
})();
