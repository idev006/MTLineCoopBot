#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={
  Api:{ApiHandlers:{
    health:()=>({}),
    calculateLoan:()=>({}),
    webSessionFromLine:()=>({}),
    verifyWebSession:()=>({}),
    revokeWebSession:()=>({}),
    listWebMembers:()=>({}),
    getWebMemberDetail:()=>({}),
    getWebAdminSettings:()=>({}),
    listWebStaffAccounts:()=>({}),
    getWebRoleCatalog:()=>({}),
    assignWebStaffRole:()=>({}),
    getWebAuditLog:()=>({}),
    getWebSummaryReport:()=>({}),
    renewWebMember:()=>({}),
    getCurrentProfile:()=>({}),
    getCurrentSavings:()=>({}),
    getCurrentLoans:()=>({}),
    getCurrentDividends:()=>({}),
    renewCurrentMember:()=>({}),
    activate:()=>({})
  }},
  Object,Array,String
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root,'app/Api/ApiRegistry.js'),'utf8'),sandbox,{filename:'ApiRegistry.js'});

const routes=sandbox.Api.ApiRegistry.listRoutes();
const retired=[
  '/api/member/profile',
  '/api/member/savings',
  '/api/member/loans',
  '/api/member/dividends',
  '/api/member/validity'
];
for(const pathName of retired){
  if(routes.some(r=>r.path===pathName)) throw new Error('legacy route still registered: '+pathName);
}
for(const pathName of [
  '/api/member/me/profile',
  '/api/member/me/savings',
  '/api/member/me/loans',
  '/api/member/me/dividends',
  '/api/member/me/renew'
]){
  const route=routes.find(r=>r.path===pathName);
  if(!route||route.method!=='POST'||route.auth!=='line-id-token') throw new Error('secure replacement missing: '+pathName);
}
for(const pathName of ['/api/member/activate','/api/member/renew']){
  if(!routes.find(r=>r.path===pathName)) throw new Error('identity-binding compatibility route must remain until SEC-WEB-004: '+pathName);
}

const handlers=fs.readFileSync(path.join(root,'app','Api','ApiHandlers.js'),'utf8');
for(const marker of ['function requireMember(','function getProfile(','function getSavings(','function getLoans(','function getDividends(','function getValidity(']){
  if(handlers.includes(marker)) throw new Error('retired legacy handler remains: '+marker);
}

console.log('PASS  legacy lineUserId read/validity routes retired');
console.log('PASS  verified ID-token self-service replacements retained');
console.log('PASS  activation/renew compatibility preserved for SEC-WEB-004');
console.log('=== LEGACY MEMBER ROUTE RETIREMENT TESTS PASS (3/3) ===');
