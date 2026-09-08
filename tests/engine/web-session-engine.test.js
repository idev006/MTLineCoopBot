#!/usr/bin/env node
'use strict';

const fs=require('fs'), path=require('path'), vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Security:{},Engine:{},Date,Object,Array,Set,JSON,String,Number};
vm.createContext(sandbox);
for(const rel of [
  'app/Security/Principal.js',
  'app/Ports/ClockPort.js',
  'app/Engine/WebSessionEngine.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

let now=new Date('2026-09-08T07:00:00Z');
const clock={now:()=>new Date(now)};
const engine=sandbox.Engine.WebSessionEngine.create({clock});
const principal=sandbox.Security.Principal.create({
  subject:'staff-001',channel:'web',roles:['staff','manager'],memberCode:'M001',
  claims:{displayName:'Operator'},authenticated:true
});

const built=engine.createRecord({principal,tokenHash:'hash-1',ttlSeconds:3600});
if(!built.ok) throw new Error('record creation failed');
if(built.data.tokenHash!=='hash-1') throw new Error('token hash missing');
if(built.data.subject!=='staff-001'||built.data.roles.length!==2) throw new Error('principal snapshot mismatch');
if(built.data.expiresAt!=='2026-09-08T08:00:00.000Z') throw new Error('expiry calculation mismatch');

const valid=engine.evaluate({...built.data});
if(!valid.valid||!valid.principal.authenticated||valid.principal.channel!=='web') throw new Error('valid record not authenticated');
if(!valid.principal.roles.includes('manager')||valid.principal.memberCode!=='M001') throw new Error('principal restoration mismatch');

now=new Date('2026-09-08T08:00:00Z');
const expired=engine.evaluate({...built.data});
if(expired.valid||expired.reason!=='expired') throw new Error('expired session must fail closed');

const revoked=engine.evaluate({...built.data,revokedAt:'2026-09-08T07:30:00.000Z'});
if(revoked.valid||revoked.reason!=='revoked') throw new Error('revoked session must fail closed');

const missing=engine.evaluate(null);
if(missing.valid||missing.reason!=='not_found') throw new Error('missing session must fail closed');

const linePrincipal=sandbox.Security.Principal.create({
  subject:'line-user',channel:'line',roles:['member'],authenticated:true
});
const wrongChannel=engine.createRecord({principal:linePrincipal,tokenHash:'h',ttlSeconds:60});
if(wrongChannel.ok||wrongChannel.error.code!=='WEB_PRINCIPAL_REQUIRED') throw new Error('line principal must not silently become web session');

console.log('PASS  WebSessionEngine deterministic issuance/expiry');
console.log('PASS  WebSessionEngine revocation fail-closed');
console.log('PASS  WebSessionEngine restores canonical Web Principal');
console.log('PASS  WebSessionEngine rejects non-Web principal');
console.log('=== WEB SESSION ENGINE TESTS PASS (4/4) ===');
