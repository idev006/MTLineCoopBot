#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','..');

const registry=fs.readFileSync(path.join(root,'app','Api','ApiRegistry.js'),'utf8');
const handlers=fs.readFileSync(path.join(root,'app','Api','ApiHandlers.js'),'utf8');
const service=fs.readFileSync(path.join(root,'app','LineBot','ActivationService.js'),'utf8');
const eventHandler=fs.readFileSync(path.join(root,'app','LineBot','EventHandler.js'),'utf8');

if (registry.includes("path: '/api/member/activate'")) {
  throw new Error('legacy /api/member/activate route must remain retired');
}
if (/function\s+activate\s*\(ctx\)/.test(handlers)) {
  throw new Error('legacy activation handler must remain removed');
}
if (/system\.activateMember\.execute\s*\(\{\s*activateCode\s*,\s*lineUserId/.test(handlers)) {
  throw new Error('handler still trusts client lineUserId for activation');
}

if (!/LEGACY_ACTIVATION_RETIRED/.test(service)) {
  throw new Error('legacy ActivationService must fail closed with retirement code');
}
for (const forbidden of [
  /Api\.ApiService\.handleRequest/,
  /\/api\/member\/activate/,
  /saveActivation/,
  /activateMember\.execute/,
  /RichMenu\.Gating\.linkMemberMenu/
]) {
  if (forbidden.test(service)) {
    throw new Error('retired ActivationService still has direct-binding capability: ' + forbidden);
  }
}

if (/ActivationService\.handleActivate/.test(eventHandler)) {
  throw new Error('production EventHandler must not call legacy ActivationService');
}
if (!/LIFF_ACTIVATION_URL/.test(eventHandler)) {
  throw new Error('production activation intent must hand off to LIFF');
}

console.log('PASS  legacy activation route/handler are removed');
console.log('PASS  retired ActivationService cannot call API or persist/link binding');
console.log('PASS  production chat has no direct ActivationService caller');
console.log('PASS  secure LIFF handoff remains production activation path');
console.log('=== LEGACY ACTIVATION RETIREMENT TESTS PASS (4/4) ===');
