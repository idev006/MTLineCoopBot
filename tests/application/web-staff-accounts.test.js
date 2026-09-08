#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Security:{},Engine:{},Application:{},Adapters:{},Date,Object,Array,Set,JSON,String,Number};
vm.createContext(sandbox);
for(const rel of [
  'app/Security/Principal.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Engine/AuthorizationEngine.js',
  'app/Adapters/Test/InMemoryMemberRepository.js',
  'app/Application/Web/ListStaffAccountsUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}
const repo=sandbox.Adapters.Test.InMemoryMemberRepository.create({members:[
  {mem_code:'M001',mem_title:'นาย',mem_fname:'A',mem_lname:'One',mem_role:'member',mem_status:'active',line_user_id:'U1'},
  {mem_code:'S001',mem_title:'นาง',mem_fname:'Staff',mem_lname:'One',mem_role:'staff',mem_status:'active',line_user_id:'US'},
  {mem_code:'G001',mem_title:'นาย',mem_fname:'Manager',mem_lname:'One',mem_role:'manager',mem_status:'active',line_user_id:'UG'},
  {mem_code:'A001',mem_title:'นาย',mem_fname:'Admin',mem_lname:'One',mem_role:'admin',mem_status:'active',line_user_id:'UA'}
]});
const auth=sandbox.Engine.AuthorizationEngine.create();
const uc=sandbox.Application.Web.ListStaffAccountsUseCase.create({memberRepository:repo,authorization:auth});
const P=sandbox.Security.Principal;
const admin=P.create({subject:'web:admin',channel:'web',roles:['admin'],authenticated:true});
const r=uc.execute({principal:admin});
if(!r.ok||r.data.accounts.length!==3) throw new Error('admin staff list failed');
if(r.data.accounts.some(x=>x.role==='member')) throw new Error('ordinary member leaked into staff list');
const json=JSON.stringify(r.data);
if(json.includes('line_user_id')||json.includes('_rowIndex')||json.includes('activate_code')) throw new Error('sensitive fields leaked');
if(JSON.stringify(r.data.roles)!==JSON.stringify(['staff','manager','admin'])) throw new Error('staff role vocabulary mismatch');
const staff=P.create({subject:'web:staff',channel:'web',roles:['staff'],authenticated:true});
const denied=uc.execute({principal:staff});
if(denied.ok||denied.error.code!=='FORBIDDEN') throw new Error('non-admin must be denied');
console.log('PASS  admin-only staff account list');
console.log('PASS  ordinary members excluded and fields sanitized');
console.log('PASS  staff role vocabulary is canonical');
console.log('=== STAFF ACCOUNTS READ TESTS PASS (3/3) ===');
