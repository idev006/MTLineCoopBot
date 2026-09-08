#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..', '..');

const files = [
  'app/Core/MemberRules.js',
  'app/Security/Principal.js',
  'app/Ports/ClockPort.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Engine/MemberAccessEngine.js',
  'app/Engine/AuthorizationEngine.js',
  'app/Application/Member/GetCurrentMemberProfileUseCase.js'
];

const sandbox = { Core:{}, Security:{}, Ports:{}, Engine:{}, Application:{}, Date, Object, Set, Array };
vm.createContext(sandbox);
for(const rel of files){
  vm.runInContext(fs.readFileSync(path.join(root, rel),'utf8'), sandbox, {filename:rel});
}

const member = {
  mem_code:'M001', mem_title:'นาย', mem_fname:'ทดสอบ', mem_lname:'ระบบ',
  mem_role:'member', mem_status:'active',
  mem_eff_dt:'2026-01-01', mem_exp_dt:'2026-12-31'
};

const portMethods=sandbox.Ports.MemberRepositoryPort.listMethods();
const repo={};
for(const m of portMethods) repo[m]=()=>null;
repo.findByMemberCode=(code)=>code==='M001'?member:null;

const clock={now:()=>new Date(2026,8,8,12,0,0)};
const memberAccess=sandbox.Engine.MemberAccessEngine.create({clock});
const authorization=sandbox.Engine.AuthorizationEngine.create();
const usecase=sandbox.Application.Member.GetCurrentMemberProfileUseCase.create({
  memberRepository:repo, memberAccess, authorization
});

const Principal=sandbox.Security.Principal;
const good=Principal.create({subject:'line:U1',channel:'line',roles:['member'],memberCode:'M001',authenticated:true});
const ok=usecase.execute({principal:good});
if(!ok.ok || ok.data.mem_code!=='M001') throw new Error('valid principal should get own profile');

const anon=Principal.anonymous('line');
if(usecase.execute({principal:anon}).error.code!=='UNAUTHENTICATED') throw new Error('anonymous must be denied');

const unlinked=Principal.create({subject:'line:U2',channel:'line',roles:['member'],authenticated:true});
if(usecase.execute({principal:unlinked}).error.code!=='MEMBER_NOT_LINKED') throw new Error('unlinked principal must be denied');

const missing=Principal.create({subject:'line:U3',channel:'line',roles:['member'],memberCode:'M404',authenticated:true});
if(usecase.execute({principal:missing}).error.code!=='MEMBER_NOT_FOUND') throw new Error('missing member must be explicit');

const inactiveRepo={...repo,findByMemberCode:()=>({...member,mem_status:'inactive'})};
const inactiveUsecase=sandbox.Application.Member.GetCurrentMemberProfileUseCase.create({
  memberRepository:inactiveRepo, memberAccess, authorization
});
if(inactiveUsecase.execute({principal:good}).error.code!=='MEMBER_INACTIVE_OR_ROLE_INVALID') throw new Error('inactive member must be denied');

console.log('PASS  current member profile use case headless success');
console.log('PASS  unauthenticated principal denied');
console.log('PASS  unlinked principal denied');
console.log('PASS  missing/inactive member explicit errors');
console.log('=== APPLICATION MEMBER PROFILE TESTS PASS (4/4) ===');
