/**
 * @fileoverview Adapters.Security.DenyAllIdentityAdapter
 * Fail-closed default identity adapter.
 */
var Adapters = Adapters || {};
Adapters.Security = Adapters.Security || {};

Adapters.Security.DenyAllIdentityAdapter = (() => {
  'use strict';

  function authenticate(input) {
    const channel = input && input.channel ? input.channel : 'system';
    return Security.Principal.anonymous(channel);
  }

  return Object.freeze({ authenticate });
})();
