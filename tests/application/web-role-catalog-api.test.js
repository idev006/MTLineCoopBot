#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

let principal={subject:'web:admin',channel:'web',roles:['admin'],authenticated:true};
const fakeSystem={
  webIdentity:{authenticate:({sessionToken})=>sessionToken==='good'?principal:{subject:'anonymous',channel:'web',roles:[],authenticated:false}},
  getRoleCatalog:{execute:({principal:p})=>{
    if(!p.authenticated) return {ok:false,error:{code:'UNAUTHENTICATED'}};
    if(!(p.roles||[]).includes('admin')) return {ok:false,error:{code:'FORBIDDEN'}};
    return {ok:true,data:{
      roles:[
        {id:'member',label:'Member',assignableToStaff:false,capabilities:['member-self-service']},
        {id:'staff',label:'Staff',assignableToStaff:true,capabilities:['member-read','member-renew','reports-read']},
        {id:'manager',label:'Manager',assignableToStaff:true,capabilities:['member-read','member-renew','reports-read']},
        {id:'admin',label:'Admin',assignableToStaff:true,capabilities:['admin-settings-read']}
      ],
      canonicalRoleIds:['member','staff','manager','admin'],
      assignableStaffRoleIds:['staff','manager','admin']
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

let res=svc.handleRequest('POST','/api/web/admin/roles',{body:{sessionToken:'good'}});
if(!res.ok) throw new Error('admin role catalog endpoint failed');
if(JSON.stringify(res.data.canonicalRoleIds)!==JSON.stringify(['member','staff','manager','admin'])) {
  throw new Error('canonical role vocabulary mismatch');
}
if(JSON.stringify(res.data.assignableStaffRoleIds)!==JSON.stringify(['staff','manager','admin'])) {
  throw new Error('assignable staff roles mismatch');
}

principal={subject:'web:staff',channel:'web',roles:['staff'],authenticated:true};
res=svc.handleRequest('POST','/api/web/admin/roles',{body:{sessionToken:'good'}});
if(res.ok||res.error.code!=='FORBIDDEN') throw new Error('staff must be denied');

res=svc.handleRequest('POST','/api/web/admin/roles',{body:{sessionToken:'bad'}});
if(res.ok||res.error.code!=='UNAUTHENTICATED') throw new Error('invalid session must fail closed');

principal={subject:'web:admin',channel:'web',roles:['admin'],authenticated:true};
res=svc.handleRequest('GET','/api/web/admin/roles',{body:{sessionToken:'good'}});
if(res.ok||res.error.code!=='METHOD_NOT_ALLOWED') throw new Error('role catalog route must be POST-only');

const route=sandbox.Api.ApiRegistry.listRoutes().find(r=>r.path==='/api/web/admin/roles');
if(!route||route.auth!=='web-session'||route.method!=='POST') throw new Error('route metadata mismatch');

const webSrc=fs.readFileSync(path.join(root,'app','WebApp.js'),'utf8');
if(!webSrc.includes("path === '/api/web/admin/roles'")) throw new Error('WebApp classification missing');

console.log('PASS  admin role catalog requires server Web session');
console.log('PASS  canonical role vocabulary returned by backend');
console.log('PASS  non-admin and invalid sessions fail closed');
console.log('PASS  route is POST-only web-session authenticated');
console.log('=== WEB ROLE CATALOG API TESTS PASS (4/4) ===');
