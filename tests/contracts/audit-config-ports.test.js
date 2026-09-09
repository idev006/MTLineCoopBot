#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={
  Ports:{},
  Adapters:{},
  Config:{ get:()=>({mode:'prod',EXPIRY_WARNING_DAYS:30}), validate:()=>({mode:'validated',CHANNEL_ACCESS_TOKEN:'TOKEN'}) },
  Object,Array,JSON,String
};
vm.createContext(sandbox);

for(const rel of [
  'app/Ports/MemberAuditStorePort.js',
  'app/Ports/AdminAuditStorePort.js',
  'app/Ports/ConfigPort.js',
  'app/Ports/AuditPort.js',
  'app/Adapters/Config/AppsScriptConfigAdapter.js',
  'app/Adapters/Audit/DurableAuditAdapter.js',
  'app/Adapters/Test/InMemoryAuditAdapter.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const ConfigPort=sandbox.Ports.ConfigPort;
const AuditPort=sandbox.Ports.AuditPort;

if(ConfigPort.assertImplemented(sandbox.Adapters.Config.AppsScriptConfigAdapter)
  !== sandbox.Adapters.Config.AppsScriptConfigAdapter){
  throw new Error('AppsScriptConfigAdapter must satisfy ConfigPort');
}
if(sandbox.Adapters.Config.AppsScriptConfigAdapter.get().mode!=='prod'){
  throw new Error('AppsScriptConfigAdapter must delegate to Config.get');
}
if(ConfigPort.assertValidatable(sandbox.Adapters.Config.AppsScriptConfigAdapter)
  !== sandbox.Adapters.Config.AppsScriptConfigAdapter){
  throw new Error('AppsScriptConfigAdapter must satisfy validatable ConfigPort capability');
}
if(sandbox.Adapters.Config.AppsScriptConfigAdapter.validate().mode!=='validated'){
  throw new Error('AppsScriptConfigAdapter must delegate validate() to Config.validate');
}
let rejectedValidatable=false;
try{ ConfigPort.assertValidatable({get:()=>({})}); }catch(e){ rejectedValidatable=/validate/.test(String(e.message)); }
if(!rejectedValidatable) throw new Error('read-only ConfigPort must be rejected by validatable capability');

let rejectedConfig=false;
try{ ConfigPort.assertImplemented({}); }catch(e){ rejectedConfig=/get/.test(String(e.message)); }
if(!rejectedConfig) throw new Error('invalid ConfigPort adapter must be rejected');

let rejectedAudit=false;
try{ AuditPort.assertImplemented({}); }catch(e){ rejectedAudit=/record/.test(String(e.message)); }
if(!rejectedAudit) throw new Error('invalid AuditPort adapter must be rejected');

const calls=[];
const memberAuditStore={
  logActivation:(entry)=>{ calls.push({kind:'activation',entry}); return {log_id:'L1',status:entry.status}; },
  logExpiry:(entry)=>{ calls.push({kind:'expiry',entry}); return {log_id:'E1',status:entry.status}; },
  logReminder:(entry)=>{ calls.push({kind:'reminder',entry}); return {log_id:'R1',status:entry.status}; }
};
const adminCalls=[];
const adminAuditStore={append:(entry)=>{adminCalls.push(entry);return {log_id:'A1',status:entry.status};}};
sandbox.Ports.MemberAuditStorePort.assertImplemented(memberAuditStore);
sandbox.Ports.AdminAuditStorePort.assertImplemented(adminAuditStore);

const durable=sandbox.Adapters.Audit.DurableAuditAdapter.create({memberAuditStore,adminAuditStore});
AuditPort.assertImplemented(durable);

durable.record({
  type:'member.activation',
  memberCode:'M001',
  lineUserId:'U1',
  activateCode:'A1',
  status:'success',
  occurredAt:'2026-09-09 10:00:00'
});
durable.record({
  type:'member.renewal',
  memberCode:'M001',
  lineUserId:'U1',
  status:'renewed',
  occurredAt:'2026-09-09 11:00:00'
});

if(calls.length!==2) throw new Error('durable audit adapter did not persist both events');
if(calls[0].kind!=='activation' || calls[0].entry.activateCode!=='A1' || calls[0].entry.status!=='success' || calls[0].entry.activatedDt!=='2026-09-09 10:00:00') {
  throw new Error('activation audit mapping incorrect');
}
if(calls[1].kind!=='activation' || calls[1].entry.activateCode!=='' || calls[1].entry.status!=='renewed' || calls[1].entry.activatedDt!=='2026-09-09 11:00:00') {
  throw new Error('renewal audit mapping incorrect');
}

let unsupported=false;
try{ durable.record({type:'unknown'}); }catch(e){ unsupported=/Unsupported audit/.test(String(e.message)); }
if(!unsupported) throw new Error('unsupported audit event must fail explicitly');

const memory=sandbox.Adapters.Test.InMemoryAuditAdapter.create([{type:'seed'}]);
AuditPort.assertImplemented(memory);
memory.record({type:'member.activation',memberCode:'M002'});
const snap=memory.snapshot();
if(snap.length!==2) throw new Error('in-memory audit record/snapshot failed');
snap[0].type='mutated';
if(memory.snapshot()[0].type!=='seed') throw new Error('in-memory audit snapshot leaked mutable state');
memory.reset();
if(memory.snapshot().length!==1 || memory.snapshot()[0].type!=='seed') {
  throw new Error('in-memory audit reset failed');
}

console.log('PASS  ConfigPort production adapter + validatable capability + invalid adapter rejection');
console.log('PASS  AuditPort durable activation/renewal mapping through dedicated audit stores');
console.log('PASS  InMemoryAuditAdapter deterministic snapshot/reset');
console.log('=== AUDIT CONFIG PORT TESTS PASS (3/3) ===');
