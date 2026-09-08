#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const files=[
  'app/Api/ApiResponse.js',
  'app/Api/ApiError.js',
  'app/Api/ApiHandlers.js',
  'app/Api/ApiRegistry.js',
  'app/Api/ApiService.js'
];

let identityInput=null;
const principal={
  subject:'line:U1',
  channel:'line',
  roles:['member'],
  memberCode:'M001',
  claims:{lineUserId:'U1'},
  authenticated:true
};

const fakeSystem={
  lineIdentity:{
    authenticate:input=>{
      identityInput=input;
      return principal;
    }
  },
  renewMember:{
    execute:({principal:p})=>p.authenticated
      ? {ok:true,data:{mem_code:'M001',mem_exp_dt:'2027-09-08',mem_status:'active',renewed_from:'2026-09-08'}}
      : {ok:false,error:{code:'UNAUTHENTICATED'}}
  },
  getCurrentMemberProfile:{execute:()=>({ok:true,data:{}})},
  getCurrentMemberFinance:{execute:()=>({ok:true,data:{rows:[]}})},
  activateMember:{execute:()=>({ok:true,data:{}})},
  memberRepository:{},
  memberAccess:{},
  config:{get:()=>({})}
};

const sandbox={
  Security:{Principal:{isAuthenticated:p=>!!(p&&p.authenticated)}},
  Api:{},
  Composition:{SystemFactory:{createSystem:()=>fakeSystem}},
  Logger:{log:()=>{}},
  DataDict:{formatDateTime:()=>''},
  Date,Object,String,JSON,Error
};

vm.createContext(sandbox);
for(const rel of files){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const svc=sandbox.Api.ApiService;

const ok=svc.handleRequest('POST','/api/member/me/renew',{body:{idToken:'raw-id-token'}});
if(!ok.ok || ok.data.mem_code!=='M001' || ok.data.mem_status!=='active') {
  throw new Error('verified self-renew endpoint should succeed');
}
if(!identityInput || identityInput.idToken!=='raw-id-token') {
  throw new Error('raw ID token must reach identity adapter');
}

const missing=svc.handleRequest('POST','/api/member/me/renew',{body:{}});
if(missing.ok || missing.error.code!=='UNAUTHENTICATED') {
  throw new Error('missing token must fail closed');
}

fakeSystem.lineIdentity.authenticate=()=>({authenticated:false});
const invalid=svc.handleRequest('POST','/api/member/me/renew',{body:{idToken:'bad'}});
if(invalid.ok || invalid.error.code!=='UNAUTHENTICATED') {
  throw new Error('invalid token must fail closed');
}

const getDenied=svc.handleRequest('GET','/api/member/me/renew',{body:{idToken:'raw'}});
if(getDenied.ok || getDenied.error.code!=='METHOD_NOT_ALLOWED') {
  throw new Error('self-renew route must be POST-only');
}

console.log('PASS  self-renew routes raw token through verified identity boundary');
console.log('PASS  missing/invalid token fails closed');
console.log('PASS  self-renew route is POST-only');
console.log('=== PROTECTED RENEW API TESTS PASS (3/3) ===');
