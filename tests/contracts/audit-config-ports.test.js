#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={
  Ports:{},
  Adapters:{},
  Config:{ get:()=>({mode:'prod',EXPIRY_WARNING_DAYS:30}) },
  Object,Array,JSON,String
};
vm.createContext(sandbox);

for(const rel of [
  'app/Ports/MemberRepositoryPort.js',
  'app/Ports/ConfigPort.js',
  'app/Ports/AuditPort.js',
  'app/Adapters/Config/AppsScriptConfigAdapter.js',
  'app/Adapters/Audit/MemberRepositoryAuditAdapter.js',
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

let rejectedConfig=false;
try{ ConfigPort.assertImplemented({}); }catch(e){ rejectedConfig=/get/.test(String(e.message)); }
if(!rejectedConfig) throw new Error('invalid ConfigPort adapter must be rejected');

let rejectedAudit=false;
try{ AuditPort.assertImplemented({}); }catch(e){ rejectedAudit=/record/.test(String(e.message)); }
if(!rejectedAudit) throw new Error('invalid AuditPort adapter must be rejected');

const methods=sandbox.Ports.MemberRepositoryPort.listMethods();
const calls=[];
const repo={};
for(const m of methods) repo[m]=()=>null;
repo.logActivation=(entry)=>{ calls.push(entry); return {log_id:'L1',status:entry.status}; };

const durable=sandbox.Adapters.Audit.MemberRepositoryAuditAdapter.create({memberRepository:repo});
AuditPort.assertImplemented(durable);

durable.record({
  type:'member.activation',
  memberCode:'M001',
  lineUserId:'U1',
  activateCode:'A1',
  status:'success'
});
durable.record({
  type:'member.renewal',
  memberCode:'M001',
  lineUserId:'U1',
  status:'renewed'
});

if(calls.length!==2) throw new Error('durable audit adapter did not persist both events');
if(calls[0].activateCode!=='A1' || calls[0].status!=='success') {
  throw new Error('activation audit mapping incorrect');
}
if(calls[1].activateCode!=='' || calls[1].status!=='renewed') {
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

console.log('PASS  ConfigPort production adapter + invalid adapter rejection');
console.log('PASS  AuditPort durable activation/renewal mapping');
console.log('PASS  InMemoryAuditAdapter deterministic snapshot/reset');
console.log('=== AUDIT CONFIG PORT TESTS PASS (3/3) ===');
