#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.join(__dirname,'..','..');

const props=new Map();
const sandbox={
  Adapters:{},
  PropertiesService:{
    getScriptProperties:()=>({
      setProperty:(k,v)=>{props.set(String(k),String(v));},
      getProperty:k=>props.has(String(k))?props.get(String(k)):null
    })
  },
  Utilities:{
    getUuid:(()=>{let i=0;return()=>`uuid-${++i}-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`;})(),
    DigestAlgorithm:{SHA_256:'SHA_256'},
    Charset:{UTF_8:'UTF_8'},
    computeDigest:(alg,raw)=>Array.from(crypto.createHash('sha256').update(String(raw),'utf8').digest()),
    base64EncodeWebSafe:bytes=>Buffer.from(Uint8Array.from(bytes)).toString('base64url')
  },
  JSON,String,Object,Array,Uint8Array
};
vm.createContext(sandbox);
for(const rel of [
  'app/Adapters/Security/AppsScriptSessionTokenAdapter.js',
  'app/Adapters/Security/AppsScriptPropertiesSessionStore.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const tokens=sandbox.Adapters.Security.AppsScriptSessionTokenAdapter;
const store=sandbox.Adapters.Security.AppsScriptPropertiesSessionStore;
const raw=tokens.generate();
if(raw.split('.').length!==3) throw new Error('opaque token must combine independent UUID values');
const hash=tokens.hash(raw);
if(!hash||hash.includes(raw)) throw new Error('token hash invalid');

store.save({
  tokenHash:hash,subject:'staff-1',channel:'web',roles:['staff'],
  memberCode:null,claims:{},issuedAt:'2026-09-08T07:00:00.000Z',
  expiresAt:'2026-09-08T08:00:00.000Z',revokedAt:null
});
if(Array.from(props.keys()).some(k=>k.includes(raw))) throw new Error('raw token leaked into property key');
if(Array.from(props.values()).some(v=>v.includes(raw))) throw new Error('raw token leaked into property value');
const loaded=store.findByTokenHash(hash);
if(!loaded||loaded.subject!=='staff-1') throw new Error('stored session could not be loaded');
store.revokeByTokenHash(hash,'2026-09-08T07:30:00.000Z');
if(!store.findByTokenHash(hash).revokedAt) throw new Error('revocation was not persisted');

props.set('WEB_SESSION_corrupt','{not-json');
if(store.findByTokenHash('corrupt')!==null) throw new Error('corrupt server state must fail closed');

console.log('PASS  production token adapter generates opaque token and SHA-256 hash');
console.log('PASS  Script Properties store never persists raw bearer token');
console.log('PASS  production store persists revocation and fails closed on corruption');
console.log('=== WEB SESSION PRODUCTION ADAPTER TESTS PASS (3/3) ===');
