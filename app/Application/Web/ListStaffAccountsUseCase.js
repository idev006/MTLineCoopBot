/**
 * @fileoverview Application.Web.ListStaffAccountsUseCase
 * Admin-only sanitized operational staff account listing.
 */
var Application = Application || {};
Application.Web = Application.Web || {};

Application.Web.ListStaffAccountsUseCase = (() => {
  'use strict';

  const STAFF_ROLES = Object.freeze(['staff','manager','admin']);

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const authorization = d.authorization;
    if (!authorization || typeof authorization.requireRole !== 'function') {
      throw new Error('ListStaffAccountsUseCase requires authorization.requireRole');
    }

    function execute(input) {
      const principal = input && input.principal;
      const allowed = authorization.requireRole(principal, 'admin');
      if (!allowed.allowed) {
        return { ok:false, error:{ code:allowed.reason === 'unauthenticated' ? 'UNAUTHENTICATED' : 'FORBIDDEN' } };
      }

      const accounts = (repo.listMembers() || [])
        .filter(m => STAFF_ROLES.includes(String(m.mem_role || '')))
        .map(m => ({
          memberCode:String(m.mem_code || ''),
          displayName:[m.mem_title,m.mem_fname,m.mem_lname].filter(Boolean).join(' ').trim(),
          role:String(m.mem_role || ''),
          status:String(m.mem_status || ''),
          lineLinked:!!m.line_user_id
        }))
        .sort((a,b) => a.memberCode.localeCompare(b.memberCode));

      return { ok:true, data:{ accounts, roles:STAFF_ROLES.slice() } };
    }

    return Object.freeze({ execute });
  }

  return { create, STAFF_ROLES };
})();
