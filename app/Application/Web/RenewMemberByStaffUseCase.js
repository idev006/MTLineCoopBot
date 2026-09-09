/**
 * @fileoverview Application.Web.RenewMemberByStaffUseCase
 * Server-authorized staff/manager/admin renewal on behalf of a member.
 */
var Application = Application || {};
Application.Web = Application.Web || {};

Application.Web.RenewMemberByStaffUseCase = (() => {
  'use strict';

  const ROLES = Object.freeze(['staff','manager','admin']);

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const clock = Ports.ClockPort.assertImplemented(d.clock);
    const audit = Ports.AuditPort.assertImplemented(d.audit);
    const authorization = d.authorization;

    if (!authorization || typeof authorization.requireAnyRole !== 'function') {
      throw new Error('RenewMemberByStaffUseCase requires authorization.requireAnyRole');
    }

    function execute(input) {
      const x = input || {};
      const principal = x.principal;

      const allowed = authorization.requireAnyRole(principal, ROLES);
      if (!allowed.allowed) {
        return { ok:false, error:{ code:allowed.reason === 'unauthenticated' ? 'UNAUTHENTICATED' : 'FORBIDDEN' } };
      }

      const memberCode = String(x.memberCode || '').trim();
      if (!memberCode) {
        return { ok:false, error:{ code:'VALIDATION' } };
      }

      const member = repo.findByMemberCode(memberCode);
      if (!member) {
        return { ok:false, error:{ code:'MEMBER_NOT_FOUND' } };
      }

      const now = clock.now();
      const renewal = Core.MemberRules.computeRenewal(member, now);
      const persisted = repo.saveRenewal(member._rowIndex, {
        memExpDt: renewal.newExpDt,
        memStatus: 'active'
      });

      const actorRole = ROLES.find(role => Array.from(principal.roles || []).includes(role)) || 'staff';
      audit.record({
        type:'member.renewal',
        memberCode:member.mem_code,
        lineUserId:principal.claims && principal.claims.lineUserId ? principal.claims.lineUserId : '',
        status:'renewed_by_' + actorRole,
        occurredAt:now
      });

      return {
        ok:true,
        data:{
          mem_code:member.mem_code,
          mem_exp_dt:persisted.memExpDt,
          mem_status:persisted.memStatus,
          renewed_from:renewal.fromDt
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create, ROLES };
})();
