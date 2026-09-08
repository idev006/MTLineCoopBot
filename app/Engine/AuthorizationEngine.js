/**
 * @fileoverview Engine.AuthorizationEngine
 * Headless deterministic authorization over verified Principal objects.
 */
var Engine = Engine || {};

Engine.AuthorizationEngine = (() => {
  'use strict';

  function create() {
    function requireAuthenticated(principal) {
      return Security.Principal.isAuthenticated(principal)
        ? { allowed: true, reason: 'authenticated' }
        : { allowed: false, reason: 'unauthenticated' };
    }

    function requireRole(principal, role) {
      if (!Security.Principal.isAuthenticated(principal)) {
        return { allowed: false, reason: 'unauthenticated' };
      }
      const roles = principal.roles || [];
      return roles.includes(role)
        ? { allowed: true, reason: 'role_match' }
        : { allowed: false, reason: 'forbidden' };
    }

    function requireAnyRole(principal, roles) {
      if (!Security.Principal.isAuthenticated(principal)) {
        return { allowed: false, reason: 'unauthenticated' };
      }
      const required = Array.isArray(roles) ? roles : [];
      const ok = required.some(r => (principal.roles || []).includes(r));
      return ok
        ? { allowed: true, reason: 'role_match' }
        : { allowed: false, reason: 'forbidden' };
    }

    function requireMemberBinding(principal, memberCode) {
      if (!Security.Principal.isAuthenticated(principal)) {
        return { allowed: false, reason: 'unauthenticated' };
      }
      if (!principal.memberCode || !memberCode) {
        return { allowed: false, reason: 'unbound_member' };
      }
      return principal.memberCode === memberCode
        ? { allowed: true, reason: 'member_match' }
        : { allowed: false, reason: 'member_mismatch' };
    }

    return Object.freeze({
      requireAuthenticated,
      requireRole,
      requireAnyRole,
      requireMemberBinding
    });
  }

  return { create };
})();
