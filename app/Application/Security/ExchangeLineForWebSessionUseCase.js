/**
 * @fileoverview Application.Security.ExchangeLineForWebSessionUseCase
 * Verified LINE identity -> authorized Web Principal -> opaque server session.
 */
var Application = Application || {};
Application.Security = Application.Security || {};

Application.Security.ExchangeLineForWebSessionUseCase = (() => {
  'use strict';

  const WEB_ROLES = Object.freeze(['staff', 'admin', 'manager']);

  function create(deps) {
    const d = deps || {};
    const lineIdentity = Ports.IdentityPort.assertImplemented(d.lineIdentity);
    const authorization = d.authorization;
    const createWebSession = d.createWebSession;

    if (!authorization || typeof authorization.requireAnyRole !== 'function') {
      throw new Error('ExchangeLineForWebSessionUseCase requires authorization.requireAnyRole');
    }
    if (!createWebSession || typeof createWebSession.execute !== 'function') {
      throw new Error('ExchangeLineForWebSessionUseCase requires createWebSession.execute');
    }

    function execute(input) {
      const idToken = input && input.idToken;
      if (!idToken) return { ok:false, error:{ code:'UNAUTHENTICATED' } };

      const linePrincipal = lineIdentity.authenticate({ idToken });
      if (!Security.Principal.isAuthenticated(linePrincipal)) {
        return { ok:false, error:{ code:'UNAUTHENTICATED' } };
      }

      const roleCheck = authorization.requireAnyRole(linePrincipal, WEB_ROLES);
      if (!roleCheck.allowed) {
        return { ok:false, error:{ code:'FORBIDDEN', reason:roleCheck.reason } };
      }

      const webPrincipal = Security.Principal.create({
        subject:'web:' + linePrincipal.subject,
        channel:'web',
        roles:Array.from(linePrincipal.roles || []),
        memberCode:linePrincipal.memberCode || null,
        claims:{
          provider:'line',
          sourceSubject:linePrincipal.subject,
          lineUserId:linePrincipal.claims && linePrincipal.claims.lineUserId
            ? linePrincipal.claims.lineUserId
            : null
        },
        authenticated:true
      });

      return createWebSession.execute({ principal:webPrincipal });
    }

    return Object.freeze({ execute });
  }

  return { create, WEB_ROLES };
})();
