/**
 * @fileoverview Adapters.Audit.SheetsAdminAuditStore
 */
var Adapters = Adapters || {};
Adapters.Audit = Adapters.Audit || {};

Adapters.Audit.SheetsAdminAuditStore = (() => {
  'use strict';

  function append(entry) {
    return LineBot.SheetService.appendAdminAuditLog(entry);
  }

  return Object.freeze({ append });
})();
