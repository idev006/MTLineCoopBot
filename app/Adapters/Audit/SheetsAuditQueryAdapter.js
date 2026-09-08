/**
 * @fileoverview Adapters.Audit.SheetsAuditQueryAdapter
 * Read-side audit adapter backed by existing SheetService tables.
 */
var Adapters = Adapters || {};
Adapters.Audit = Adapters.Audit || {};

Adapters.Audit.SheetsAuditQueryAdapter = (() => {
  'use strict';

  const TABLES = Object.freeze({
    activation:'ACTIVATION_LOG',
    expiry:'EXPIRY_LOG',
    reminder:'REMINDER_LOG'
  });

  function list(options) {
    const o = options || {};
    const type = String(o.type || 'all');
    const limit = Math.min(200, Math.max(1, Number(o.limit) || 50));

    const types = type === 'all'
      ? Object.keys(TABLES)
      : (TABLES[type] ? [type] : []);

    let rows = [];
    types.forEach(t => {
      const tableKey = TABLES[t];
      const raw = LineBot.SheetService.readRowsAsObjects(
        tableKey,
        LineBot.SheetService.getSheet(tableKey)
      ) || [];
      raw.forEach(r => rows.push(Object.assign({ type:t }, r)));
    });

    function ts(r) {
      return String(r.activated_dt || r.checked_dt || r.reminded_dt || '');
    }

    rows.sort((a,b) => ts(b).localeCompare(ts(a)));
    return rows.slice(0, limit);
  }

  return { list };
})();
