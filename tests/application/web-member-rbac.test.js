#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Security:{},Engine:{},Adapters:{},Application:{},Date,Object,Array,Set,Map,JSON,String,Number,Math};
vm.createContext(sandbox);
for(const rel of [
  'app/Security/Principal.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Engine/AuthorizationEngine.js',
  'app/Adapters/Test/InMemoryMemberRepository.js',
  'app/Application/Web/ListMembersUseCase.js',
  'app/Application/Web/GetMemberDetailUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const repoAdapter=sandbox.Adapters.Test.InMemoryMemberRepository.create({
  members:[
    {mem_code:'M001',mem_title:'นาย',mem_fname:'สมชาย',mem_lname:'ใจดี',mem_status:'active',mem_role:'member',line_user_id:'U1',activate_code:'SECRET1',mem_kk:10,mem_bk:20,mem_bh:30},
    {mem_code:'M002',mem_title:'นาง',mem_fname:'สมหญิง',mem_lname:'รักดี',mem_status:'inactive',mem_role:'member',line_user_id:'',activate_code:'SECRET2'},
    {mem_code:'M003',mem_title:'นาย',mem_fname:'ทดสอบ',mem_lname:'ระบบ',mem_status:'active',mem_role:'member',line_user_id:'U3',activate_code:'SECRET3'}
  ],
  savings:[{mem_code:'M001',acct_no:'S1',balance:100}],
  loans:[{mem_code:'M001',loan_no:'L1',outstanding:200}],
  dividends:[{mem_code:'M001',year:2569,dividend_amt:300}]
});
const auth=sandbox.Engine.AuthorizationEngine.create();
const list=sandbox.Application.Web.ListMembersUseCase.create({memberRepository:repoAdapter,authorization:auth});
const detail=sandbox.Application.Web.GetMemberDetailUseCase.create({memberRepository:repoAdapter,authorization:auth});

function principal(role){
  return sandbox.Security.Principal.create({
    subject:'web:line:'+role,channel:'web',roles:[role],authenticated:true
  });
}

for(const role of ['staff','admin','manager']){
  const r=list.execute({principal:principal(role),page:1,limit:2});
  if(!r.ok||r.data.members.length!==2||r.data.total!==3||r.data.totalPages!==2) throw new Error(role+' list access/pagination failed');
}
const memberDenied=list.execute({principal:principal('member')});
if(memberDenied.ok||memberDenied.error.code!=='FORBIDDEN') throw new Error('member role must be denied');
const anon=list.execute({principal:sandbox.Security.Principal.anonymous('web')});
if(anon.ok||anon.error.code!=='UNAUTHENTICATED') throw new Error('anonymous must be denied');

const filtered=list.execute({principal:principal('staff'),search:'สมหญิง',status:'inactive'});
if(!filtered.ok||filtered.data.total!==1||filtered.data.members[0].mem_code!=='M002') throw new Error('search/status filter failed');

const listJson=JSON.stringify(list.execute({principal:principal('staff')}).data);
if(listJson.includes('SECRET')||listJson.includes('"line_user_id"')) throw new Error('sensitive list fields leaked');
if(!listJson.includes('"line_linked"')) throw new Error('line_linked projection missing');

const d=detail.execute({principal:principal('manager'),memberCode:'M001'});
if(!d.ok||d.data.member.mem_code!=='M001'||d.data.savings.length!==1||d.data.loans.length!==1||d.data.dividends.length!==1){
  throw new Error('member detail data failed');
}
const detailJson=JSON.stringify(d.data);
if(detailJson.includes('SECRET1')||detailJson.includes('"activate_code"')||detailJson.includes('"line_user_id"')){
  throw new Error('sensitive detail fields leaked');
}
if(detailJson.includes('"_rowIndex"')) throw new Error('persistence metadata leaked');

const missing=detail.execute({principal:principal('staff'),memberCode:'NOPE'});
if(missing.ok||missing.error.code!=='MEMBER_NOT_FOUND') throw new Error('missing member contract failed');
const invalid=detail.execute({principal:principal('staff'),memberCode:''});
if(invalid.ok||invalid.error.code!=='VALIDATION') throw new Error('missing code validation failed');

console.log('PASS  staff/admin/manager RBAC for member reads');
console.log('PASS  member/anonymous access denied server-side');
console.log('PASS  pagination/search/status filters');
console.log('PASS  list/detail sanitize activation code, raw LINE ID and row metadata');
console.log('=== WEB MEMBER RBAC USE CASE TESTS PASS (4/4) ===');
