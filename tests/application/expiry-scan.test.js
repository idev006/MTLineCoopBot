#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={Core:{},Ports:{},Application:{},Adapters:{},Date,Object,Array,JSON,String,Number};
vm.createContext(sandbox);
for(const rel of [
  'app/Core/MemberRules.js',
  'app/Ports/ClockPort.js',
  'app/Ports/ConfigPort.js',
  'app/Ports/AuditPort.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Adapters/Test/InMemoryMemberRepository.js',
  'app/Adapters/Test/InMemoryAuditAdapter.js',
  'app/Application/Scheduled/ExpiryScanUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const repo=sandbox.Adapters.Test.InMemoryMemberRepository.create({
  members:[
    {mem_code:'M1',mem_status:'active',line_user_id:'U1',mem_role:'member',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-09-10'},
    {mem_code:'M2',mem_status:'active',line_user_id:'U2',mem_role:'member',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-09-01'},
    {mem_code:'M3',mem_status:'active',line_user_id:'U3',mem_role:'member',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-12-31'},
    {mem_code:'M4',mem_status:'inactive',line_user_id:'U4',mem_role:'member',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-09-01'},
    {mem_code:'M5',mem_status:'active',line_user_id:'',mem_role:'member',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-09-01'}
  ]
});
const audit=sandbox.Adapters.Test.InMemoryAuditAdapter.create();
const clock={now:()=>new Date(2026,8,8,9,0,0)};
const config={get:()=>({EXPIRY_WARNING_DAYS:30})};
const uc=sandbox.Application.Scheduled.ExpiryScanUseCase.create({
  memberRepository:repo,clock,config,audit
});

const result=uc.execute();
if(!result.ok) throw new Error('expiry scan should succeed');
const s=result.data.summary;
if(s.checked!==5 || s.logged!==3 || s.expiring!==1 || s.expired!==1 || s.actionable!==2){
  throw new Error('expiry summary mismatch: '+JSON.stringify(s));
}
const actions=result.data.actions;
if(actions.length!==2) throw new Error('expected 2 semantic actions');
if(actions[0].type!=='member.expiring' || actions[0].member.mem_code!=='M1') {
  throw new Error('expiring action mismatch');
}
if(actions[1].type!=='member.expired' || actions[1].member.mem_code!=='M2') {
  throw new Error('expired action mismatch');
}
if(audit.snapshot().length!==3) throw new Error('audit must record each eligible member');
if(audit.snapshot().some(e=>e.type!=='member.expiry_checked')) throw new Error('unexpected audit event type');

console.log('PASS  deterministic expiry scan summary');
console.log('PASS  semantic expiring/expired actions');
console.log('PASS  eligible-member audit events');
console.log('=== EXPIRY SCAN USE CASE TESTS PASS (3/3) ===');
