/**
 * @fileoverview Adapters.Audit.MemberRepositoryAuditAdapter
 * Transitional durable audit adapter backed by existing repository audit storage.
 */
var Adapters = Adapters || {};
Adapters.Audit = Adapters.Audit || {};

Adapters.Audit.MemberRepositoryAuditAdapter = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);

    function record(event) {
      const e = event || {};
      if (e.type === 'member.activation') {
        return repo.logActivation({
          memCode: e.memberCode || '',
          lineUserId: e.lineUserId || '',
          activateCode: e.activateCode || '',
          status: e.status || 'success',
          activatedDt: e.occurredAt
        });
      }
      if (e.type === 'member.renewal') {
        return repo.logActivation({
          memCode: e.memberCode || '',
          lineUserId: e.lineUserId || '',
          activateCode: '',
          status: e.status || 'renewed',
          activatedDt: e.occurredAt
        });
      }
      if (e.type === 'member.expiry.checked') {
        return repo.logExpiry({
          memCode: e.memberCode || '',
          lineUserId: e.lineUserId || '',
          status: e.status || 'valid',
          daysLeft: e.daysLeft,
          memExpDt: e.memExpDt || '',
          checkedDt: e.checkedDt
        });
      }
      if (e.type === 'loan.reminder') {
        return repo.logReminder({
          memCode: e.memberCode || '',
          loanNo: e.loanNo || '',
          dueDt: e.dueDt || '',
          daysLeft: e.daysLeft,
          status: e.status || 'reminded',
          remindedDt: e.remindedDt
        });
      }
      if (e.type === 'admin.role.change') {
        if (!d.adminAuditStore || typeof d.adminAuditStore.append !== 'function') {
          throw new Error('adminAuditStore is required for admin.role.change');
        }
        return d.adminAuditStore.append({
          actorSubject:e.actorSubject || '',
          actorMemberCode:e.actorMemberCode || '',
          action:'role_change',
          memberCode:e.memberCode || '',
          oldValue:e.oldRole || '',
          newValue:e.newRole || '',
          status:e.status || 'attempt',
          createdDt:e.createdDt
        });
      }
      throw new Error('Unsupported audit event type: ' + String(e.type || ''));
    }

    return Object.freeze({ record });
  }

  return { create };
})();
