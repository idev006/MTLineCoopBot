/**
 * @fileoverview Adapters.Security.WebSessionIdentityAdapter
 * IdentityPort adapter resolving an opaque Web session into canonical Principal.
 */
var Adapters = Adapters || {};
Adapters.Security = Adapters.Security || {};

Adapters.Security.WebSessionIdentityAdapter = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const verifySession = d.verifySession;
    if (!verifySession || typeof verifySession.execute !== 'function') {
      throw new Error('WebSessionIdentityAdapter requires verifySession.execute');
    }

    function authenticate(input) {
      const result = verifySession.execute({ token: input && input.sessionToken });
      return result.ok
        ? result.data.principal
        : Security.Principal.anonymous('web');
    }

    return Object.freeze({ authenticate });
  }

  return { create };
})();
