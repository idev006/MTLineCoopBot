/**
 * @fileoverview Ports.SessionStorePort
 * Persistence contract for opaque web sessions.
 * Stores only token hashes, never raw bearer tokens.
 */
var Ports = Ports || {};

Ports.SessionStorePort = (() => {
  'use strict';

  function assertImplemented(store) {
    if (!store ||
        typeof store.save !== 'function' ||
        typeof store.findByTokenHash !== 'function' ||
        typeof store.revokeByTokenHash !== 'function') {
      throw new Error('SessionStorePort requires save(record), findByTokenHash(hash), revokeByTokenHash(hash)');
    }
    return store;
  }

  return { assertImplemented };
})();
