#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','..');

const eventSrc=fs.readFileSync(path.join(root,'app','LineBot','EventHandler.js'),'utf8');
const replySrc=fs.readFileSync(path.join(root,'app','LineBot','ReplyStore.js'),'utf8');
const configSrc=fs.readFileSync(path.join(root,'app','Config.js'),'utf8');

const start=eventSrc.indexOf("if (text.startsWith('activate:') || text === 'activate' || text === 'เปิดใช้งาน')");
const end=eventSrc.indexOf("if (text.startsWith('renew')", start);
if(start<0||end<0) throw new Error('secure chat activation handoff block missing');
const block=eventSrc.slice(start,end);

if(/ActivationService\.handleActivate/.test(block)) {
  throw new Error('chat activation must not call legacy direct-binding ActivationService');
}
if(/performActivate/.test(block) || /\/api\/member\/activate/.test(block)) {
  throw new Error('chat activation must not call legacy activation API');
}
if(/Activate code:\s*['"]?\s*\+/.test(block) || /Logger\.log\([^\n]*activateCode/.test(block)) {
  throw new Error('chat activation must not log raw activation code');
}
if(!/LIFF_ACTIVATION_URL/.test(block)) {
  throw new Error('chat activation must hand off to configured LIFF activation URL');
}
if(/activationUrl\s*\+\s*['"][^'"]*[?&](?:code|activateCode)=/i.test(block)) {
  throw new Error('activation code must not be embedded in handoff URL');
}

if(!/LIFF_ACTIVATION_URL/.test(configSrc) || !/https:\/\/liff\.line\.me\//.test(configSrc)) {
  throw new Error('canonical LIFF activation handoff URL config missing');
}

if(/พิมพ์ข้อความในแชท:\\nactivate:รหัสเปิดใช้งาน/.test(replySrc)) {
  throw new Error('Welcome guidance still instructs direct chat activation');
}
if(!/ยืนยันตัวตนผ่าน LINE Login/.test(replySrc)) {
  throw new Error('Welcome guidance must explain verified LINE Login activation');
}

console.log('PASS  chat activation cannot call legacy direct-binding service/API');
console.log('PASS  activation codes are not logged or embedded in handoff URL');
console.log('PASS  chat hands off to configured LIFF secure activation surface');
console.log('PASS  Welcome guidance teaches verified LINE Login flow');
console.log('=== CHAT ACTIVATION HANDOFF TESTS PASS (4/4) ===');
