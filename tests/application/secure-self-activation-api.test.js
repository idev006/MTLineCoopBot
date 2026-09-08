#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

let verifiedSubject='U-VERIFIED';
const fakeSystem={
  lineIdentity:{
    authenticate:({idToken})=>{
      if(idToken!=='good-token') return {subject:'anonymous',channel:'line',roles:[],memberCode:null,claims:{},authenticated:false};
      return {
        subject:'line:'+verifiedSubject,
        channel:'line',
        roles:[],
        memberCode:null,
        claims:{provider:'line',lineUserId:verifiedSubject},
        authenticated:true
      };
    }
  },
  selfActivateMember:{
    execute:({principal,activateCode})=>{
      if(!principal.authenticated) return {ok:false,error:{code:'UNAUTHENTICATED'}};
      if(!activateCode) return {ok:false,error:{code:'VALIDATION'}};
      if(activateCode==='CONFLICT') return {ok:false,error:{code:'BINDING_CONFLICT'}};
      return {
        ok:true,
        data:{
          mem_code:'M1',
          mem_status:'active',
          changed:true,
          already_bound:false,
          actorLineUserId:principal.claims.lineUserId
        }
      };
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

let r=svc.handleRequest('POST','/api/member/me/activate',{
  body:{
    idToken:'good-token',
    activateCode:'A1',
    lineUserId:'U-CLIENT-FAKE'
  }
});
if(!r.ok||r.data.actorLineUserId!=='U-VERIFIED') {
  throw new Error('client lineUserId influenced secure activation identity');
}

r=svc.handleRequest('POST','/api/member/me/activate',{body:{idToken:'bad-token',activateCode:'A1'}});
if(r.ok||r.error.code!=='UNAUTHENTICATED') throw new Error('invalid token must fail closed');

r=svc.handleRequest('POST','/api/member/me/activate',{body:{idToken:'good-token',activateCode:''}});
if(r.ok||r.error.code!=='VALIDATION') throw new Error('missing activation code must fail validation');

r=svc.handleRequest('POST','/api/member/me/activate',{body:{idToken:'good-token',activateCode:'CONFLICT'}});
if(r.ok||r.error.code!=='BINDING_CONFLICT') throw new Error('binding conflict must be explicit');

r=svc.handleRequest('GET','/api/member/me/activate',{body:{idToken:'good-token',activateCode:'A1'}});
if(r.ok||r.error.code!=='METHOD_NOT_ALLOWED') throw new Error('secure activation route must be POST-only');

const route=sandbox.Api.ApiRegistry.listRoutes().find(x=>x.path==='/api/member/me/activate');
if(!route||route.auth!=='line-id-token'||route.method!=='POST') throw new Error('secure activation route metadata mismatch');

const handlerSrc=fs.readFileSync(path.join(root,'app','Api','ApiHandlers.js'),'utf8');
const secureFn=handlerSrc.slice(
  handlerSrc.indexOf('function activateCurrentMember'),
  handlerSrc.indexOf('function renewCurrentMember')
);
if(/lineUserId/.test(secureFn)) throw new Error('secure handler must not read client lineUserId');

console.log('PASS  verified LINE Principal is sole binding identity authority');
console.log('PASS  client-supplied lineUserId cannot influence binding');
console.log('PASS  invalid token/validation/conflict fail closed');
console.log('PASS  canonical activation route is POST-only line-id-token authenticated');
console.log('=== SECURE SELF-ACTIVATION API TESTS PASS (4/4) ===');
