/**
 * @fileoverview Ports.AuditQueryPort
 * Read-side contract for audit log queries.
 */
var Ports = Ports || {};

Ports.AuditQueryPort = (() => {
  'use strict';

  function assertImplemented(query) {
    if (!query || typeof query.list !== 'function') {
      throw new Error('AuditQueryPort requires list(options)');
    }
    return query;
  }

  return { assertImplemented };
})();
