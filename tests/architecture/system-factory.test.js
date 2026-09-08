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
const src = fs.readFileSync(
  path.join(root, 'app', 'Composition', 'SystemFactory.js'),
  'utf8'
);

const fakeRepo = { name: 'fake-repo' };
const fakeClock = { now: () => new Date('2026-09-08T00:00:00Z') };
const fakeConfig = { get: () => ({ mode: 'test' }) };
const fakeApi = { handleRequest: () => ({ ok: true }) };
const fakeIdentity = { authenticate: () => ({ subject: 'test', channel: 'test', roles: [], memberCode: null, claims: {}, authenticated: true }) };
const fakeAuthorization = { requireAuthenticated: () => ({ allowed: true }) };

const sandbox = {
  Composition: {},
  Ports: {},
  Core: {},
  Engine: {},
  Security: {},
  Adapters: {},
  Data: { MemberRepository: { getRepository: () => ({ name: 'prod-repo' }) } },
  Config: { get: () => ({ mode: 'prod' }) },
  Api: { ApiService: { handleRequest: () => ({ ok: true, source: 'prod' }) } },
  Date,
  Object
};

vm.createContext(sandbox);
vm.runInContext(memberRulesSrc, sandbox, { filename: 'MemberRules.js' });
vm.runInContext(clockSrc, sandbox, { filename: 'ClockPort.js' });
vm.runInContext(memberAccessSrc, sandbox, { filename: 'MemberAccessEngine.js' });
vm.runInContext(principalSrc, sandbox, { filename: 'Principal.js' });
vm.runInContext(identityPortSrc, sandbox, { filename: 'IdentityPort.js' });
vm.runInContext(authorizationSrc, sandbox, { filename: 'AuthorizationEngine.js' });
vm.runInContext(denyIdentitySrc, sandbox, { filename: 'DenyAllIdentityAdapter.js' });
vm.runInContext(src, sandbox, { filename: 'SystemFactory.js' });

const createSystem = sandbox.Composition.SystemFactory.createSystem;

const injected = createSystem({
  memberRepository: fakeRepo,
  clock: fakeClock,
  config: fakeConfig,
  api: fakeApi,
  identity: fakeIdentity,
  authorization: fakeAuthorization
});

if (injected.memberRepository !== fakeRepo) throw new Error('memberRepository injection failed');
if (injected.clock !== fakeClock) throw new Error('clock injection failed');
if (injected.config !== fakeConfig) throw new Error('config injection failed');
if (injected.api !== fakeApi) throw new Error('api injection failed');
if (injected.identity !== fakeIdentity) throw new Error('identity injection failed');
if (injected.authorization !== fakeAuthorization) throw new Error('authorization injection failed');
if (!Object.isFrozen(injected)) throw new Error('system bundle must be immutable');

const defaults = createSystem();
if (defaults.memberRepository.name !== 'prod-repo') throw new Error('default repository wiring failed');
if (defaults.config.get().mode !== 'prod') throw new Error('default config wiring failed');
if (!defaults.clock.now()) throw new Error('default clock wiring failed');
if (!defaults.api.handleRequest().ok) throw new Error('default api wiring failed');
if (defaults.identity.authenticate({ channel: 'line' }).authenticated) throw new Error('default identity must fail closed');
if (!defaults.authorization.requireAuthenticated) throw new Error('default authorization wiring failed');

console.log('PASS  SystemFactory explicit dependency wiring');
console.log('PASS  SystemFactory production defaults');
console.log('=== ARCHITECTURE TESTS PASS (2/2) ===');
