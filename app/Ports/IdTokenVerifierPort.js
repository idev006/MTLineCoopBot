/**
 * @fileoverview Ports.IdTokenVerifierPort
 * Contract for server-side ID token verification.
 */
var Ports = Ports || {};

Ports.IdTokenVerifierPort = (() => {
  'use strict';

  function assertImplemented(verifier) {
    if (!verifier || typeof verifier.verify !== 'function') {
      throw new Error('IdTokenVerifierPort requires verify(input)');
    }
    return verifier;
  }

  return { assertImplemented };
})();
