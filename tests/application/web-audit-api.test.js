#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

let principal={subject:'web:admin',channel:'web',roles:['admin'],authenticated:true};
const fakeSystem={
  webIdentity:{authenticate:({sessionToken})=>sessionToken==='good'?principal:{subject:'anonymous',channel:'web',roles:[],authenticated:false}},
  getAuditLog:{execute:({principal:p,type})=>{
    if(!p.authenticated) return {ok:false,error:{code:'UNAUTHENTICATED'}};
    if(!(p.roles||[]).includes('admin')) return {ok:false,error:{code:'FORBIDDEN'}};
    if(!['all','activation','expiry','reminder'].includes(String(type||'all'))) return {ok:false,error:{code:'VALIDATION'}};
    return {ok:true,data:{logs:[
      {type:'activation',id:'A1',memCode:'M1',status:'success',timestamp:'2026-09-08 10:00:00'}
    ]}};
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
for(const rel of [
  'app/Api/ApiResponse.js',
  'app/Api/ApiError.js',
  'app/Api/ApiHandlers.js',
  'app/Api/ApiRegistry.js',
  'app/Api/ApiService.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const svc=sandbox.Api.ApiService;

let res=svc.handleRequest('POST','/api/web/admin/audit-log',{body:{sessionToken:'good',type:'all',limit:50}});
if(!res.ok||res.data.logs.length!==1) throw new Error('admin audit endpoint failed');
const json=JSON.stringify(res.data);
for(const forbidden of ['line_user_id','activate_code','SECRET','U123']){
  if(json.includes(forbidden)) throw new Error('sensitive audit field leaked: '+forbidden);
}

principal={subject:'web:staff',channel:'web',roles:['staff'],authenticated:true};
res=svc.handleRequest('POST','/api/web/admin/audit-log',{body:{sessionToken:'good'}});
if(res.ok||res.error.code!=='FORBIDDEN') throw new Error('staff must be denied');

res=svc.handleRequest('POST','/api/web/admin/audit-log',{body:{sessionToken:'bad'}});
if(res.ok||res.error.code!=='UNAUTHENTICATED') throw new Error('invalid session must fail closed');

principal={subject:'web:admin',channel:'web',roles:['admin'],authenticated:true};
res=svc.handleRequest('POST','/api/web/admin/audit-log',{body:{sessionToken:'good',type:'bad'}});
if(res.ok||res.error.code!=='VALIDATION') throw new Error('invalid type must fail');

res=svc.handleRequest('GET','/api/web/admin/audit-log',{body:{sessionToken:'good'}});
if(res.ok||res.error.code!=='METHOD_NOT_ALLOWED') throw new Error('audit route must be POST-only');

const route=sandbox.Api.ApiRegistry.listRoutes().find(r=>r.path==='/api/web/admin/audit-log');
if(!route||route.auth!=='web-session'||route.method!=='POST') throw new Error('route metadata mismatch');

const webSrc=fs.readFileSync(path.join(root,'app','WebApp.js'),'utf8');
if(!webSrc.includes("path === '/api/web/admin/audit-log'")) throw new Error('WebApp classification missing');

console.log('PASS  admin audit log requires server Web session');
console.log('PASS  admin-only RBAC enforced');
console.log('PASS  audit delivery preserves data minimization');
console.log('PASS  audit route is POST-only and validates type');
console.log('=== WEB AUDIT API TESTS PASS (4/4) ===');
