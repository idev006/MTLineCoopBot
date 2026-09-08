/**
 * @fileoverview Adapters.Test.DeterministicSessionTokenAdapter
 */
var Adapters = Adapters || {};
Adapters.Test = Adapters.Test || {};

Adapters.Test.DeterministicSessionTokenAdapter = (() => {
  'use strict';

  function create(seed) {
    let counter = 0;
    const prefix = String(seed || 'test-session');
    return Object.freeze({
      generate: () => prefix + '-' + (++counter),
      hash: raw => 'hash:' + String(raw || '')
    });
  }

  return { create };
})();
