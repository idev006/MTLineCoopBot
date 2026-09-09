/**
 * @fileoverview Ports.MemberAuditStorePort
 * Durable persistence contract for member-domain audit records.
 */
var Ports = Ports || {};

Ports.MemberAuditStorePort = (() => {
  'use strict';

  const METHODS = Object.freeze(['logActivation','logExpiry','logReminder']);

  function assertImplemented(store) {
    if (!store) throw new Error('MemberAuditStore adapter is required');
    const missing = METHODS.filter(name => typeof store[name] !== 'function');
    if (missing.length) {
      throw new Error('MemberAuditStore adapter missing methods: ' + missing.join(', '));
    }
    return store;
  }

  function listMethods() { return METHODS.slice(); }

  return { assertImplemented, listMethods };
})();
