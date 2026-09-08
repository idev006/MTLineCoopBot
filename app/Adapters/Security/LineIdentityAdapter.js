/**
 * @fileoverview Adapters.Security.LineIdentityAdapter
 * Converts a verified LINE ID token into the canonical Principal.
 */
var Adapters = Adapters || {};
Adapters.Security = Adapters.Security || {};

Adapters.Security.LineIdentityAdapter = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const verifier = Ports.IdTokenVerifierPort.assertImplemented(d.verifier);
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const clientIdProvider = d.clientIdProvider;

    if (typeof clientIdProvider !== 'function') {
      throw new Error('LineIdentityAdapter requires clientIdProvider()');
    }

    function authenticate(input) {
      const x = input || {};
      const clientId = clientIdProvider();

      if (!clientId) {
        return Security.Principal.anonymous('line');
      }

      const verified = verifier.verify({
        idToken: x.idToken,
        clientId
      });

      if (!verified.ok) {
        return Security.Principal.anonymous('line');
      }

      const lineUserId = verified.claims.subject;
      const member = repo.findByLineUserId(lineUserId);

      return Security.Principal.create({
        subject: 'line:' + lineUserId,
        channel: 'line',
        roles: member && member.mem_role ? [member.mem_role] : [],
        memberCode: member ? member.mem_code : null,
        claims: {
          provider: 'line',
          lineUserId,
          issuer: verified.claims.issuer,
          audience: verified.claims.audience
        },
        authenticated: true
      });
    }

    return Object.freeze({ authenticate });
  }

  return { create };
})();
