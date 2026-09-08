#!/usr/bin/env node
'use strict';

const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Security:{},Engine:{},Adapters:{},Application:{},Date,Object,Array,Set,Map,JSON,String,Number};
vm.createContext(sandbox);
for(const rel of [
  'app/Security/Principal.js',
  'app/Ports/ClockPort.js',
  'app/Ports/ConfigPort.js',
  'app/Ports/SessionStorePort.js',
  'app/Ports/SessionTokenPort.js',
  'app/Engine/WebSessionEngine.js',
  'app/Adapters/Test/InMemorySessionStore.js',
  'app/Adapters/Test/DeterministicSessionTokenAdapter.js',
  'app/Application/Security/CreateWebSessionUseCase.js',
  'app/Application/Security/VerifyWebSessionUseCase.js',
  'app/Application/Security/RevokeWebSessionUseCase.js',
  'app/Adapters/Security/WebSessionIdentityAdapter.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

let now=new Date('2026-09-08T07:00:00Z');
const clock={now:()=>new Date(now)};
const config={get:()=>({WEB_SESSION_TTL_SECONDS:3600})};
const store=sandbox.Adapters.Test.InMemorySessionStore.create();
const tokens=sandbox.Adapters.Test.DeterministicSessionTokenAdapter.create('opaque');
const engine=sandbox.Engine.WebSessionEngine.create({clock});
const createSession=sandbox.Application.Security.CreateWebSessionUseCase.create({
  sessionStore:store,sessionTokens:tokens,config,sessionEngine:engine
});
const verifySession=sandbox.Application.Security.VerifyWebSessionUseCase.create({
  sessionStore:store,sessionTokens:tokens,sessionEngine:engine
});
const revokeSession=sandbox.Application.Security.RevokeWebSessionUseCase.create({
  sessionStore:store,sessionTokens:tokens,clock
});
const identity=sandbox.Adapters.Security.WebSessionIdentityAdapter.create({verifySession});

const principal=sandbox.Security.Principal.create({
  subject:'admin-001',channel:'web',roles:['admin'],claims:{name:'Admin'},authenticated:true
});
const issued=createSession.execute({principal});
if(!issued.ok||issued.data.token!=='opaque-1') throw new Error('session issue failed');
if(issued.data.expiresAt!=='2026-09-08T08:00:00.000Z') throw new Error('session expiry response mismatch');

const snapshot=store.snapshot();
if(snapshot.length!==1) throw new Error('session not stored');
if(JSON.stringify(snapshot).includes('opaque-1')) throw new Error('raw token must never be persisted');
if(snapshot[0].tokenHash!==tokens.hash('opaque-1')) throw new Error('hashed token not persisted');

const verified=verifySession.execute({token:'opaque-1'});
if(!verified.ok||!verified.data.principal.roles.includes('admin')) throw new Error('session verify failed');

const forged=verifySession.execute({token:'opaque-forged'});
if(forged.ok||forged.error.code!=='UNAUTHENTICATED') throw new Error('forged token must fail closed');

const viaIdentity=identity.authenticate({sessionToken:'opaque-1'});
if(!viaIdentity.authenticated||viaIdentity.subject!=='admin-001') throw new Error('identity adapter failed');

const revoked=revokeSession.execute({token:'opaque-1'});
if(!revoked.ok) throw new Error('revoke failed');
const after=verifySession.execute({token:'opaque-1'});
if(after.ok||after.error.reason!=='revoked') throw new Error('revoked session still valid');
if(identity.authenticate({sessionToken:'opaque-1'}).authenticated) throw new Error('identity adapter must fail closed after revoke');

const missing=createSession.execute({principal:sandbox.Security.Principal.anonymous('web')});
if(missing.ok||missing.error.code!=='UNAUTHENTICATED') throw new Error('anonymous principal must not create session');

console.log('PASS  raw token returned once but only hash persisted');
console.log('PASS  verify creates server canonical Principal');
console.log('PASS  forged/missing tokens fail closed');
console.log('PASS  revocation invalidates session immediately');
console.log('=== WEB SESSION APPLICATION TESTS PASS (4/4) ===');
