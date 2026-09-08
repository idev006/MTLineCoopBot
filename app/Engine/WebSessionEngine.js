/**
 * @fileoverview Engine.WebSessionEngine
 * Pure policy for issuing and validating server-side Web sessions.
 */
var Engine = Engine || {};

Engine.WebSessionEngine = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const clock = Ports.ClockPort.assertImplemented(d.clock);

    function toIso(value) {
      return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
    }

    function createRecord(input) {
      const x = input || {};
      const principal = x.principal;
      const tokenHash = String(x.tokenHash || '');
      const ttlSeconds = Number(x.ttlSeconds);

      if (!Security.Principal.isAuthenticated(principal)) {
        return { ok:false, error:{ code:'UNAUTHENTICATED' } };
      }
      if (principal.channel !== 'web') {
        return { ok:false, error:{ code:'WEB_PRINCIPAL_REQUIRED' } };
      }
      if (!tokenHash) return { ok:false, error:{ code:'TOKEN_HASH_REQUIRED' } };
      if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) {
        return { ok:false, error:{ code:'SESSION_TTL_INVALID' } };
      }

      const issuedAt = clock.now();
      const expiresAt = new Date(issuedAt.getTime() + (ttlSeconds * 1000));

      return {
        ok:true,
        data:Object.freeze({
          tokenHash,
          subject:principal.subject,
          channel:'web',
          roles:Object.freeze(Array.from(principal.roles || [])),
          memberCode:principal.memberCode || null,
          claims:Object.freeze({ ...(principal.claims || {}) }),
          issuedAt:toIso(issuedAt),
          expiresAt:toIso(expiresAt),
          revokedAt:null
        })
      };
    }

    function evaluate(record) {
      if (!record || !record.tokenHash) {
        return { valid:false, reason:'not_found' };
      }
      if (record.revokedAt) {
        return { valid:false, reason:'revoked' };
      }

      const expiresAt = new Date(record.expiresAt);
      if (!Number.isFinite(expiresAt.getTime())) {
        return { valid:false, reason:'invalid_expiry' };
      }
      if (clock.now().getTime() >= expiresAt.getTime()) {
        return { valid:false, reason:'expired' };
      }

      return {
        valid:true,
        principal:Security.Principal.create({
          subject:String(record.subject || ''),
          channel:'web',
          roles:Array.isArray(record.roles) ? record.roles : [],
          memberCode:record.memberCode || null,
          claims:{ ...(record.claims || {}), sessionIssuedAt:record.issuedAt, sessionExpiresAt:record.expiresAt },
          authenticated:true
        })
      };
    }

    return Object.freeze({ createRecord, evaluate });
  }

  return { create };
})();
