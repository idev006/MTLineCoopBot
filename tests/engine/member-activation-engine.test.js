#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const src=fs.readFileSync(path.join(__dirname,'..','..','app','Engine','MemberActivationEngine.js'),'utf8');
const sandbox={Engine:{},Date,String,Object};
vm.createContext(sandbox);
vm.runInContext(src,sandbox,{filename:'MemberActivationEngine.js'});
const e=sandbox.Engine.MemberActivationEngine;

const now=new Date(2026,8,8,12,34,56);
const r=e.plan({mem_code:'M1',mem_eff_dt:''},'U1',now);
if(!r.ok) throw new Error('valid activation plan should succeed');
if(r.activation.memEffDt!=='2026-09-08 12:34:56') throw new Error('effective datetime mismatch');
if(r.activation.memExpDt!=='2027-09-08 12:34:56') throw new Error('365-day expiry mismatch');
if(r.activation.memStatus!=='active' || r.activation.lineUserId!=='U1') throw new Error('activation values mismatch');

if(e.plan({mem_eff_dt:'2026-01-01 00:00:00'},'U1',now).error.code!=='ALREADY_ACTIVATED') {
  throw new Error('already activated must fail');
}
if(e.plan(null,'U1',now).error.code!=='MEMBER_NOT_FOUND') throw new Error('missing member must fail');
if(e.plan({mem_eff_dt:''},'',now).error.code!=='VALIDATION') throw new Error('missing line user must fail');

console.log('PASS  deterministic activation dates/status');
console.log('PASS  already-activated/missing-member/validation negatives');
console.log('=== MEMBER ACTIVATION ENGINE TESTS PASS (2/2) ===');
