/**
 * @fileoverview Adapters.Audit.SheetsMemberAuditStore
 * Durable Sheets-backed member audit persistence adapter.
 */
var Adapters = Adapters || {};
Adapters.Audit = Adapters.Audit || {};

Adapters.Audit.SheetsMemberAuditStore = (() => {
  'use strict';

  function logActivation(entry) {
    return LineBot.SheetService.logActivation(entry);
  }
  function logExpiry(entry) {
    return LineBot.SheetService.appendExpiryLog(entry);
  }
  function logReminder(entry) {
    return LineBot.SheetService.appendReminderLog(entry);
  }

  return Object.freeze({ logActivation, logExpiry, logReminder });
})();
