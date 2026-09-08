/**
 * @fileoverview Adapters.Security.AppsScriptSessionTokenAdapter
 * Generates opaque high-entropy bearer tokens and hashes them one-way.
 */
var Adapters = Adapters || {};
Adapters.Security = Adapters.Security || {};

Adapters.Security.AppsScriptSessionTokenAdapter = (() => {
  'use strict';

  function generate() {
    // Three independent UUID values provide ample entropy for opaque session tokens.
    return [Utilities.getUuid(), Utilities.getUuid(), Utilities.getUuid()].join('.');
  }

  function hash(rawToken) {
    const raw = String(rawToken || '');
    if (!raw) throw new Error('raw session token is required');
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      raw,
      Utilities.Charset.UTF_8
    );
    return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/g, '');
  }

  return Object.freeze({ generate, hash });
})();
