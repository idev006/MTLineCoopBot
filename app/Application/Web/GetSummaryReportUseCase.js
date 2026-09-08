/**
 * @fileoverview Application.Web.GetSummaryReportUseCase
 * Server-authorized aggregate report.
 */
var Application = Application || {};
Application.Web = Application.Web || {};

Application.Web.GetSummaryReportUseCase = (() => {
  'use strict';

  const ROLES = Object.freeze(['staff','manager','admin']);

  function sum(rows, field) {
    return (rows || []).reduce((acc,row) => acc + (Number(row && row[field]) || 0), 0);
  }

  function create(deps) {
    const d = deps || {};
    const query = Ports.ReportQueryPort.assertImplemented(d.reportQuery);
    const authorization = d.authorization;
    const memberAccess = d.memberAccess;
    const config = Ports.ConfigPort.assertImplemented(d.config);
    const clock = Ports.ClockPort.assertImplemented(d.clock);

    if (!authorization || typeof authorization.requireAnyRole !== 'function') {
      throw new Error('GetSummaryReportUseCase requires authorization.requireAnyRole');
    }
    if (!memberAccess || typeof memberAccess.expiryStatus !== 'function' || typeof memberAccess.isActive !== 'function') {
      throw new Error('GetSummaryReportUseCase requires memberAccess engine');
    }

    function execute(input) {
      const principal = input && input.principal;
      const allowed = authorization.requireAnyRole(principal, ROLES);
      if (!allowed.allowed) {
        return { ok:false, error:{ code:allowed.reason === 'unauthenticated' ? 'UNAUTHENTICATED' : 'FORBIDDEN' } };
      }

      const data = query.snapshot();
      const members = data.members || [];
      const warningDays = Number(config.get().EXPIRY_WARNING_DAYS || 30);

      let activeMembers = 0;
      let inactiveMembers = 0;
      let expiredMembers = 0;
      let expiringMembers = 0;

      members.forEach(member => {
        const expiry = memberAccess.expiryStatus(member, warningDays);
        const active = memberAccess.isActive(member);

        if (expiry.status === 'expired') {
          expiredMembers += 1;
        } else if (expiry.status === 'expiring') {
          expiringMembers += 1;
          if (active) activeMembers += 1;
        } else if (active) {
          activeMembers += 1;
        } else {
          inactiveMembers += 1;
        }
      });

      return {
        ok:true,
        data:{
          summary:{
            totalMembers:members.length,
            activeMembers,
            inactiveMembers,
            expiredMembers,
            expiringMembers
          },
          financial:{
            totalSavings:sum(data.savings,'balance'),
            totalLoans:sum(data.loans,'outstanding'),
            totalDividends:sum(data.dividends,'dividend_amt')
          },
          generatedAt:clock.now().toISOString()
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create, ROLES };
})();
