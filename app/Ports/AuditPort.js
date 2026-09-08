/**
 * @fileoverview Ports.AuditPort
 * Structured audit-event contract.
 */
var Ports = Ports || {};

Ports.AuditPort = (() => {
  'use strict';

  function assertImplemented(audit) {
    if (!audit || typeof audit.record !== 'function') {
      throw new Error('AuditPort requires record(event)');
    }
    return audit;
  }

  return { assertImplemented };
})();
