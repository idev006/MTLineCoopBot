/**
 * @fileoverview Application.Web.ListStaffAccountsUseCase
 * Admin-only sanitized operational staff account listing.
 */
var Application = Application || {};
Application.Web = Application.Web || {};

Application.Web.ListStaffAccountsUseCase = (() => {
  'use strict';

  /**
   * Resolve canonical staff roles lazily.
   *
   * Google Apps Script does not guarantee source-file evaluation order. Avoid
   * dereferencing another namespace at module initialization time; RoleCatalog
   * may be evaluated later in the same Apps Script project.
   */
  function getStaffRoles() {
    if (!Security || !Security.RoleCatalog || typeof Security.RoleCatalog.staffRoleIds !== 'function') {
      throw new Error('ListStaffAccountsUseCase requires Security.RoleCatalog.staffRoleIds');
    }
    return Object.freeze(Security.RoleCatalog.staffRoleIds());
  }

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const authorization = d.authorization;
    if (!authorization || typeof authorization.requireRole !== 'function') {
      throw new Error('ListStaffAccountsUseCase requires authorization.requireRole');
    }
    const staffRoles = getStaffRoles();

    function execute(input) {
      const principal = input && input.principal;
      const allowed = authorization.requireRole(principal, 'admin');
      if (!allowed.allowed) {
        return { ok:false, error:{ code:allowed.reason === 'unauthenticated' ? 'UNAUTHENTICATED' : 'FORBIDDEN' } };
      }

      const accounts = (repo.listMembers() || [])
        .filter(m => staffRoles.includes(String(m.mem_role || '')))
        .map(m => ({
          memberCode:String(m.mem_code || ''),
          displayName:[m.mem_title,m.mem_fname,m.mem_lname].filter(Boolean).join(' ').trim(),
          role:String(m.mem_role || ''),
          status:String(m.mem_status || ''),
          lineLinked:!!m.line_user_id
        }))
        .sort((a,b) => a.memberCode.localeCompare(b.memberCode));

      return { ok:true, data:{ accounts, roles:staffRoles.slice() } };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
