#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(
  path.join(__dirname, '..', '..', 'app', 'Ports', 'MemberRepositoryPort.js'),
  'utf8'
);

const sandbox = { Ports: {}, Object };
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'MemberRepositoryPort.js' });

const port = sandbox.Ports.MemberRepositoryPort;
const methods = port.listMethods();

const complete = {};
for (const name of methods) complete[name] = () => null;

if (port.assertImplemented(complete) !== complete) {
  throw new Error('complete adapter must be returned unchanged');
}

const incomplete = { ...complete };
delete incomplete[methods[0]];
let rejected = false;
try {
  port.assertImplemented(incomplete);
} catch (e) {
  rejected = String(e.message).includes(methods[0]);
}
if (!rejected) throw new Error('incomplete adapter must be rejected with missing method');

if (methods.includes('isActiveMember') || methods.includes('hasRole')) {
  throw new Error('persistence port must not contain domain authorization/validity policy');
}

console.log('PASS  MemberRepositoryPort accepts complete adapter');
console.log('PASS  MemberRepositoryPort rejects incomplete adapter');
console.log('PASS  MemberRepositoryPort is persistence-only');
console.log('=== MEMBER REPOSITORY CONTRACT TESTS PASS (3/3) ===');
