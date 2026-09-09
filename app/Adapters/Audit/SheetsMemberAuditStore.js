/**
 * @fileoverview Adapters.Audit.SheetsMemberAuditStore
 * Durable Sheets-backed member audit persistence adapter.
 */
var Adapters = Adapters || {};
Adapters.Audit = Adapters.Audit || {};

Adapters.Audit.SheetsMemberAuditStore = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const ids = Ports.IdPort.assertImplemented(d.idGenerator);

    function logActivation(entry) {
      return LineBot.SheetService.logActivation(Object.assign({}, entry || {}, {
        logId: ids.next('LOG')
      }));
    }
    function logExpiry(entry) {
      return LineBot.SheetService.appendExpiryLog(Object.assign({}, entry || {}, {
        logId: ids.next('ELOG')
      }));
    }
    function logReminder(entry) {
      return LineBot.SheetService.appendReminderLog(Object.assign({}, entry || {}, {
        logId: ids.next('RLOG')
      }));
    }

    return Object.freeze({ logActivation, logExpiry, logReminder });
  }

  return { create };
})();
