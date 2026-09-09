#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const calls=[];
let validationCalls=0;
const validatedConfig={
  validate:()=>{validationCalls+=1;return {CHANNEL_ACCESS_TOKEN:'TOKEN'};}
};
const system={
  expiryScan:{execute:()=>{calls.push('expiry');return {source:'application',kind:'expiry'};}},
  noticeBroadcast:{execute:()=>{calls.push('notice');return {source:'application',kind:'notice'};}},
  loanReminder:{execute:()=>{calls.push('loan');return {source:'application',kind:'loan'};}}
};

const sandbox={
  LineBot:{},
  Composition:{SystemFactory:{
    createSystem:()=>system,
    createValidatedConfig:()=>validatedConfig
  }},
  Data:{MemberRepository:{getRepository:()=>({})}},
  Core:{MemberRules:{},NoticeRules:{},LoanRules:{}},
  RichMenu:{Gating:{}},
  Logger:{log:()=>{}},
  ScriptApp:{},
  Date,Object,String,JSON
};
vm.createContext(sandbox);

for(const rel of [
  'app/LineBot/ExpiryService.js',
  'app/LineBot/NoticeService.js',
  'app/LineBot/LoanReminderService.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const e=sandbox.LineBot.ExpiryService.runExpiryCheck('IGNORED');
const n=sandbox.LineBot.NoticeService.runNoticeBroadcast('IGNORED');
const l=sandbox.LineBot.LoanReminderService.runLoanReminders('IGNORED');

if(e.source!=='application'||e.kind!=='expiry') throw new Error('expiry default path did not delegate');
if(n.source!=='application'||n.kind!=='notice') throw new Error('notice default path did not delegate');
if(l.source!=='application'||l.kind!=='loan') throw new Error('loan default path did not delegate');
if(calls.join(',')!=='expiry,notice,loan') throw new Error('unexpected application delegation order/calls');

const te=sandbox.runExpiryCheck();
const tn=sandbox.runNoticeBroadcast();
const tl=sandbox.runLoanReminders();
if(te.kind!=='expiry'||tn.kind!=='notice'||tl.kind!=='loan') throw new Error('top-level scheduled trigger delegation failed');
if(validationCalls!==3) throw new Error('each top-level scheduled trigger must validate config exactly once through composition');
if(calls.join(',')!=='expiry,notice,loan,expiry,notice,loan') throw new Error('top-level trigger application delegation mismatch');

console.log('PASS  top-level triggers validate config through composition');
console.log('PASS  expiry production path delegates to Application Layer');
console.log('PASS  notice production path delegates to Application Layer');
console.log('PASS  reminder production path delegates to Application Layer');
console.log('=== SCHEDULED RUNTIME DELEGATION TESTS PASS (4/4) ===');
