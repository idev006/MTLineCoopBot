#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const files=[
  'app/Security/Principal.js',
  'app/Api/ApiResponse.js',
  'app/Api/ApiError.js',
  'app/Api/ApiHandlers.js',
  'app/Api/ApiRegistry.js',
  'app/Api/ApiService.js'
];

let lastKind=null;
const principal={subject:'line:U1',channel:'line',roles:['member'],memberCode:'M001',claims:{},authenticated:true};
const fakeSystem={
  lineIdentity:{ authenticate:()=>principal },
  getCurrentMemberFinance:{
    execute:({principal:p,kind})=>{
      lastKind=kind;
      if(!p.authenticated) return {ok:false,error:{code:'UNAUTHENTICATED'}};
      return {ok:true,data:{memberCode:'M001',kind,rows:[{marker:kind}]}};
    }
  },
  getCurrentMemberProfile:{execute:()=>({ok:true,data:{mem_code:'M001'}})},
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
  if(rel==='app/Security/Principal.js') continue;
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const svc=sandbox.Api.ApiService;
for(const kind of ['savings','loans','dividends']){
  const env=svc.handleRequest('POST','/api/member/me/'+kind,{body:{idToken:'raw'}});
  if(!env.ok || !env.data[kind] || env.data[kind][0].marker!==kind) throw new Error('protected finance route failed: '+kind);
  if(lastKind!==kind) throw new Error('finance kind not forwarded: '+kind);
}

fakeSystem.lineIdentity.authenticate=()=>({authenticated:false});
const denied=svc.handleRequest('POST','/api/member/me/savings',{body:{idToken:'bad'}});
if(denied.ok || denied.error.code!=='UNAUTHENTICATED') throw new Error('invalid token finance access must fail');

const getDenied=svc.handleRequest('GET','/api/member/me/savings',{body:{idToken:'raw'}});
if(getDenied.ok || getDenied.error.code!=='METHOD_NOT_ALLOWED') throw new Error('finance routes must be POST-only');

console.log('PASS  protected savings/loans/dividends delivery routes');
console.log('PASS  invalid finance identity fails closed');
console.log('PASS  finance token routes are POST-only');
console.log('=== PROTECTED FINANCE API TESTS PASS (3/3) ===');
