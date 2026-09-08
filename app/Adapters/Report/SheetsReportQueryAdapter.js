/**
 * @fileoverview Adapters.Report.SheetsReportQueryAdapter
 * Reads report source tables once per request.
 */
var Adapters = Adapters || {};
Adapters.Report = Adapters.Report || {};

Adapters.Report.SheetsReportQueryAdapter = (() => {
  'use strict';

  function read(tableKey) {
    return LineBot.SheetService.readRowsAsObjects(
      tableKey,
      LineBot.SheetService.getSheet(tableKey)
    ) || [];
  }

  function snapshot() {
    return {
      members:read('MEMBER_MASTER'),
      savings:read('SAVINGS_ACCT'),
      loans:read('LOAN_ACCT'),
      dividends:read('DIVIDEND')
    };
  }

  return { snapshot };
})();
