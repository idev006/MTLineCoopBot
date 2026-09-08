#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={Core:{},Security:{},Ports:{},Engine:{},Application:{},Adapters:{},Date,String,Object,Array,Set,JSON,Number};
vm.createContext(sandbox);
for(const rel of [
  'app/Core/MemberRules.js',
  'app/Security/Principal.js',
  'app/Ports/ClockPort.js',
  'app/Ports/AuditPort.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Engine/AuthorizationEngine.js',
  'app/Adapters/Test/InMemoryMemberRepository.js',
  'app/Adapters/Test/InMemoryAuditAdapter.js',
  'app/Application/Member/RenewMemberUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const seed={members:[{
  mem_code:'M001',mem_role:'member',mem_status:'inactive',
  mem_eff_dt:'2025-01-01',mem_exp_dt:'2026-01-01',line_user_id:'U1'
}]};
const repo=sandbox.Adapters.Test.InMemoryMemberRepository.create(seed);
const audit=sandbox.Adapters.Test.InMemoryAuditAdapter.create();
const clock={now:()=>new Date(2026,8,8,9,0,0)};
const authz=sandbox.Engine.AuthorizationEngine.create();
const uc=sandbox.Application.Member.RenewMemberUseCase.create({
  memberRepository:repo,clock,authorization:authz,audit
});
const Principal=sandbox.Security.Principal;
const p=Principal.create({
  subject:'line:U1',channel:'line',roles:['member'],memberCode:'M001',
  claims:{lineUserId:'U1'},authenticated:true
});

const ok=uc.execute({principal:p});
if(!ok.ok) throw new Error('self renewal should succeed');
if(ok.data.mem_exp_dt!=='2027-09-08') throw new Error('expired member should renew from current date');
if(ok.data.mem_status!=='active') throw new Error('renewal should persist active status');
if(audit.snapshot().length!==1 || audit.snapshot()[0].type!=='member.renewal') {
  throw new Error('renewal AuditPort event missing');
}

const futureRepo=sandbox.Adapters.Test.InMemoryMemberRepository.create({members:[{
  mem_code:'M002',mem_role:'member',mem_status:'active',
  mem_eff_dt:'2026-01-01',mem_exp_dt:'2027-01-15',line_user_id:'U2'
}]});
const futureAudit=sandbox.Adapters.Test.InMemoryAuditAdapter.create();
const futureUc=sandbox.Application.Member.RenewMemberUseCase.create({
  memberRepository:futureRepo,clock,authorization:authz,audit:futureAudit
});
const p2=Principal.create({
  subject:'line:U2',channel:'line',roles:['member'],memberCode:'M002',
  claims:{lineUserId:'U2'},authenticated:true
});
const future=futureUc.execute({principal:p2});
if(!future.ok || future.data.mem_exp_dt!=='2028-01-15') throw new Error('active member should renew from current expiry');

if(uc.execute({principal:Principal.anonymous('line')}).error.code!=='UNAUTHENTICATED') throw new Error('anonymous must fail');
const unlinked=Principal.create({subject:'line:U3',channel:'line',roles:['member'],authenticated:true});
if(uc.execute({principal:unlinked}).error.code!=='MEMBER_NOT_LINKED') throw new Error('unlinked principal must fail');

const managerRepo=sandbox.Adapters.Test.InMemoryMemberRepository.create({members:[{
  mem_code:'M003',mem_role:'manager',mem_status:'active',
  mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-12-31',line_user_id:'UM'
}]});
const managerAudit=sandbox.Adapters.Test.InMemoryAuditAdapter.create();
const managerUc=sandbox.Application.Member.RenewMemberUseCase.create({
  memberRepository:managerRepo,clock,authorization:authz,audit:managerAudit
});
const managerPrincipal=Principal.create({
  subject:'line:UM',channel:'line',roles:['manager'],memberCode:'M003',
  claims:{lineUserId:'UM'},authenticated:true
});
const managerResult=managerUc.execute({principal:managerPrincipal});
if(!managerResult.ok) throw new Error('manager self-renewal should succeed');

console.log('PASS  expired self-renewal uses server clock');
console.log('PASS  active self-renewal preserves remaining entitlement');
console.log('PASS  anonymous/unlinked principals fail closed');
console.log('PASS  manager self-renewal uses the same verified Principal contract');
console.log('=== RENEW MEMBER USE CASE TESTS PASS (3/3) ===');
