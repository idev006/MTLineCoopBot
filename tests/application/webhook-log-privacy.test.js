#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','..');
const src=fs.readFileSync(path.join(root,'app','WebApp.js'),'utf8');

const forbidden=[
  /Logger\.log\s*\([^\n]*raw body/i,
  /Logger\.log\s*\([^\n]*postData\.contents/i,
  /console\.(log|info|warn|error)\s*\([^\n]*postData\.contents/i
];
for(const pattern of forbidden){
  if(pattern.test(src)) throw new Error('raw webhook body logging is forbidden: '+pattern);
}

if(!/verifyWebhookSecret\s*\(e,\s*cfg\.WEBHOOK_SECRET\)/.test(src)){
  throw new Error('downstream webhook secret gate must remain until gateway cutover');
}

const secretCheck=src.indexOf('verifyWebhookSecret');
const parse=src.indexOf('JSON.parse(e.postData.contents)');
if(secretCheck<0||parse<0||secretCheck>parse){
  throw new Error('downstream secret gate must execute before webhook JSON parse');
}

console.log('PASS  raw webhook body logging is absent');
console.log('PASS  downstream gateway secret gate remains before JSON parse');
console.log('=== WEBHOOK PRIVACY TESTS PASS (2/2) ===');
