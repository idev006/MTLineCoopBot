#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

let lastExchange=null,lastVerify=null,lastRevoke=null;
const fakeSystem={
 exchangeLineForWebSession:{execute:input=>{
   lastExchange=input;
   if(input.idToken==='good') return {ok:true,data:{token:'opaque-session',expiresAt:'2026-09-08T15:00:00.000Z',user:{subject:'web:line:U1',roles:['staff'],memberCode:'M1'}}};
   if(input.idToken==='member') return {ok:false,error:{code:'FORBIDDEN'}};
   return {ok:false,error:{code:'UNAUTHENTICATED'}};
 }},
 verifyWebSession:{execute:input=>{
   lastVerify=input;
   return input.token==='opaque-session'
    ? {ok:true,data:{principal:{subject:'web:line:U1',roles:['staff'],memberCode:'M1',claims:{sessionExpiresAt:'2026-09-08T15:00:00.000Z'},authenticated:true}}}
    : {ok:false,error:{code:'UNAUTHENTICATED'}};
 }},
 revokeWebSession:{execute:input=>{
   lastRevoke=input;
   return input.token==='opaque-session'?{ok:true,data:{revoked:true}}:{ok:false,error:{code:'UNAUTHENTICATED'}};
 }}
};

const sandbox={
 Api:{},Composition:{SystemFactory:{createSystem:()=>fakeSystem}},
 DataDict:{formatDateTime:()=>''},Logger:{log:()=>{}},
 Security:{Principal:{isAuthenticated:p=>!!(p&&p.authenticated)}},
 Date,Object,Array,String,JSON,Error
};
vm.createContext(sandbox);
for(const rel of [
 'app/Api/ApiResponse.js','app/Api/ApiError.js','app/Api/ApiHandlers.js','app/Api/ApiRegistry.js','app/Api/ApiService.js'
]){
 vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const svc=sandbox.Api.ApiService;
const exchanged=svc.handleRequest('POST','/api/web/session/line',{body:{idToken:'good',roles:['admin'],memberCode:'ATTACK'}});
if(!exchanged.ok||exchanged.data.token!=='opaque-session') throw new Error('LINE exchange API failed');
if(JSON.stringify(lastExchange)!==JSON.stringify({idToken:'good'})) throw new Error('handler must forward only idToken to exchange');

const member=svc.handleRequest('POST','/api/web/session/line',{body:{idToken:'member'}});
if(member.ok||member.error.code!=='FORBIDDEN') throw new Error('forbidden role envelope mismatch');

const verified=svc.handleRequest('POST','/api/web/session/verify',{body:{sessionToken:'opaque-session'}});
if(!verified.ok||verified.data.valid!==true||verified.data.user.roles[0]!=='staff') throw new Error('verify API failed');
if(lastVerify.token!=='opaque-session') throw new Error('verify did not pass session token');

const bad=svc.handleRequest('POST','/api/web/session/verify',{body:{sessionToken:'forged'}});
if(bad.ok||bad.error.code!=='UNAUTHENTICATED') throw new Error('forged session must fail closed');

const revoked=svc.handleRequest('POST','/api/web/session/revoke',{body:{sessionToken:'opaque-session'}});
if(!revoked.ok||revoked.data.revoked!==true) throw new Error('revoke API failed');
if(lastRevoke.token!=='opaque-session') throw new Error('revoke did not pass session token');

for(const pathName of ['/api/web/session/line','/api/web/session/verify','/api/web/session/revoke']){
 const route=sandbox.Api.ApiRegistry.listRoutes().find(r=>r.path===pathName);
 if(!route||route.method!=='POST') throw new Error('missing POST route '+pathName);
}

const webSrc=fs.readFileSync(path.join(root,'app','WebApp.js'),'utf8');
for(const p of ['/api/web/session/line','/api/web/session/verify','/api/web/session/revoke']){
 if(!webSrc.includes(p)) throw new Error(p+' must be explicitly self-authenticating/API-key exempt');
}

console.log('PASS  LINE exchange API forwards only raw verified credential');
console.log('PASS  verify/revoke session delivery contracts');
console.log('PASS  forged session and forbidden role fail closed');
console.log('PASS  Web session routes bypass legacy browser API key explicitly');
console.log('=== WEB SESSION API TESTS PASS (4/4) ===');
