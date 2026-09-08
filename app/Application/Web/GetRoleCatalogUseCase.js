/**
 * @fileoverview Application.Web.GetRoleCatalogUseCase
 * Admin-only read of canonical role metadata.
 */
var Application = Application || {};
Application.Web = Application.Web || {};

Application.Web.GetRoleCatalogUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const authorization = d.authorization;
    const roleCatalog = d.roleCatalog || Security.RoleCatalog;

    if (!authorization || typeof authorization.requireRole !== 'function') {
      throw new Error('GetRoleCatalogUseCase requires authorization.requireRole');
    }
    if (!roleCatalog || typeof roleCatalog.list !== 'function') {
      throw new Error('GetRoleCatalogUseCase requires roleCatalog.list');
    }

    function execute(input) {
      const principal = input && input.principal;
      const allowed = authorization.requireRole(principal, 'admin');
      if (!allowed.allowed) {
        return {
          ok:false,
          error:{ code:allowed.reason === 'unauthenticated' ? 'UNAUTHENTICATED' : 'FORBIDDEN' }
        };
      }

      return {
        ok:true,
        data:{
          roles:roleCatalog.list(),
          canonicalRoleIds:roleCatalog.ids(),
          assignableStaffRoleIds:roleCatalog.staffRoleIds()
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
