/**
 * @fileoverview Adapters.Test.InMemorySessionStore
 */
var Adapters = Adapters || {};
Adapters.Test = Adapters.Test || {};

Adapters.Test.InMemorySessionStore = (() => {
  'use strict';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function create() {
    const byHash = new Map();

    function save(record) {
      byHash.set(String(record.tokenHash), clone(record));
      return clone(record);
    }

    function findByTokenHash(tokenHash) {
      return clone(byHash.get(String(tokenHash)) || null);
    }

    function revokeByTokenHash(tokenHash, revokedAt) {
      const key = String(tokenHash);
      const current = byHash.get(key);
      if (!current) return false;
      current.revokedAt = revokedAt instanceof Date ? revokedAt.toISOString() : String(revokedAt || '');
      byHash.set(key, current);
      return true;
    }

    function snapshot() {
      return Array.from(byHash.values()).map(clone);
    }

    return Object.freeze({ save, findByTokenHash, revokeByTokenHash, snapshot });
  }

  return { create };
})();
