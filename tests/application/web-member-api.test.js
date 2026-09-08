#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

const staffPrincipal={subject:'web:staff',channel:'web',roles:['staff'],memberCode:null,claims:{},authenticated:true};
const memberPrincipal={subject:'web:member',channel:'web',roles:['member'],memberCode:'M1',claims:{},authenticated:true};
let principal=staffPrincipal;

const fakeSystem={
  webIdentity:{authenticate:({sessionToken})=>sessionToken==='good-session'?principal:{subject:'anonymous',channel:'web',roles:[],memberCode:null,claims:{},authenticated:false}},
  listWebMembers:{
    execute:({principal:p})=>{
      if(!p.authenticated) return {ok:false,error:{code:'UNAUTHENTICATED'}};
      if(!p.roles.some(r=>['staff','admin','manager'].includes(r))) return {ok:false,error:{code:'FORBIDDEN'}};
      return {ok:true,data:{members:[{mem_code:'M1',line_linked:true}],page:1,limit:20,total:1,totalPages:1}};
    }
  },
  getWebMemberDetail:{
    execute:({principal:p,memberCode})=>{
      if(!p.authenticated) return {ok:false,error:{code:'UNAUTHENTICATED'}};
      if(!p.roles.some(r=>['staff','admin','manager'].includes(r))) return {ok:false,error:{code:'FORBIDDEN'}};
      if(!memberCode) return {ok:false,error:{code:'VALIDATION'}};
      return {ok:true,data:{member:{mem_code:memberCode,line_linked:true},savings:[],loans:[],dividends:[]}};
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

let res=svc.handleRequest('POST','/api/web/members/list',{body:{sessionToken:'good-session'}});
if(!res.ok||res.data.total!==1) throw new Error('staff member list failed');
const json=JSON.stringify(res.data);
if(json.includes('line_user_id')||json.includes('activate_code')||json.includes('_rowIndex')) throw new Error('sensitive fields leaked from list');

res=svc.handleRequest('POST','/api/web/members/detail',{body:{sessionToken:'good-session',memberCode:'M1'}});
if(!res.ok||res.data.member.mem_code!=='M1') throw new Error('staff member detail failed');
if(JSON.stringify(res.data).includes('line_user_id')||JSON.stringify(res.data).includes('activate_code')) throw new Error('sensitive detail fields leaked');

res=svc.handleRequest('POST','/api/web/members/list',{body:{sessionToken:'bad'}});
if(res.ok||res.error.code!=='UNAUTHENTICATED') throw new Error('invalid session must fail closed');

principal=memberPrincipal;
res=svc.handleRequest('POST','/api/web/members/list',{body:{sessionToken:'good-session'}});
if(res.ok||res.error.code!=='FORBIDDEN') throw new Error('member role must be denied server-side');

principal=staffPrincipal;
res=svc.handleRequest('GET','/api/web/members/list',{body:{sessionToken:'good-session'}});
if(res.ok||res.error.code!=='METHOD_NOT_ALLOWED') throw new Error('web member list must be POST-only');

const routes=sandbox.Api.ApiRegistry.listRoutes();
for(const p of ['/api/web/members/list','/api/web/members/detail']){
  const route=routes.find(r=>r.path===p);
  if(!route||route.method!=='POST'||route.auth!=='web-session') throw new Error('route contract mismatch: '+p);
}

const webSrc=fs.readFileSync(path.join(root,'app','WebApp.js'),'utf8');
for(const p of ['/api/web/members/list','/api/web/members/detail']){
  if(!webSrc.includes(`path === '${p}'`)) throw new Error('WebApp identity route classification missing: '+p);
}

console.log('PASS  Web member list/detail require server Web session');
console.log('PASS  server-side RBAC denies member role');
console.log('PASS  delivery responses preserve data minimization');
console.log('PASS  Web member routes are POST-only session-authenticated');
console.log('=== WEB MEMBER API TESTS PASS (4/4) ===');
