/**
 * @fileoverview Application.Member.GetCurrentMemberProfileUseCase
 * Headless protected application use case.
 */
var Application = Application || {};
Application.Member = Application.Member || {};

Application.Member.GetCurrentMemberProfileUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const access = d.memberAccess;
    const authorization = d.authorization;

    if (!access || typeof access.hasKnownRole !== 'function') {
      throw new Error('memberAccess dependency is required');
    }
    if (!authorization || typeof authorization.requireAuthenticated !== 'function') {
      throw new Error('authorization dependency is required');
    }

    function execute(input) {
      const principal = input && input.principal;
      const auth = authorization.requireAuthenticated(principal);
      if (!auth.allowed) {
        return { ok: false, error: { code: 'UNAUTHENTICATED' } };
      }

      if (!principal.memberCode) {
        return { ok: false, error: { code: 'MEMBER_NOT_LINKED' } };
      }

      const binding = authorization.requireMemberBinding(principal, principal.memberCode);
      if (!binding.allowed) {
        return { ok: false, error: { code: 'FORBIDDEN' } };
      }

      const member = repo.findByMemberCode(principal.memberCode);
      if (!member) {
        return { ok: false, error: { code: 'MEMBER_NOT_FOUND' } };
      }

      if (!access.hasKnownRole(member)) {
        return { ok: false, error: { code: 'MEMBER_INACTIVE_OR_ROLE_INVALID' } };
      }

      return {
        ok: true,
        data: {
          mem_code: member.mem_code,
          mem_title: member.mem_title,
          mem_fname: member.mem_fname,
          mem_lname: member.mem_lname,
          mem_role: member.mem_role,
          mem_position: member.mem_position,
          mem_position_score: member.mem_position_score,
          mem_rank_score: member.mem_rank_score,
          mem_kk: member.mem_kk,
          mem_bk: member.mem_bk,
          mem_bh: member.mem_bh,
          mem_eff_dt: member.mem_eff_dt,
          mem_exp_dt: member.mem_exp_dt,
          mem_status: member.mem_status
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
