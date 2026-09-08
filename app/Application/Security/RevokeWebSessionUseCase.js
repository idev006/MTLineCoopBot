/**
 * @fileoverview Application.Security.RevokeWebSessionUseCase
 */
var Application = Application || {};
Application.Security = Application.Security || {};

Application.Security.RevokeWebSessionUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const store = Ports.SessionStorePort.assertImplemented(d.sessionStore);
    const tokens = Ports.SessionTokenPort.assertImplemented(d.sessionTokens);
    const clock = Ports.ClockPort.assertImplemented(d.clock);

    function execute(input) {
      const rawToken = input && input.token;
      if (!rawToken) return { ok:false, error:{ code:'UNAUTHENTICATED' } };
      const tokenHash = tokens.hash(rawToken);
      const revoked = store.revokeByTokenHash(tokenHash, clock.now());
      return revoked
        ? { ok:true, data:{ revoked:true } }
        : { ok:false, error:{ code:'UNAUTHENTICATED' } };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
