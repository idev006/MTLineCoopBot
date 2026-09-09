#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

let principal={subject:'web:admin',channel:'web',roles:['admin'],authenticated:true};
const fakeSystem={
  webIdentity:{authenticate:({sessionToken})=>sessionToken==='good'?principal:{subject:'anonymous',channel:'web',roles:[],authenticated:false}},
  listStaffAccounts:{execute:({principal:p})=>{
    if(!p.authenticated) return {ok:false,error:{code:'UNAUTHENTICATED'}};
    if(!(p.roles||[]).includes('admin')) return {ok:false,error:{code:'FORBIDDEN'}};
    return {ok:true,data:{
      accounts:[
        {memberCode:'S001',displayName:'Staff One',role:'staff',status:'active',lineLinked:true},
        {memberCode:'G001',displayName:'Manager One',role:'manager',status:'active',lineLinked:true}
      ],
      roles:['staff','manager','admin']
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
let res=svc.handleRequest('POST','/api/web/admin/staff',{body:{sessionToken:'good'}});
if(!res.ok||res.data.accounts.length!==2) throw new Error('admin staff endpoint failed');
if(JSON.stringify(res.data.roles)!==JSON.stringify(['staff','manager','admin'])) throw new Error('role vocabulary mismatch');
const json=JSON.stringify(res.data);
for(const forbidden of ['line_user_id','activate_code','_rowIndex']){
  if(json.includes(forbidden)) throw new Error('sensitive field leaked: '+forbidden);
}

principal={subject:'web:staff',channel:'web',roles:['staff'],authenticated:true};
res=svc.handleRequest('POST','/api/web/admin/staff',{body:{sessionToken:'good'}});
if(res.ok||res.error.code!=='FORBIDDEN') throw new Error('staff must be denied');

res=svc.handleRequest('POST','/api/web/admin/staff',{body:{sessionToken:'bad'}});
if(res.ok||res.error.code!=='UNAUTHENTICATED') throw new Error('invalid session must fail closed');

principal={subject:'web:admin',channel:'web',roles:['admin'],authenticated:true};
res=svc.handleRequest('GET','/api/web/admin/staff',{body:{sessionToken:'good'}});
if(res.ok||res.error.code!=='METHOD_NOT_ALLOWED') throw new Error('admin staff route must be POST-only');

const route=sandbox.Api.ApiRegistry.listRoutes().find(r=>r.path==='/api/web/admin/staff');
if(!route||route.auth!=='web-session'||route.method!=='POST') throw new Error('route metadata mismatch');


console.log('PASS  admin staff list requires server Web session');
console.log('PASS  admin-only RBAC enforced');
console.log('PASS  staff list uses canonical roles and sanitized projection');
console.log('PASS  route is POST-only web-session authenticated');
console.log('=== WEB STAFF ACCOUNTS API TESTS PASS (4/4) ===');
