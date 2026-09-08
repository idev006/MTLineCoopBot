/**
 * @fileoverview Adapters.Test.FakeIdTokenVerifier
 */
var Adapters = Adapters || {};
Adapters.Test = Adapters.Test || {};

Adapters.Test.FakeIdTokenVerifier = (() => {
  'use strict';

  function create(result) {
    return Object.freeze({
      verify: () => result
    });
  }

  return { create };
})();
