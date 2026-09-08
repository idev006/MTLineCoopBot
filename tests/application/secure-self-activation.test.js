#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Security:{},Engine:{},Application:{},Adapters:{},Date,Object,Array,Set,Map,JSON,String,Number};
vm.createContext(sandbox);
for(const rel of [
  'app/Security/Principal.js',
  'app/Ports/ClockPort.js',
  'app/Ports/AuditPort.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Engine/MemberActivationEngine.js',
  'app/Adapters/Test/InMemoryMemberRepository.js',
  'app/Application/Member/SelfActivateMemberUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

let now=new Date('2026-09-08T03:00:00Z');
const clock={now:()=>new Date(now)};
const events=[];
const audit={record:e=>{events.push(JSON.parse(JSON.stringify(e)));return {ok:true}}};

function principal(lineUserId){
  return sandbox.Security.Principal.create({
    subject:'line:'+lineUserId,
    channel:'line',
    roles:[],
    memberCode:null,
    claims:{provider:'line',lineUserId},
    authenticated:true
  });
}

function make(seed){
  const repo=sandbox.Adapters.Test.InMemoryMemberRepository.create(seed);
  const uc=sandbox.Application.Member.SelfActivateMemberUseCase.create({
    memberRepository:repo,clock,audit
  });
  return {repo,uc};
}

events.length=0;
{
  const {repo,uc}=make({members:[
    {mem_code:'M1',activate_code:'A1',line_user_id:'',mem_eff_dt:'',mem_exp_dt:'',mem_status:'inactive'}
  ]});
  const r=uc.execute({principal:principal('U1'),activateCode:'A1'});
  if(!r.ok||!r.data.changed||r.data.already_bound) throw new Error('fresh secure activation failed');
  const m=repo.findByMemberCode('M1');
  if(m.line_user_id!=='U1'||m.mem_status!=='active') throw new Error('verified subject not persisted');
  if(events.length!==1||events[0].status!=='secure_success'||events[0].activateCode!=='') throw new Error('secure success audit contract failed');
}

events.length=0;
{
  const {repo,uc}=make({members:[
    {mem_code:'M1',activate_code:'A1',line_user_id:'U1',mem_eff_dt:'2026-09-01 00:00:00',mem_exp_dt:'2027-09-01 00:00:00',mem_status:'active'}
  ]});
  const before=JSON.stringify(repo.snapshot().members);
  const r=uc.execute({principal:principal('U1'),activateCode:'A1'});
  if(!r.ok||r.data.changed||!r.data.already_bound) throw new Error('same-subject retry not idempotent');
  if(JSON.stringify(repo.snapshot().members)!==before) throw new Error('idempotent retry mutated target');
  if(events[0].status!=='secure_idempotent') throw new Error('idempotent audit missing');
}

events.length=0;
{
  const {repo,uc}=make({members:[
    {mem_code:'M1',activate_code:'A1',line_user_id:'U2',mem_eff_dt:'2026-09-01',mem_exp_dt:'2027-09-01',mem_status:'active'}
  ]});
  const before=JSON.stringify(repo.snapshot().members);
  const r=uc.execute({principal:principal('U1'),activateCode:'A1'});
  if(r.ok||r.error.code!=='BINDING_CONFLICT') throw new Error('binding takeover not blocked');
  if(JSON.stringify(repo.snapshot().members)!==before) throw new Error('binding conflict mutated target');
}

events.length=0;
{
  const {repo,uc}=make({members:[
    {mem_code:'M1',activate_code:'A1',line_user_id:'',mem_eff_dt:'',mem_exp_dt:'',mem_status:'inactive'},
    {mem_code:'M2',activate_code:'A2',line_user_id:'U1',mem_eff_dt:'2026-08-01',mem_exp_dt:'2027-08-01',mem_status:'active'}
  ]});
  const r=uc.execute({principal:principal('U1'),activateCode:'A1'});
  if(r.ok||r.error.code!=='SUBJECT_ALREADY_BOUND') throw new Error('subject double-binding not blocked');
}

events.length=0;
{
  const {uc}=make({members:[]});
  const r=uc.execute({principal:principal('U1'),activateCode:'NOPE'});
  if(r.ok||r.error.code!=='MEMBER_NOT_FOUND') throw new Error('invalid code must fail');
  if(events[0].status!=='secure_code_not_found'||events[0].activateCode!=='') throw new Error('invalid code audit leaked code');
}

{
  const {uc}=make({members:[
    {mem_code:'M1',activate_code:'A1',line_user_id:'',mem_eff_dt:'',mem_exp_dt:'',mem_status:'inactive'}
  ]});
  const anonymous=sandbox.Security.Principal.anonymous('line');
  const r=uc.execute({principal:anonymous,activateCode:'A1'});
  if(r.ok||r.error.code!=='UNAUTHENTICATED') throw new Error('unverified principal must fail');
}

{
  const {repo,uc}=make({members:[
    {mem_code:'M1',activate_code:'A1',line_user_id:'',mem_eff_dt:'2026-09-01',mem_exp_dt:'2027-09-01',mem_status:'active'}
  ]});
  const before=JSON.stringify(repo.snapshot().members);
  const r=uc.execute({principal:principal('U1'),activateCode:'A1'});
  if(r.ok||r.error.code!=='ALREADY_ACTIVATED') throw new Error('reused activated-unbound code must fail');
  if(JSON.stringify(repo.snapshot().members)!==before) throw new Error('reused code mutated member');
}

console.log('PASS  verified unbound subject activates unbound target');
console.log('PASS  same-subject retry is idempotent and non-mutating');
console.log('PASS  target binding takeover is blocked');
console.log('PASS  verified subject cannot bind two members');
console.log('PASS  invalid/reused code fails closed');
console.log('PASS  secure audit never stores raw activation code');
console.log('=== SECURE SELF-ACTIVATION TESTS PASS (6/6) ===');
