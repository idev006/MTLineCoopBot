/**
 * @fileoverview Ports.AdminAuditStorePort
 * Durable append-only store for privileged admin audit events.
 */
var Ports = Ports || {};

Ports.AdminAuditStorePort = (() => {
  'use strict';

  function assertImplemented(store) {
    if (!store || typeof store.append !== 'function') {
      throw new Error('AdminAuditStorePort requires append(entry)');
    }
    return store;
  }

  return { assertImplemented };
})();
