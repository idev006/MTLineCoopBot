#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..','..');

const src=fs.readFileSync(path.join(root,'app','LineBot','EventHandler.js'),'utf8');

for(const forbidden of [
  /RenewalService\.handleRenew/,
  /RenewalService\.handleConfirmRenew/,
  /\/api\/member\/renew/,
  /renewMember\s*\(/,
  /findByActivateCode\s*\(/
]){
  if(forbidden.test(src)) {
    throw new Error('chat renewal still has direct/legacy mutation path: '+forbidden);
  }
}

if(!/LIFF_ACTIVATION_URL/.test(src)) {
  throw new Error('renewal chat must hand off to LIFF member surface');
}
if(!/Secure LIFF handoff sent/.test(src) || !/Legacy confirm postback handed off to secure LIFF/.test(src)) {
  throw new Error('secure renewal handoff markers missing');
}

// Renewal code may be detected only to explain that it is ignored.
// It must not be interpolated into the LIFF URL or passed to a service/API.
if(/code=.*activateCode/.test(src) || /LIFF_ACTIVATION_URL[^\n]*activateCode/.test(src)) {
  throw new Error('renewal code must never be propagated as identity/renewal authority');
}

console.log('PASS  chat renewal cannot call legacy RenewalService/API');
console.log('PASS  text and legacy confirm postback hand off to LIFF');
console.log('PASS  renew:CODE is not propagated as renewal authority');
console.log('=== CHAT RENEWAL HANDOFF TESTS PASS (3/3) ===');
