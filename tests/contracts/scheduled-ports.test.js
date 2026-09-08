#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={Ports:{},Adapters:{},Object,Array,JSON,String};
vm.createContext(sandbox);
for(const rel of [
  'app/Ports/MessagingPort.js',
  'app/Ports/MemberMenuPort.js',
  'app/Adapters/Test/InMemoryMessagingAdapter.js',
  'app/Adapters/Test/InMemoryMemberMenuAdapter.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const messaging=sandbox.Adapters.Test.InMemoryMessagingAdapter.create();
sandbox.Ports.MessagingPort.assertImplemented(messaging);
messaging.send({type:'notice',recipient:'U1',payload:{notice:{notice_id:'N1'}}});
if(messaging.list().length!==1) throw new Error('in-memory messaging did not record');
const copy=messaging.list();
copy[0].recipient='MUTATED';
if(messaging.list()[0].recipient!=='U1') throw new Error('messaging snapshot leaked mutable state');
messaging.reset();
if(messaging.list().length!==0) throw new Error('messaging reset failed');

const menu=sandbox.Adapters.Test.InMemoryMemberMenuAdapter.create();
sandbox.Ports.MemberMenuPort.assertImplemented(menu);
menu.revokeMemberMenu('U2');
if(menu.listRevoked()[0]!=='U2') throw new Error('member menu revoke not recorded');
menu.reset();
if(menu.listRevoked().length!==0) throw new Error('member menu reset failed');

let rejectedMessaging=false;
try { sandbox.Ports.MessagingPort.assertImplemented({}); } catch (_) { rejectedMessaging=true; }
if(!rejectedMessaging) throw new Error('MessagingPort must reject incomplete adapter');

let rejectedMenu=false;
try { sandbox.Ports.MemberMenuPort.assertImplemented({}); } catch (_) { rejectedMenu=true; }
if(!rejectedMenu) throw new Error('MemberMenuPort must reject incomplete adapter');

console.log('PASS  MessagingPort plug-compatible in-memory adapter');
console.log('PASS  MemberMenuPort plug-compatible in-memory adapter');
console.log('PASS  deterministic reset/snapshot behavior');
console.log('=== SCHEDULED PORT CONTRACT TESTS PASS (3/3) ===');
