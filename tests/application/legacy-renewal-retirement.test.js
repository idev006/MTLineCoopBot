#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','..');

const registry=fs.readFileSync(path.join(root,'app','Api','ApiRegistry.js'),'utf8');
const handlers=fs.readFileSync(path.join(root,'app','Api','ApiHandlers.js'),'utf8');
const service=fs.readFileSync(path.join(root,'app','LineBot','RenewalService.js'),'utf8');
const eventHandler=fs.readFileSync(path.join(root,'app','LineBot','EventHandler.js'),'utf8');

if (registry.includes("path: '/api/member/renew'")) {
  throw new Error('legacy /api/member/renew route must remain retired');
}
if (/function\s+renew\s*\(ctx\)/.test(handlers)) {
  throw new Error('legacy renewal handler must remain removed');
}
if (/findByActivateCode\s*\(/.test(handlers) && /lineUserId/.test(handlers)) {
  throw new Error('handlers still contain legacy code-based lineUserId renewal logic');
}

if (!/LEGACY_RENEWAL_RETIRED/.test(service)) {
  throw new Error('legacy RenewalService must fail closed with retirement code');
}
for (const forbidden of [
  /Api\.ApiService\.handleRequest/,
  /\/api\/member\/renew/,
  /renewMember\s*\(/,
  /findByActivateCode\s*\(/,
  /RichMenu\.Gating\.linkMemberMenu/,
  /logActivation\s*\(/
]) {
  if (forbidden.test(service)) {
    throw new Error('retired RenewalService still has mutation/binding capability: ' + forbidden);
  }
}

for (const forbidden of [
  /RenewalService\.handleRenew/,
  /RenewalService\.handleConfirmRenew/
]) {
  if (forbidden.test(eventHandler)) {
    throw new Error('production EventHandler must not call legacy RenewalService: ' + forbidden);
  }
}
if (!/LIFF_ACTIVATION_URL/.test(eventHandler) || !/Secure LIFF handoff sent/.test(eventHandler)) {
  throw new Error('production renewal intent must hand off to secure LIFF');
}

if (!registry.includes("path: '/api/member/me/renew'")) {
  throw new Error('canonical verified self-renew route must remain');
}

console.log('PASS  legacy renewal route/handler are removed');
console.log('PASS  retired RenewalService cannot call API, persist, audit or rebind identity');
console.log('PASS  production chat has no direct RenewalService caller');
console.log('PASS  canonical ID-token self-renew + secure LIFF handoff remain');
console.log('=== LEGACY RENEWAL RETIREMENT TESTS PASS (4/4) ===');
