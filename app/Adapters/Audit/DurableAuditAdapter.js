/**
 * @fileoverview Adapters.Audit.DurableAuditAdapter
 * Canonical durable AuditPort adapter backed by dedicated audit stores.
 */
var Adapters = Adapters || {};
Adapters.Audit = Adapters.Audit || {};

Adapters.Audit.DurableAuditAdapter = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const memberStore = Ports.MemberAuditStorePort.assertImplemented(d.memberAuditStore);
    const adminStore = Ports.AdminAuditStorePort.assertImplemented(d.adminAuditStore);

    function record(event) {
      const e = event || {};
      if (e.type === 'member.activation') {
        return memberStore.logActivation({
          memCode:e.memberCode || '', lineUserId:e.lineUserId || '',
          activateCode:e.activateCode || '', status:e.status || 'success',
          activatedDt:e.occurredAt
        });
      }
      if (e.type === 'member.renewal') {
        return memberStore.logActivation({
          memCode:e.memberCode || '', lineUserId:e.lineUserId || '',
          activateCode:'', status:e.status || 'renewed',
          activatedDt:e.occurredAt
        });
      }
      if (e.type === 'member.expiry.checked') {
        return memberStore.logExpiry({
          memCode:e.memberCode || '', lineUserId:e.lineUserId || '',
          status:e.status || 'valid', daysLeft:e.daysLeft,
          memExpDt:e.memExpDt || '', checkedDt:e.checkedDt
        });
      }
      if (e.type === 'loan.reminder') {
        return memberStore.logReminder({
          memCode:e.memberCode || '', loanNo:e.loanNo || '',
          dueDt:e.dueDt || '', daysLeft:e.daysLeft,
          status:e.status || 'reminded', remindedDt:e.remindedDt
        });
      }
      if (e.type === 'admin.role.change') {
        return adminStore.append({
          actorSubject:e.actorSubject || '', actorMemberCode:e.actorMemberCode || '',
          action:'role_change', memberCode:e.memberCode || '',
          oldValue:e.oldRole || '', newValue:e.newRole || '',
          status:e.status || 'attempt', createdDt:e.createdDt
        });
      }
      throw new Error('Unsupported audit event type: ' + String(e.type || ''));
    }

    return Object.freeze({ record });
  }

  return { create };
})();
