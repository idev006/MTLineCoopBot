/**
 * @fileoverview Ports.ReportQueryPort
 * Read-side contract for report source data.
 */
var Ports = Ports || {};

Ports.ReportQueryPort = (() => {
  'use strict';

  function assertImplemented(query) {
    if (!query || typeof query.snapshot !== 'function') {
      throw new Error('ReportQueryPort requires snapshot()');
    }
    return query;
  }

  return { assertImplemented };
})();
