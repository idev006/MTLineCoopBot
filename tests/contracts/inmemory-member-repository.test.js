#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={Ports:{},Adapters:{},Object,Array,JSON,String,Number,Date};
vm.createContext(sandbox);
for(const rel of [
  'app/Ports/MemberRepositoryPort.js',
  'app/Adapters/Test/InMemoryMemberRepository.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const seed={
  members:[
    {mem_code:'M001',activate_code:'A1',line_user_id:'U1',mem_role:'member',mem_status:'active'},
    {mem_code:'M002',activate_code:'A2',line_user_id:'U2',mem_role:'staff',mem_status:'active'}
  ],
  savings:[{mem_code:'M001',acct_no:'S1',balance:100}],
  loans:[{mem_code:'M001',loan_no:'L1',outstanding:50}],
  dividends:[{mem_code:'M001',year:2026,dividend:10}],
  notices:[{notice_id:'N1',title:'Notice'}],
  content:{welcome:'hello'}
};

const repo=sandbox.Adapters.Test.InMemoryMemberRepository.create(seed);
sandbox.Ports.MemberRepositoryPort.assertImplemented(repo);

if(repo.findByMemberCode('M001')._rowIndex!==2) throw new Error('member row mapping failed');
if(repo.findByLineUserId('U2').mem_code!=='M002') throw new Error('line lookup failed');
if(repo.findByActivateCode('A1').mem_code!=='M001') throw new Error('activate-code lookup failed');
if(repo.findSavingsByMember('M001').length!==1) throw new Error('savings lookup failed');
if(repo.findLoansByMember('M001').length!==1) throw new Error('loans lookup failed');
if(repo.findDividendsByMember('M001').length!==1) throw new Error('dividends lookup failed');
if(repo.getContent('welcome')!=='hello') throw new Error('content lookup failed');

repo.renewMember(2,'2027-01-01','U1');
if(repo.findByMemberCode('M001').mem_exp_dt!=='2027-01-01') throw new Error('legacy renew persistence failed');

repo.saveRenewal(2,{memExpDt:'2028-01-01',memStatus:'active'});
const savedRenewal=repo.findByMemberCode('M001');
if(savedRenewal.mem_exp_dt!=='2028-01-01' || savedRenewal.mem_status!=='active') {
  throw new Error('explicit saveRenewal persistence failed');
}

repo.markNoticeSent('N1','2026-09-08');
if(repo.listNotices()[0].sent!==true) throw new Error('notice mutation failed');

repo.logActivation({memCode:'M001'});
repo.logExpiry({memCode:'M001'});
repo.logReminder({memCode:'M001'});
const changed=repo.snapshot();
if(changed.activationLogs.length!==1 || changed.expiryLogs.length!==1 || changed.reminderLogs.length!==1) {
  throw new Error('logs not recorded');
}

changed.members[0].mem_code='MUTATED';
if(repo.findByMemberCode('M001')===null) throw new Error('snapshot leaked mutable state');

repo.reset();
if(repo.findByMemberCode('M001').mem_exp_dt) throw new Error('reset must restore seed state');
if(repo.snapshot().activationLogs.length!==0) throw new Error('reset must restore log seed');

console.log('PASS  InMemoryMemberRepository satisfies MemberRepositoryPort');
console.log('PASS  deterministic lookup/mutation/log behavior');
console.log('PASS  snapshot isolation and reset');
console.log('=== IN-MEMORY MEMBER REPOSITORY TESTS PASS (3/3) ===');
