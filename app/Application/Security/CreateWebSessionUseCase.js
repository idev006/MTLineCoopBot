/**
 * @fileoverview Application.Security.CreateWebSessionUseCase
 * Creates a server-side opaque session from an already verified Principal.
 */
var Application = Application || {};
Application.Security = Application.Security || {};

Application.Security.CreateWebSessionUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const store = Ports.SessionStorePort.assertImplemented(d.sessionStore);
    const tokens = Ports.SessionTokenPort.assertImplemented(d.sessionTokens);
    const config = Ports.ConfigPort.assertImplemented(d.config);
    const engine = d.sessionEngine;

    if (!engine || typeof engine.createRecord !== 'function') {
      throw new Error('CreateWebSessionUseCase requires sessionEngine.createRecord');
    }

    function execute(input) {
      const principal = input && input.principal;
      if (!Security.Principal.isAuthenticated(principal)) {
        return { ok:false, error:{ code:'UNAUTHENTICATED' } };
      }

      const rawToken = tokens.generate();
      const tokenHash = tokens.hash(rawToken);
      const ttlSeconds = Number(config.get().WEB_SESSION_TTL_SECONDS || 28800);
      const built = engine.createRecord({ principal, tokenHash, ttlSeconds });
      if (!built.ok) return built;

      store.save(built.data);
      return {
        ok:true,
        data:{
          token:rawToken,
          expiresAt:built.data.expiresAt,
          user:{
            subject:principal.subject,
            roles:Array.from(principal.roles || []),
            memberCode:principal.memberCode || null
          }
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
