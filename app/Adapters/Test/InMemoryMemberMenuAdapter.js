/**
 * @fileoverview Adapters.Test.InMemoryMemberMenuAdapter
 */
var Adapters = Adapters || {};
Adapters.Test = Adapters.Test || {};

Adapters.Test.InMemoryMemberMenuAdapter = (() => {
  'use strict';

  function create() {
    const revoked = [];
    function revokeMemberMenu(lineUserId) {
      revoked.push(String(lineUserId || ''));
      return { ok:true };
    }
    function listRevoked() { return revoked.slice(); }
    function reset() { revoked.length = 0; }
    return Object.freeze({ revokeMemberMenu, listRevoked, reset });
  }

  return { create };
})();
