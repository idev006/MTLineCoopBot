/**
 * @fileoverview Adapters.Test.FakeIdentityAdapter
 * Deterministic identity adapter for automated tests.
 */
var Adapters = Adapters || {};
Adapters.Test = Adapters.Test || {};

Adapters.Test.FakeIdentityAdapter = (() => {
  'use strict';

  function create(principal) {
    return Object.freeze({
      authenticate: () => principal
    });
  }

  return { create };
})();
