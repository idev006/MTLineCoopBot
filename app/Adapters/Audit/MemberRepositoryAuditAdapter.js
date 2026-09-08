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
          status: e.status || 'success'
        });
      }
      if (e.type === 'member.renewal') {
        return repo.logActivation({
          memCode: e.memberCode || '',
          lineUserId: e.lineUserId || '',
          activateCode: '',
          status: e.status || 'renewed'
        });
      }
      if (e.type === 'member.expiry_checked') {
        return repo.logExpiry({
          memCode: e.memberCode || '',
          lineUserId: e.lineUserId || '',
          status: e.status || 'valid',
          daysLeft: e.daysLeft,
          memExpDt: e.memExpDt || '',
          checkedDt: e.checkedAt
        });
      }
      throw new Error('Unsupported audit event type: ' + String(e.type || ''));
    }

    return Object.freeze({ record });
  }

  return { create };
})();
