#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

let principal={subject:'web:admin',channel:'web',roles:['admin'],memberCode:'A001',authenticated:true};
const fakeSystem={
  webIdentity:{
    authenticate:({sessionToken})=>sessionToken==='good'
      ? principal
      : {subject:'anonymous',channel:'web',roles:[],memberCode:null,authenticated:false}
  },
  assignStaffRole:{
    execute:({principal:p,memberCode,role})=>{
      if(!p.authenticated) return {ok:false,error:{code:'UNAUTHENTICATED'}};
      if(!(p.roles||[]).includes('admin')) return {ok:false,error:{code:'FORBIDDEN'}};
      if(!memberCode||!['staff','manager','admin'].includes(role)) return {ok:false,error:{code:'VALIDATION'}};
      if(p.memberCode&&p.memberCode===memberCode) return {ok:false,error:{code:'SELF_ROLE_CHANGE_FORBIDDEN'}};
      if(memberCode==='NOPE') return {ok:false,error:{code:'MEMBER_NOT_FOUND'}};
      return {ok:true,data:{memberCode,oldRole:'staff',newRole:role,changed:true,auditConfirmed:true}};
    }
  }
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

let r=svc.handleRequest('POST','/api/web/admin/staff/role',{
  body:{sessionToken:'good',memberCode:'S001',role:'manager'}
});
if(!r.ok||r.data.newRole!=='manager'||r.data.auditConfirmed!==true) throw new Error('admin role assignment delivery failed');

principal={subject:'web:staff',channel:'web',roles:['staff'],memberCode:'S001',authenticated:true};
r=svc.handleRequest('POST','/api/web/admin/staff/role',{
  body:{sessionToken:'good',memberCode:'M001',role:'manager'}
});
if(r.ok||r.error.code!=='FORBIDDEN') throw new Error('non-admin must be denied');

principal={subject:'web:admin',channel:'web',roles:['admin'],memberCode:'A001',authenticated:true};
r=svc.handleRequest('POST','/api/web/admin/staff/role',{
  body:{sessionToken:'bad',memberCode:'S001',role:'manager'}
});
if(r.ok||r.error.code!=='UNAUTHENTICATED') throw new Error('invalid session must fail closed');

r=svc.handleRequest('POST','/api/web/admin/staff/role',{
  body:{sessionToken:'good',memberCode:'A001',role:'staff'}
});
if(r.ok||r.error.code!=='SELF_ROLE_CHANGE_FORBIDDEN') throw new Error('self role change must fail');

r=svc.handleRequest('POST','/api/web/admin/staff/role',{
  body:{sessionToken:'good',memberCode:'S001',role:'superadmin'}
});
if(r.ok||r.error.code!=='VALIDATION') throw new Error('invalid role must fail');

r=svc.handleRequest('POST','/api/web/admin/staff/role',{
  body:{sessionToken:'good',memberCode:'NOPE',role:'staff'}
});
if(r.ok||r.error.code!=='MEMBER_NOT_FOUND') throw new Error('missing target must fail');

r=svc.handleRequest('GET','/api/web/admin/staff/role',{
  body:{sessionToken:'good',memberCode:'S001',role:'staff'}
});
if(r.ok||r.error.code!=='METHOD_NOT_ALLOWED') throw new Error('role assignment must be POST-only');

const route=sandbox.Api.ApiRegistry.listRoutes().find(x=>x.path==='/api/web/admin/staff/role');
if(!route||route.method!=='POST'||route.auth!=='web-session') throw new Error('route metadata mismatch');


console.log('PASS  admin role assignment requires verified Web session');
console.log('PASS  non-admin/self-change/invalid role/missing member fail closed');
console.log('PASS  role assignment is POST-only session-authenticated');
console.log('=== WEB ROLE ASSIGNMENT API TESTS PASS (3/3) ===');
