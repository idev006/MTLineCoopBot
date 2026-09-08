#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Security:{},Application:{},Object,Array,Set,String};
vm.createContext(sandbox);
for(const rel of [
 'app/Security/Principal.js',
 'app/Ports/IdentityPort.js',
 'app/Application/Security/ExchangeLineForWebSessionUseCase.js'
]){
 vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

function principal(role){
 return sandbox.Security.Principal.create({
   subject:'line:U1',channel:'line',roles:role?[role]:[],memberCode:'M1',
   claims:{lineUserId:'U1'},authenticated:true
 });
}
const authorization={
 requireAnyRole:(p,roles)=>({allowed:roles.some(r=>(p.roles||[]).includes(r)),reason:'forbidden'})
};
let source=principal('staff');
const lineIdentity={authenticate:()=>source};
let created=null;
const createWebSession={execute:({principal})=>{created=principal;return {ok:true,data:{token:'opaque',user:{roles:principal.roles}}};}};
const uc=sandbox.Application.Security.ExchangeLineForWebSessionUseCase.create({
 lineIdentity,authorization,createWebSession
});

for(const role of ['staff','admin','manager']){
 source=principal(role);
 created=null;
 const r=uc.execute({idToken:'verified-token',roles:['admin'],memberCode:'ATTACK'});
 if(!r.ok) throw new Error(role+' should be allowed');
 if(!created||created.channel!=='web'||!created.roles.includes(role)) throw new Error('web principal conversion failed for '+role);
 if(created.memberCode!=='M1') throw new Error('client memberCode must not override server binding');
}

source=principal('member');
const denied=uc.execute({idToken:'verified-token',roles:['admin']});
if(denied.ok||denied.error.code!=='FORBIDDEN') throw new Error('member role must not obtain staff Web session');

source=sandbox.Security.Principal.anonymous('line');
const anon=uc.execute({idToken:'bad'});
if(anon.ok||anon.error.code!=='UNAUTHENTICATED') throw new Error('invalid LINE identity must fail closed');

const missing=uc.execute({});
if(missing.ok||missing.error.code!=='UNAUTHENTICATED') throw new Error('missing ID token must fail closed');

console.log('PASS  staff/admin/manager verified roles may exchange');
console.log('PASS  member role denied Web staff session');
console.log('PASS  client role/member overrides ignored');
console.log('PASS  missing/invalid LINE identity fails closed');
console.log('=== WEB SESSION LINE EXCHANGE TESTS PASS (4/4) ===');
