#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Engine:{},Application:{},Adapters:{},Date,String,Object,Array,JSON,Number};
vm.createContext(sandbox);
for(const rel of [
  'app/Ports/ClockPort.js',
  'app/Ports/AuditPort.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Engine/MemberActivationEngine.js',
  'app/Adapters/Test/InMemoryMemberRepository.js',
  'app/Adapters/Test/InMemoryAuditAdapter.js',
  'app/Application/Member/ActivateMemberUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const seed={members:[{
  mem_code:'M001',mem_title:'นาย',mem_fname:'สมชาย',mem_lname:'ทดสอบ',
  activate_code:'ABC123',mem_eff_dt:'',mem_exp_dt:'',mem_status:'inactive',line_user_id:''
}]};
const repo=sandbox.Adapters.Test.InMemoryMemberRepository.create(seed);
const audit=sandbox.Adapters.Test.InMemoryAuditAdapter.create();
const clock={now:()=>new Date(2026,8,8,9,0,0)};
const uc=sandbox.Application.Member.ActivateMemberUseCase.create({memberRepository:repo,clock,audit});

const ok=uc.execute({activateCode:'ABC123',lineUserId:'U123'});
if(!ok.ok || ok.data.mem_code!=='M001') throw new Error('activation use case should succeed');
if(ok.data.mem_eff_dt!=='2026-09-08 09:00:00') throw new Error('deterministic eff date mismatch');
if(ok.data.mem_exp_dt!=='2027-09-08 09:00:00') throw new Error('deterministic exp date mismatch');
if(repo.findByMemberCode('M001').line_user_id!=='U123') throw new Error('activation not persisted');
if(audit.snapshot().length!==1 || audit.snapshot()[0].type!=='member.activation') {
  throw new Error('activation AuditPort event missing');
}

const dup=uc.execute({activateCode:'ABC123',lineUserId:'U123'});
if(dup.ok || dup.error.code!=='ALREADY_ACTIVATED') throw new Error('duplicate activation must fail');

if(uc.execute({activateCode:'BAD',lineUserId:'U123'}).error.code!=='MEMBER_NOT_FOUND') throw new Error('bad code must fail');
if(uc.execute({activateCode:'',lineUserId:'U123'}).error.code!=='VALIDATION') throw new Error('validation must fail');

const methods=sandbox.Ports.MemberRepositoryPort.listMethods();
const failingRepo={};
for(const m of methods) failingRepo[m]=()=>null;
failingRepo.findByActivateCode=()=>({_rowIndex:2,mem_code:'M001',mem_eff_dt:''});
failingRepo.saveActivation=()=>{ throw new Error('storage failed'); };

const failingUc=sandbox.Application.Member.ActivateMemberUseCase.create({
  memberRepository:failingRepo,
  clock,
  audit
});
let storageFailed=false;
try {
  failingUc.execute({activateCode:'ABC123',lineUserId:'U123'});
} catch(e) {
  storageFailed=String(e.message).includes('storage failed');
}
if(!storageFailed) throw new Error('repository failure must propagate for delivery mapping');

console.log('PASS  ActivateMemberUseCase success + persistence + audit');
console.log('PASS  duplicate / invalid code / validation negatives');
console.log('PASS  repository failure propagates');
console.log('=== ACTIVATE MEMBER USE CASE TESTS PASS (3/3) ===');
