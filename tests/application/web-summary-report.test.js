#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Security:{},Engine:{},Application:{},Date,Object,Array,Set,JSON,String,Number,Math};
vm.createContext(sandbox);
for(const rel of [
  'app/Core/MemberRules.js',
  'app/Security/Principal.js',
  'app/Ports/ClockPort.js',
  'app/Ports/ConfigPort.js',
  'app/Ports/ReportQueryPort.js',
  'app/Engine/MemberAccessEngine.js',
  'app/Engine/AuthorizationEngine.js',
  'app/Application/Web/GetSummaryReportUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const clock={now:()=>new Date('2026-09-08T00:00:00Z')};
const config={get:()=>({EXPIRY_WARNING_DAYS:30})};
const access=sandbox.Engine.MemberAccessEngine.create({clock});
const auth=sandbox.Engine.AuthorizationEngine.create();
const reportQuery={snapshot:()=>({
  members:[
    {mem_code:'M1',mem_status:'active',mem_role:'member',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-12-31'},
    {mem_code:'M2',mem_status:'active',mem_role:'member',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-09-20'},
    {mem_code:'M3',mem_status:'active',mem_role:'member',mem_eff_dt:'2025-01-01',mem_exp_dt:'2026-08-31'},
    {mem_code:'M4',mem_status:'inactive',mem_role:'member',mem_eff_dt:'',mem_exp_dt:''}
  ],
  savings:[{balance:100},{balance:250}],
  loans:[{outstanding:75},{outstanding:25}],
  dividends:[{dividend_amt:10},{dividend_amt:20}]
})};
const uc=sandbox.Application.Web.GetSummaryReportUseCase.create({
  reportQuery,authorization:auth,memberAccess:access,config,clock
});
const p=role=>sandbox.Security.Principal.create({subject:'web:'+role,channel:'web',roles:[role],authenticated:true});
for(const role of ['staff','manager','admin']){
  const r=uc.execute({principal:p(role)});
  if(!r.ok) throw new Error(role+' should be allowed');
  if(r.data.summary.totalMembers!==4||r.data.summary.activeMembers!==2||r.data.summary.expiringMembers!==1||r.data.summary.expiredMembers!==1||r.data.summary.inactiveMembers!==1) throw new Error('member summary mismatch');
  if(r.data.financial.totalSavings!==350||r.data.financial.totalLoans!==100||r.data.financial.totalDividends!==30) throw new Error('financial totals mismatch');
}
const denied=uc.execute({principal:p('member')});
if(denied.ok||denied.error.code!=='FORBIDDEN') throw new Error('member role must be denied');
console.log('PASS  staff/manager/admin report RBAC');
console.log('PASS  member lifecycle summary uses server member-access policy');
console.log('PASS  financial totals aggregate canonical source tables');
console.log('=== WEB SUMMARY REPORT TESTS PASS (3/3) ===');
