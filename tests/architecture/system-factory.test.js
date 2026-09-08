#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const memberRulesSrc = fs.readFileSync(
  path.join(root, 'app', 'Core', 'MemberRules.js'),
  'utf8'
);
const clockSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'ClockPort.js'),
  'utf8'
);
const memberAccessSrc = fs.readFileSync(
  path.join(root, 'app', 'Engine', 'MemberAccessEngine.js'),
  'utf8'
);
const principalSrc = fs.readFileSync(
  path.join(root, 'app', 'Security', 'Principal.js'),
  'utf8'
);
const identityPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'IdentityPort.js'),
  'utf8'
);
const authorizationSrc = fs.readFileSync(
  path.join(root, 'app', 'Engine', 'AuthorizationEngine.js'),
  'utf8'
);
const denyIdentitySrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Security', 'DenyAllIdentityAdapter.js'),
  'utf8'
);
const lineIdTokenVerifierPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'IdTokenVerifierPort.js'),
  'utf8'
);
const httpClientPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'HttpClientPort.js'),
  'utf8'
);
const appsScriptHttpSrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Http', 'AppsScriptHttpClientAdapter.js'),
  'utf8'
);
const lineVerifierSrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Security', 'LineIdTokenVerifier.js'),
  'utf8'
);
const lineIdentitySrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Security', 'LineIdentityAdapter.js'),
  'utf8'
);
const memberRepoPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'MemberRepositoryPort.js'),
  'utf8'
);
const profileUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Member', 'GetCurrentMemberProfileUseCase.js'),
  'utf8'
);
const financeUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Member', 'GetCurrentMemberFinanceUseCase.js'),
  'utf8'
);
const activationEngineSrc = fs.readFileSync(
  path.join(root, 'app', 'Engine', 'MemberActivationEngine.js'),
  'utf8'
);
const activateUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Member', 'ActivateMemberUseCase.js'),
  'utf8'
);
const renewUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Member', 'RenewMemberUseCase.js'),
  'utf8'
);
const src = fs.readFileSync(
  path.join(root, 'app', 'Composition', 'SystemFactory.js'),
  'utf8'
);

function makeRepo(name) {
  return {
    name,
    findByLineUserId: () => null,
    findByMemberCode: () => null,
    findByActivateCode: () => null,
    activateMember: () => null,
    saveActivation: () => null,
    findSavingsByMember: () => [],
    findLoansByMember: () => [],
    findDividendsByMember: () => [],
    logActivation: () => null,
    listMembers: () => [],
    logExpiry: () => null,
    renewMember: () => null,
    saveRenewal: () => null,
    listNotices: () => [],
    markNoticeSent: () => false,
    listLoans: () => [],
    logReminder: () => null,
    getContent: () => null
  };
}
const fakeRepo = makeRepo('fake-repo');
const fakeClock = { now: () => new Date('2026-09-08T00:00:00Z') };
const fakeConfig = { get: () => ({ mode: 'test' }) };
const fakeApi = { handleRequest: () => ({ ok: true }) };
const fakeIdentity = { authenticate: () => ({ subject: 'test', channel: 'test', roles: [], memberCode: null, claims: {}, authenticated: true }) };
const fakeAuthorization = { requireAuthenticated: () => ({ allowed: true }) };
const fakeLineVerifier = { verify: () => ({ ok: false, error: { code: 'TEST' } }) };
const fakeLineIdentity = { authenticate: () => ({ subject: 'anonymous', channel: 'line', roles: [], memberCode: null, claims: {}, authenticated: false }) };

const sandbox = {
  Composition: {},
  Ports: {},
  Core: {},
  Engine: {},
  Security: {},
  Adapters: {},
  Application: {},
  Data: { MemberRepository: { getRepository: () => makeRepo('prod-repo') } },
  Config: { get: () => ({ mode: 'prod' }) },
  Api: { ApiService: { handleRequest: () => ({ ok: true, source: 'prod' }) } },
  UrlFetchApp: { fetch: () => ({ getResponseCode: () => 401, getContentText: () => '{}' }) },
  encodeURIComponent,
  JSON,
  String,
  Date,
  Object
};

vm.createContext(sandbox);
vm.runInContext(memberRulesSrc, sandbox, { filename: 'MemberRules.js' });
vm.runInContext(clockSrc, sandbox, { filename: 'ClockPort.js' });
vm.runInContext(memberAccessSrc, sandbox, { filename: 'MemberAccessEngine.js' });
vm.runInContext(activationEngineSrc, sandbox, { filename: 'MemberActivationEngine.js' });
vm.runInContext(principalSrc, sandbox, { filename: 'Principal.js' });
vm.runInContext(identityPortSrc, sandbox, { filename: 'IdentityPort.js' });
vm.runInContext(httpClientPortSrc, sandbox, { filename: 'HttpClientPort.js' });
vm.runInContext(lineIdTokenVerifierPortSrc, sandbox, { filename: 'IdTokenVerifierPort.js' });
vm.runInContext(memberRepoPortSrc, sandbox, { filename: 'MemberRepositoryPort.js' });
vm.runInContext(authorizationSrc, sandbox, { filename: 'AuthorizationEngine.js' });
vm.runInContext(appsScriptHttpSrc, sandbox, { filename: 'AppsScriptHttpClientAdapter.js' });
vm.runInContext(denyIdentitySrc, sandbox, { filename: 'DenyAllIdentityAdapter.js' });
vm.runInContext(lineVerifierSrc, sandbox, { filename: 'LineIdTokenVerifier.js' });
vm.runInContext(lineIdentitySrc, sandbox, { filename: 'LineIdentityAdapter.js' });
vm.runInContext(profileUseCaseSrc, sandbox, { filename: 'GetCurrentMemberProfileUseCase.js' });
vm.runInContext(financeUseCaseSrc, sandbox, { filename: 'GetCurrentMemberFinanceUseCase.js' });
vm.runInContext(activateUseCaseSrc, sandbox, { filename: 'ActivateMemberUseCase.js' });
vm.runInContext(renewUseCaseSrc, sandbox, { filename: 'RenewMemberUseCase.js' });
vm.runInContext(src, sandbox, { filename: 'SystemFactory.js' });

const createSystem = sandbox.Composition.SystemFactory.createSystem;

const injected = createSystem({
  memberRepository: fakeRepo,
  clock: fakeClock,
  config: fakeConfig,
  api: fakeApi,
  identity: fakeIdentity,
  authorization: fakeAuthorization,
  lineIdTokenVerifier: fakeLineVerifier,
  lineIdentity: fakeLineIdentity
});

if (injected.memberRepository !== fakeRepo) throw new Error('memberRepository injection failed');
if (injected.clock !== fakeClock) throw new Error('clock injection failed');
if (injected.config !== fakeConfig) throw new Error('config injection failed');
if (injected.api !== fakeApi) throw new Error('api injection failed');
if (injected.identity !== fakeIdentity) throw new Error('identity injection failed');
if (injected.authorization !== fakeAuthorization) throw new Error('authorization injection failed');
if (injected.lineIdTokenVerifier !== fakeLineVerifier) throw new Error('line verifier injection failed');
if (injected.lineIdentity !== fakeLineIdentity) throw new Error('line identity injection failed');
if (!Object.isFrozen(injected)) throw new Error('system bundle must be immutable');

const defaults = createSystem();
if (defaults.memberRepository.name !== 'prod-repo') throw new Error('default repository wiring failed');
if (defaults.config.get().mode !== 'prod') throw new Error('default config wiring failed');
if (!defaults.clock.now()) throw new Error('default clock wiring failed');
if (!defaults.api.handleRequest().ok) throw new Error('default api wiring failed');
if (defaults.identity.authenticate({ channel: 'line' }).authenticated) throw new Error('default identity must fail closed');
if (!defaults.authorization.requireAuthenticated) throw new Error('default authorization wiring failed');
if (!defaults.lineIdentity || typeof defaults.lineIdentity.authenticate !== 'function') throw new Error('default LINE identity wiring failed');
if (!defaults.lineIdTokenVerifier || typeof defaults.lineIdTokenVerifier.verify !== 'function') throw new Error('default LINE verifier wiring failed');
if (!defaults.getCurrentMemberProfile || typeof defaults.getCurrentMemberProfile.execute !== 'function') {
  throw new Error('default profile use case wiring failed');
}
if (!defaults.getCurrentMemberFinance || typeof defaults.getCurrentMemberFinance.execute !== 'function') {
  throw new Error('default finance use case wiring failed');
}
if (!defaults.activateMember || typeof defaults.activateMember.execute !== 'function') {
  throw new Error('default activation use case wiring failed');
}
if (!defaults.renewMember || typeof defaults.renewMember.execute !== 'function') {
  throw new Error('default renewal use case wiring failed');
}

console.log('PASS  SystemFactory explicit dependency wiring');
console.log('PASS  SystemFactory production defaults');
console.log('=== ARCHITECTURE TESTS PASS (2/2) ===');
