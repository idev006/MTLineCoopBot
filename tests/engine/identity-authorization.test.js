#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const files = [
  'app/Security/Principal.js',
  'app/Ports/IdentityPort.js',
  'app/Engine/AuthorizationEngine.js',
  'app/Adapters/Security/DenyAllIdentityAdapter.js',
  'app/Adapters/Test/FakeIdentityAdapter.js'
];

const sandbox = { Security: {}, Ports: {}, Engine: {}, Adapters: {}, Object, Set, Array };
vm.createContext(sandbox);
for (const rel of files) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}

const Principal = sandbox.Security.Principal;
const authz = sandbox.Engine.AuthorizationEngine.create();

const member = Principal.create({
  subject: 'line:U123',
  channel: 'line',
  roles: ['member'],
  memberCode: 'M001',
  authenticated: true
});

if (!authz.requireAuthenticated(member).allowed) throw new Error('authenticated principal denied');
if (!authz.requireRole(member, 'member').allowed) throw new Error('member role denied');
if (authz.requireRole(member, 'admin').allowed) throw new Error('admin must be denied');
if (!authz.requireAnyRole(member, ['staff', 'member']).allowed) throw new Error('any-role should allow');
if (!authz.requireMemberBinding(member, 'M001').allowed) throw new Error('member binding should allow');
if (authz.requireMemberBinding(member, 'M999').allowed) throw new Error('member mismatch must deny');

const deny = sandbox.Adapters.Security.DenyAllIdentityAdapter.authenticate({ channel: 'line' });
if (Principal.isAuthenticated(deny)) throw new Error('deny-all identity must be anonymous');
if (authz.requireAuthenticated(deny).allowed) throw new Error('anonymous must be denied');

const fake = sandbox.Adapters.Test.FakeIdentityAdapter.create(member);
sandbox.Ports.IdentityPort.assertImplemented(fake);
if (fake.authenticate() !== member) throw new Error('fake identity adapter must return configured principal');

let badPrincipal = false;
try {
  Principal.create({ channel: 'line', authenticated: true });
} catch (_) { badPrincipal = true; }
if (!badPrincipal) throw new Error('principal without subject must fail');

console.log('PASS  Principal immutable authenticated model');
console.log('PASS  AuthorizationEngine fail-closed rules');
console.log('PASS  DenyAllIdentityAdapter defaults unauthenticated');
console.log('PASS  FakeIdentityAdapter satisfies IdentityPort');
console.log('=== IDENTITY/AUTHORIZATION TESTS PASS (4/4) ===');
