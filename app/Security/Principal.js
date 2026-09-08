/**
 * @fileoverview Security.Principal
 * Canonical authenticated identity model.
 */
var Security = Security || {};

Security.Principal = (() => {
  'use strict';

  const CHANNELS = Object.freeze(['line', 'web', 'system', 'test']);

  function create(input) {
    const x = input || {};
    const authenticated = x.authenticated === true;

    if (!x.subject || typeof x.subject !== 'string') {
      throw new Error('Principal.subject is required');
    }
    if (!CHANNELS.includes(x.channel)) {
      throw new Error('Principal.channel is invalid');
    }

    const roles = Array.isArray(x.roles)
      ? Array.from(new Set(x.roles.filter(r => typeof r === 'string' && r)))
      : [];

    return Object.freeze({
      subject: x.subject,
      channel: x.channel,
      roles: Object.freeze(roles),
      memberCode: x.memberCode || null,
      claims: Object.freeze({ ...(x.claims || {}) }),
      authenticated
    });
  }

  function anonymous(channel) {
    return create({
      subject: 'anonymous',
      channel: channel || 'system',
      roles: [],
      authenticated: false
    });
  }

  function isAuthenticated(principal) {
    return !!(principal && principal.authenticated === true && principal.subject);
  }

  return { create, anonymous, isAuthenticated };
})();
