/**
 * @fileoverview Ports.SessionTokenPort
 * Opaque token generation + one-way hashing contract.
 */
var Ports = Ports || {};

Ports.SessionTokenPort = (() => {
  'use strict';

  function assertImplemented(tokens) {
    if (!tokens ||
        typeof tokens.generate !== 'function' ||
        typeof tokens.hash !== 'function') {
      throw new Error('SessionTokenPort requires generate() and hash(rawToken)');
    }
    return tokens;
  }

  return { assertImplemented };
})();
