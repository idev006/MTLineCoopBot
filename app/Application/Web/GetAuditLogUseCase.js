/**
 * @fileoverview Application.Web.GetAuditLogUseCase
 * Admin-only sanitized audit-log query.
 */
var Application = Application || {};
Application.Web = Application.Web || {};

Application.Web.GetAuditLogUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const query = Ports.AuditQueryPort.assertImplemented(d.auditQuery);
    const authorization = d.authorization;
    if (!authorization || typeof authorization.requireRole !== 'function') {
      throw new Error('GetAuditLogUseCase requires authorization.requireRole');
    }

    function project(r) {
      const type = String(r.type || '');
      const base = {
        type,
        id:String(r.log_id || ''),
        memCode:String(r.mem_code || ''),
        status:String(r.status || ''),
        timestamp:String(r.activated_dt || r.checked_dt || r.reminded_dt || '')
      };
      if (type === 'expiry') {
        base.daysLeft = Number(r.days_left || 0);
        base.memExpDt = r.mem_exp_dt || '';
      } else if (type === 'reminder') {
        base.daysLeft = Number(r.days_left || 0);
        base.loanNo = r.loan_no || '';
        base.dueDt = r.due_dt || '';
      }
      return base;
    }

    function execute(input) {
      const x = input || {};
      const allowed = authorization.requireRole(x.principal, 'admin');
      if (!allowed.allowed) {
        return { ok:false, error:{ code:allowed.reason === 'unauthenticated' ? 'UNAUTHENTICATED' : 'FORBIDDEN' } };
      }

      const type = String(x.type || 'all');
      if (!['all','activation','expiry','reminder'].includes(type)) {
        return { ok:false, error:{ code:'VALIDATION' } };
      }

      const logs = query.list({ type, limit:x.limit }).map(project);
      return { ok:true, data:{ logs } };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
