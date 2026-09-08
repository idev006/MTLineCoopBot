#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Adapters:{},Map,Object,JSON,String};
vm.createContext(sandbox);
for(const rel of [
 'app/Ports/SessionStorePort.js',
 'app/Ports/SessionTokenPort.js',
 'app/Adapters/Test/InMemorySessionStore.js',
 'app/Adapters/Test/DeterministicSessionTokenAdapter.js'
]){
 vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}
const store=sandbox.Adapters.Test.InMemorySessionStore.create();
const tokens=sandbox.Adapters.Test.DeterministicSessionTokenAdapter.create('s');
sandbox.Ports.SessionStorePort.assertImplemented(store);
sandbox.Ports.SessionTokenPort.assertImplemented(tokens);
store.save({tokenHash:'h',subject:'u',roles:[],expiresAt:'2026-09-08T08:00:00.000Z',revokedAt:null});
if(store.findByTokenHash('h').subject!=='u') throw new Error('store contract failed');
store.revokeByTokenHash('h','2026-09-08T07:30:00.000Z');
if(!store.findByTokenHash('h').revokedAt) throw new Error('store revoke contract failed');
const issued=tokens.generate();
const hashed=tokens.hash(issued);
if(!hashed || hashed.includes(issued)) throw new Error('token adapter must hash without embedding raw token');
let a=false,b=false;
try{sandbox.Ports.SessionStorePort.assertImplemented({});}catch(_){a=true;}
try{sandbox.Ports.SessionTokenPort.assertImplemented({});}catch(_){b=true;}
if(!a||!b) throw new Error('incomplete adapters must reject');
console.log('PASS  SessionStorePort contract');
console.log('PASS  SessionTokenPort contract');
console.log('=== WEB SESSION PORT TESTS PASS (2/2) ===');
