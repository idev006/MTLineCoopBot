/**
 * @fileoverview Ports.IdentityPort
 * Contract for converting channel credentials/context into a verified Principal.
 */
var Ports = Ports || {};

Ports.IdentityPort = (() => {
  'use strict';

  function assertImplemented(identity) {
    if (!identity || typeof identity.authenticate !== 'function') {
      throw new Error('IdentityPort requires authenticate(input)');
    }
    return identity;
  }

  return { assertImplemented };
})();
