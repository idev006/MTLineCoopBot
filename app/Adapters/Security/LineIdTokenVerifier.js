/**
 * @fileoverview Adapters.Security.LineIdTokenVerifier
 * Verifies raw LINE Login/LIFF ID tokens using LINE's official verify endpoint.
 *
 * Official endpoint:
 * POST https://api.line.me/oauth2/v2.1/verify
 * Content-Type: application/x-www-form-urlencoded
 */
var Adapters = Adapters || {};
Adapters.Security = Adapters.Security || {};

Adapters.Security.LineIdTokenVerifier = (() => {
  'use strict';

  const VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify';

  function formEncode(data) {
    return Object.keys(data)
      .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(data[k]))
      .join('&');
  }

  function create(deps) {
    const d = deps || {};
    const http = Ports.HttpClientPort.assertImplemented(d.httpClient);

    function verify(input) {
      const x = input || {};
      if (!x.idToken || !x.clientId) {
        return { ok: false, error: { code: 'INVALID_IDENTITY_INPUT' } };
      }

      const res = http.request({
        method: 'post',
        url: VERIFY_URL,
        contentType: 'application/x-www-form-urlencoded',
        payload: formEncode({
          id_token: x.idToken,
          client_id: x.clientId
        })
      });

      let body = null;
      try {
        body = JSON.parse(res.body || '{}');
      } catch (_) {
        return { ok: false, error: { code: 'IDENTITY_PROVIDER_INVALID_RESPONSE' } };
      }

      if (res.status !== 200) {
        return {
          ok: false,
          error: {
            code: 'ID_TOKEN_INVALID',
            providerCode: body.error || null
          }
        };
      }

      if (!body.sub || String(body.aud) !== String(x.clientId)) {
        return { ok: false, error: { code: 'ID_TOKEN_CLAIMS_INVALID' } };
      }

      return {
        ok: true,
        claims: {
          issuer: body.iss || null,
          subject: body.sub,
          audience: body.aud,
          expiresAt: body.exp || null,
          issuedAt: body.iat || null,
          name: body.name || null,
          picture: body.picture || null,
          email: body.email || null
        }
      };
    }

    return Object.freeze({ verify });
  }

  return { create };
})();
