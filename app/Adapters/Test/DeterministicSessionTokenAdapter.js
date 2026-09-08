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
      hash: raw => {
        const s = String(raw || '');
        let acc = 17;
        for (let i = 0; i < s.length; i++) acc = ((acc * 31) + s.charCodeAt(i)) >>> 0;
        return 'test-hash-' + s.length + '-' + acc.toString(16);
      }
    });
  }

  return { create };
})();
