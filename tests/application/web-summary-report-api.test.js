#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

let principal={subject:'web:staff',channel:'web',roles:['staff'],authenticated:true};
const fakeSystem={
  webIdentity:{authenticate:({sessionToken})=>sessionToken==='good'?principal:{subject:'anonymous',channel:'web',roles:[],authenticated:false}},
  getSummaryReport:{execute:({principal:p})=>{
    if(!p.authenticated) return {ok:false,error:{code:'UNAUTHENTICATED'}};
    if(!(p.roles||[]).some(r=>['staff','manager','admin'].includes(r))) return {ok:false,error:{code:'FORBIDDEN'}};
    return {ok:true,data:{
      summary:{totalMembers:4,activeMembers:2,inactiveMembers:1,expiredMembers:1,expiringMembers:1},
      financial:{totalSavings:350,totalLoans:100,totalDividends:30},
      generatedAt:'2026-09-08T00:00:00.000Z'
    }};
  }}
};
const sandbox={
  Api:{},
  Composition:{SystemFactory:{createSystem:()=>fakeSystem}},
  Security:{Principal:{isAuthenticated:p=>!!(p&&p.authenticated)}},
  DataDict:{formatDateTime:()=>''},
  Logger:{log:()=>{}},
  Date,Object,String,JSON,Error
};
vm.createContext(sandbox);
for(const rel of ['app/Api/ApiResponse.js','app/Api/ApiError.js','app/Api/ApiHandlers.js','app/Api/ApiRegistry.js','app/Api/ApiService.js']){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}
const svc=sandbox.Api.ApiService;
for(const role of ['staff','manager','admin']){
  principal={subject:'web:'+role,channel:'web',roles:[role],authenticated:true};
  const r=svc.handleRequest('POST','/api/web/reports/summary',{body:{sessionToken:'good'}});
  if(!r.ok||r.data.financial.totalSavings!==350) throw new Error(role+' report access failed');
}
principal={subject:'web:member',channel:'web',roles:['member'],authenticated:true};
let r=svc.handleRequest('POST','/api/web/reports/summary',{body:{sessionToken:'good'}});
if(r.ok||r.error.code!=='FORBIDDEN') throw new Error('member must be denied');
r=svc.handleRequest('POST','/api/web/reports/summary',{body:{sessionToken:'bad'}});
if(r.ok||r.error.code!=='UNAUTHENTICATED') throw new Error('invalid session must fail closed');
r=svc.handleRequest('GET','/api/web/reports/summary',{body:{sessionToken:'good'}});
if(r.ok||r.error.code!=='METHOD_NOT_ALLOWED') throw new Error('report route must be POST-only');
const route=sandbox.Api.ApiRegistry.listRoutes().find(x=>x.path==='/api/web/reports/summary');
if(!route||route.auth!=='web-session'||route.method!=='POST') throw new Error('route metadata mismatch');
console.log('PASS  staff/manager/admin report delivery RBAC');
console.log('PASS  invalid/forbidden sessions fail closed');
console.log('PASS  report route is POST-only web-session authenticated');
console.log('=== WEB SUMMARY REPORT API TESTS PASS (3/3) ===');
