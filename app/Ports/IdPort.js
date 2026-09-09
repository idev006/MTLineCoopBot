/**
 * @fileoverview Ports.IdPort
 * Explicit infrastructure boundary for opaque identifiers.
 */
var Ports = Ports || {};

Ports.IdPort = (() => {
  'use strict';

  function assertImplemented(generator) {
    if (!generator || typeof generator.next !== 'function') {
      throw new Error('IdPort requires next(prefix)');
    }
    return generator;
  }

  return { assertImplemented };
})();
