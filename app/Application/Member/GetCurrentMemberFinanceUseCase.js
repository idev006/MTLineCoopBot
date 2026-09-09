/**
 * @fileoverview Application.Member.GetCurrentMemberFinanceUseCase
 * Headless protected application use case for self financial data.
 */
var Application = Application || {};
Application.Member = Application.Member || {};

Application.Member.GetCurrentMemberFinanceUseCase = (() => {
  'use strict';

  const READERS = Object.freeze({
    savings: 'findSavingsByMember',
    loans: 'findLoansByMember',
    dividends: 'findDividendsByMember'
  });

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const access = d.memberAccess;
    const authorization = d.authorization;

    if (!access || typeof access.hasKnownRole !== 'function') {
      throw new Error('memberAccess dependency is required');
    }
    if (!authorization ||
        typeof authorization.requireAuthenticated !== 'function' ||
        typeof authorization.requireMemberBinding !== 'function') {
      throw new Error('authorization dependency is required');
    }

    function execute(input) {
      const x = input || {};
      const principal = x.principal;
      const kind = x.kind;

      if (!READERS[kind]) {
        return { ok:false, error:{ code:'FINANCE_KIND_INVALID' } };
      }

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
      if (!access.hasKnownRole(member)) {
        return { ok:false, error:{ code:'MEMBER_INACTIVE_OR_ROLE_INVALID' } };
      }

      const rows = repo[READERS[kind]](member.mem_code) || [];
      return {
        ok:true,
        data: {
          memberCode: member.mem_code,
          kind,
          rows
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
