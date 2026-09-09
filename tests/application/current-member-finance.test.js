#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');
const files=[
  'app/Core/MemberRules.js',
  'app/Security/Principal.js',
  'app/Ports/ClockPort.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Engine/MemberAccessEngine.js',
  'app/Engine/AuthorizationEngine.js',
  'app/Application/Member/GetCurrentMemberFinanceUseCase.js'
];
const sandbox={Core:{},Security:{},Ports:{},Engine:{},Application:{},Date,Object,Set,Array};
vm.createContext(sandbox);
for(const rel of files) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});

const methods=sandbox.Ports.MemberRepositoryPort.listMethods();
const repo={};
for(const m of methods) repo[m]=()=>null;
const member={mem_code:'M001',mem_role:'member',mem_status:'active',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-12-31'};
repo.findByMemberCode=code=>code==='M001'?member:null;
repo.findSavingsByMember=()=>[{acct_no:'S1',balance:100}];
repo.findLoansByMember=()=>[{loan_no:'L1',outstanding:50}];
repo.findDividendsByMember=()=>[{year:2026,dividend:10}];

const clock={now:()=>new Date(2026,8,8,12,0,0)};
const memberAccess=sandbox.Engine.MemberAccessEngine.create({clock});
const authorization=sandbox.Engine.AuthorizationEngine.create();
const uc=sandbox.Application.Member.GetCurrentMemberFinanceUseCase.create({memberRepository:repo,memberAccess,authorization});
const Principal=sandbox.Security.Principal;
const p=Principal.create({subject:'line:U1',channel:'line',roles:['member'],memberCode:'M001',authenticated:true});

for(const [kind,key] of [['savings','acct_no'],['loans','loan_no'],['dividends','year']]){
  const r=uc.execute({principal:p,kind});
  if(!r.ok || r.data.kind!==kind || r.data.rows.length!==1 || !(key in r.data.rows[0])) {
    throw new Error('finance kind failed: '+kind);
  }
}
if(uc.execute({principal:Principal.anonymous('line'),kind:'savings'}).error.code!=='UNAUTHENTICATED') {
  throw new Error('anonymous finance access must fail');
}
if(uc.execute({principal:p,kind:'unknown'}).error.code!=='FINANCE_KIND_INVALID') {
  throw new Error('unknown finance kind must fail');
}

const deniedBinding={
  requireAuthenticated:authorization.requireAuthenticated,
  requireMemberBinding:()=>({allowed:false,reason:'member_mismatch'})
};
const bindingUc=sandbox.Application.Member.GetCurrentMemberFinanceUseCase.create({
  memberRepository:repo,memberAccess,authorization:deniedBinding
});
if(bindingUc.execute({principal:p,kind:'savings'}).error.code!=='FORBIDDEN') {
  throw new Error('member binding denial must fail closed');
}

console.log('PASS  current member savings/loans/dividends use case');
console.log('PASS  unauthenticated finance access denied');
console.log('PASS  invalid finance kind denied');
console.log('PASS  member binding denial fails closed');
console.log('=== CURRENT MEMBER FINANCE TESTS PASS (4/4) ===');
