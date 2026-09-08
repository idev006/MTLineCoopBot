/**
 * @fileoverview Adapters.Security.AppsScriptPropertiesSessionStore
 * Script Properties-backed server-side session store.
 * Keys contain only SHA-256 token hashes; raw bearer tokens are never persisted.
 */
var Adapters = Adapters || {};
Adapters.Security = Adapters.Security || {};

Adapters.Security.AppsScriptPropertiesSessionStore = (() => {
  'use strict';

  const PREFIX = 'WEB_SESSION_';

  function getProps() {
    return PropertiesService.getScriptProperties();
  }

  function key(tokenHash) {
    const hash = String(tokenHash || '');
    if (!hash) throw new Error('tokenHash is required');
    return PREFIX + hash;
  }

  function save(record) {
    if (!record || !record.tokenHash) throw new Error('session record tokenHash is required');
    getProps().setProperty(key(record.tokenHash), JSON.stringify(record));
    return record;
  }

  function findByTokenHash(tokenHash) {
    const raw = getProps().getProperty(key(tokenHash));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_) {
      return null; // corrupted server state fails closed
    }
  }

  function revokeByTokenHash(tokenHash, revokedAt) {
    const record = findByTokenHash(tokenHash);
    if (!record) return false;
    record.revokedAt = revokedAt instanceof Date ? revokedAt.toISOString() : String(revokedAt || '');
    save(record);
    return true;
  }

  return Object.freeze({ save, findByTokenHash, revokeByTokenHash });
})();
