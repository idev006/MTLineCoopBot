/**
 * @fileoverview Application.Security.VerifyWebSessionUseCase
 */
var Application = Application || {};
Application.Security = Application.Security || {};

Application.Security.VerifyWebSessionUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const store = Ports.SessionStorePort.assertImplemented(d.sessionStore);
    const tokens = Ports.SessionTokenPort.assertImplemented(d.sessionTokens);
    const engine = d.sessionEngine;

    if (!engine || typeof engine.evaluate !== 'function') {
      throw new Error('VerifyWebSessionUseCase requires sessionEngine.evaluate');
    }

    function execute(input) {
      const rawToken = input && input.token;
      if (!rawToken) {
        return { ok:false, error:{ code:'UNAUTHENTICATED', reason:'missing_token' } };
      }

      const tokenHash = tokens.hash(rawToken);
      const record = store.findByTokenHash(tokenHash);
      const result = engine.evaluate(record);
      if (!result.valid) {
        return { ok:false, error:{ code:'UNAUTHENTICATED', reason:result.reason } };
      }

      return { ok:true, data:{ principal:result.principal } };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
