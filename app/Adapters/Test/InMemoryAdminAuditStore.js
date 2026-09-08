/**
 * @fileoverview Adapters.Test.InMemoryAdminAuditStore
 */
var Adapters = Adapters || {};
Adapters.Test = Adapters.Test || {};

Adapters.Test.InMemoryAdminAuditStore = (() => {
  'use strict';

  function create() {
    const rows = [];
    function append(entry) {
      const row = Object.assign({ log_id:'ADM-' + String(rows.length + 1).padStart(4,'0') }, JSON.parse(JSON.stringify(entry || {})));
      rows.push(row);
      return JSON.parse(JSON.stringify(row));
    }
    function snapshot() {
      return JSON.parse(JSON.stringify(rows));
    }
    return Object.freeze({ append, snapshot });
  }

  return { create };
})();
