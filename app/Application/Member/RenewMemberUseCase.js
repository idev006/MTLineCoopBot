/**
 * @fileoverview Application.Member.RenewMemberUseCase
 * Secure headless self-renewal orchestration over a verified Principal.
 */
var Application = Application || {};
Application.Member = Application.Member || {};

Application.Member.RenewMemberUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const clock = Ports.ClockPort.assertImplemented(d.clock);
    const audit = Ports.AuditPort.assertImplemented(d.audit);
    const authorization = d.authorization;

    if (!authorization || typeof authorization.requireAuthenticated !== 'function') {
      throw new Error('authorization dependency is required');
    }

    function execute(input) {
      const principal = input && input.principal;

      const auth = authorization.requireAuthenticated(principal);
      if (!auth.allowed) {
        return { ok:false, error:{ code:'UNAUTHENTICATED' } };
      }
      if (!principal.memberCode) {
        return { ok:false, error:{ code:'MEMBER_NOT_LINKED' } };
      }

      const binding = authorization.requireMemberBinding(principal, principal.memberCode);
      if (!binding.allowed) {
        return { ok:false, error:{ code:'FORBIDDEN' } };
      }

      const member = repo.findByMemberCode(principal.memberCode);
      if (!member) {
        return { ok:false, error:{ code:'MEMBER_NOT_FOUND' } };
      }

      const role = authorization.requireAnyRole(principal, ['member', 'staff', 'manager', 'admin']);
      if (!role.allowed) {
        return { ok:false, error:{ code:'FORBIDDEN' } };
      }

      const now = clock.now();
      const renewal = Core.MemberRules.computeRenewal(member, now);
      const persisted = repo.saveRenewal(member._rowIndex, {
        memExpDt: renewal.newExpDt,
        memStatus: 'active'
      });

      audit.record({
        type: 'member.renewal',
        memberCode: member.mem_code,
        lineUserId: principal.claims && principal.claims.lineUserId ? principal.claims.lineUserId : '',
        status: 'renewed',
        occurredAt: now
      });

      return {
        ok:true,
        data:{
          mem_code: member.mem_code,
          mem_exp_dt: persisted.memExpDt,
          mem_status: persisted.memStatus,
          renewed_from: renewal.fromDt
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
