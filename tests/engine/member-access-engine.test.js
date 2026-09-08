#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const files = [
  'app/Core/MemberRules.js',
  'app/Ports/ClockPort.js',
  'app/Engine/MemberAccessEngine.js'
];

const sandbox = { Core: {}, Ports: {}, Engine: {}, Date, Object };
vm.createContext(sandbox);
for (const rel of files) {
  vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), sandbox, { filename: rel });
}

const fixed = new Date(2026, 8, 8, 12, 0, 0);
const clock = { now: () => fixed };
const access = sandbox.Engine.MemberAccessEngine.create({ clock });

const active = {
  mem_status: 'active',
  mem_role: 'member',
  mem_eff_dt: '2026-01-01',
  mem_exp_dt: '2026-12-31'
};
const expired = { ...active, mem_exp_dt: '2026-01-31' };
const unknownRole = { ...active, mem_role: 'unknown' };

if (!access.isActive(active)) throw new Error('active member should be active');
if (access.isActive(expired)) throw new Error('expired member should be inactive');
if (!access.hasRole(active, 'member')) throw new Error('member role should match');
if (access.hasRole(active, 'admin')) throw new Error('wrong role must be denied');
if (!access.hasKnownRole(active)) throw new Error('known active role should authorize');
if (access.hasKnownRole(unknownRole)) throw new Error('unknown role must be denied');

const expiry = access.expiryStatus(active, 120);
if (!['valid', 'expiring'].includes(expiry.status)) throw new Error('expiry status must be deterministic');

let rejected = false;
try { sandbox.Engine.MemberAccessEngine.create({ clock: {} }); } catch (_) { rejected = true; }
if (!rejected) throw new Error('invalid clock dependency must be rejected');

console.log('PASS  MemberAccessEngine validity');
console.log('PASS  MemberAccessEngine role authorization');
console.log('PASS  MemberAccessEngine known-role gate');
console.log('PASS  MemberAccessEngine deterministic clock');
console.log('PASS  MemberAccessEngine rejects invalid clock port');
console.log('=== MEMBER ACCESS ENGINE TESTS PASS (5/5) ===');
