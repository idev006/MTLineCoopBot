/**
 * @fileoverview Adapters.Id.AppsScriptIdAdapter
 * Production opaque ID generator backed by Apps Script Utilities.getUuid().
 */
var Adapters = Adapters || {};
Adapters.Id = Adapters.Id || {};

Adapters.Id.AppsScriptIdAdapter = (() => {
  'use strict';

  function next(prefix) {
    if (typeof Utilities === 'undefined' || typeof Utilities.getUuid !== 'function') {
      throw new Error('Utilities.getUuid is required for production ID generation');
    }
    const p = String(prefix || '').trim();
    if (!p) throw new Error('ID prefix is required');
    return p + '-' + Utilities.getUuid();
  }

  return Object.freeze({ next });
})();
