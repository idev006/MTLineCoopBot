/**
 * @fileoverview Adapters.Admin.SheetsStaffAdminRepository
 */
var Adapters = Adapters || {};
Adapters.Admin = Adapters.Admin || {};

Adapters.Admin.SheetsStaffAdminRepository = (() => {
  'use strict';

  function saveRole(rowIndex, role) {
    return LineBot.SheetService.saveRole(rowIndex, role);
  }

  return Object.freeze({ saveRole });
})();
