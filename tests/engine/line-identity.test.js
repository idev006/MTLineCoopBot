#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..', '..');

const files = [
  'app/Security/Principal.js',
  'app/Ports/HttpClientPort.js',
  'app/Ports/IdTokenVerifierPort.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Adapters/Security/LineIdTokenVerifier.js',
  'app/Adapters/Security/LineIdentityAdapter.js'
];

const sandbox = { Security:{}, Ports:{}, Adapters:{}, Object, Array, Set, JSON, encodeURIComponent, String };
vm.createContext(sandbox);
for (const rel of files) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}

const methods = sandbox.Ports.MemberRepositoryPort.listMethods();
function repoWith(member) {
  const repo = {};
  for (const m of methods) repo[m] = () => null;
  repo.findByLineUserId = id => member && id === 'U123' ? member : null;
  return repo;
}

const http = {
  request: () => ({
    status: 200,
    body: JSON.stringify({
      iss: 'https://access.line.me',
      sub: 'U123',
      aud: '1234567890',
      exp: 9999999999,
      iat: 1
    })
  })
};

const verifier = sandbox.Adapters.Security.LineIdTokenVerifier.create({ httpClient: http });
const verified = verifier.verify({ idToken: 'raw-token', clientId: '1234567890' });
if (!verified.ok || verified.claims.subject !== 'U123') throw new Error('valid LINE token response should verify');

const badAudHttp = {
  request: () => ({ status: 200, body: JSON.stringify({ sub:'U123', aud:'wrong' }) })
};
const badAud = sandbox.Adapters.Security.LineIdTokenVerifier.create({ httpClient: badAudHttp })
  .verify({ idToken:'raw', clientId:'1234567890' });
if (badAud.ok) throw new Error('audience mismatch must fail closed');

const member = { mem_code:'M001', mem_role:'member' };
const identity = sandbox.Adapters.Security.LineIdentityAdapter.create({
  verifier,
  memberRepository: repoWith(member),
  clientIdProvider: () => '1234567890'
});
const principal = identity.authenticate({ idToken:'raw-token' });
if (!principal.authenticated || principal.memberCode !== 'M001') throw new Error('verified member principal mapping failed');
if (principal.claims.lineUserId !== 'U123') throw new Error('verified subject mapping failed');

const invalidVerifier = { verify: () => ({ ok:false, error:{code:'ID_TOKEN_INVALID'} }) };
const denied = sandbox.Adapters.Security.LineIdentityAdapter.create({
  verifier: invalidVerifier,
  memberRepository: repoWith(member),
  clientIdProvider: () => '1234567890'
}).authenticate({ idToken:'bad' });
if (denied.authenticated) throw new Error('invalid ID token must return anonymous principal');

console.log('PASS  LINE ID token verifier accepts verified claims');
console.log('PASS  LINE ID token verifier rejects audience mismatch');
console.log('PASS  LineIdentityAdapter maps verified sub to member Principal');
console.log('PASS  invalid token fails closed');
console.log('=== LINE VERIFIED IDENTITY TESTS PASS (4/4) ===');
