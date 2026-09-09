/**
 * @fileoverview Adapters.Audit.SheetsAdminAuditStore
 */
var Adapters = Adapters || {};
Adapters.Audit = Adapters.Audit || {};

Adapters.Audit.SheetsAdminAuditStore = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const ids = Ports.IdPort.assertImplemented(d.idGenerator);

    function append(entry) {
      return LineBot.SheetService.appendAdminAuditLog(Object.assign({}, entry || {}, {
        logId: ids.next('ALOG')
      }));
    }

    return Object.freeze({ append });
  }

  return { create };
})();
