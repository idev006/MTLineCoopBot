#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Security:{},Engine:{},Application:{},Core:{},Date,Object,Array,Set,JSON,String,Number};
vm.createContext(sandbox);
for(const rel of [
  'app/Core/MemberRules.js',
  'app/Security/Principal.js',
  'app/Ports/ClockPort.js',
  'app/Ports/AuditPort.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Engine/AuthorizationEngine.js',
  'app/Adapters/Test/InMemoryMemberRepository.js',
  'app/Application/Web/RenewMemberByStaffUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const repo=sandbox.Adapters.Test.InMemoryMemberRepository.create({
  members:[{
    mem_code:'M001',mem_status:'active',mem_role:'member',
    mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-12-31'
  }]
});
const clock={now:()=>new Date('2026-09-08T00:00:00Z')};
const events=[];
const audit={record:e=>{events.push({...e});return {ok:true}}};
const auth=sandbox.Engine.AuthorizationEngine.create();
const uc=sandbox.Application.Web.RenewMemberByStaffUseCase.create({
  memberRepository:repo,clock,audit,authorization:auth
});
function principal(role){
  return sandbox.Security.Principal.create({
    subject:'web:'+role,
    channel:'web',
    roles:[role],
    claims:{lineUserId:'ACTOR-'+role},
    authenticated:true
  });
}

for(const role of ['staff','manager','admin']){
  repo.reset();
  events.length=0;
  const r=uc.execute({principal:principal(role),memberCode:'M001'});
  if(!r.ok||r.data.mem_exp_dt!=='2027-12-31'||r.data.mem_status!=='active') throw new Error(role+' renewal failed');
  if(events.length!==1||events[0].memberCode!=='M001'||events[0].lineUserId!=='ACTOR-'+role||events[0].status!=='renewed_by_'+role){
    throw new Error(role+' audit evidence failed');
  }
  if(!(events[0].occurredAt instanceof Date) || events[0].occurredAt.getTime()!==clock.now().getTime()){
    throw new Error(role+' audit timestamp must come from ClockPort');
  }
}

const memberDenied=uc.execute({
  principal:sandbox.Security.Principal.create({subject:'web:member',channel:'web',roles:['member'],authenticated:true}),
  memberCode:'M001'
});
if(memberDenied.ok||memberDenied.error.code!=='FORBIDDEN') throw new Error('member role must be denied');

const missing=uc.execute({principal:principal('staff'),memberCode:'NOPE'});
if(missing.ok||missing.error.code!=='MEMBER_NOT_FOUND') throw new Error('missing target contract failed');

const invalid=uc.execute({principal:principal('staff'),memberCode:''});
if(invalid.ok||invalid.error.code!=='VALIDATION') throw new Error('missing memberCode validation failed');

console.log('PASS  staff/manager/admin may renew a target member');
console.log('PASS  server computes renewal and persists through repository port');
console.log('PASS  critical write records verified actor identity in audit event');
console.log('PASS  member role/missing target/invalid input fail closed');
console.log('=== WEB MEMBER RENEW WRITE TESTS PASS (4/4) ===');
