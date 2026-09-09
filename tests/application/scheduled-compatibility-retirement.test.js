#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','..');

const services=[
  ['ExpiryService.js','runExpiryCheck','expiryScan'],
  ['NoticeService.js','runNoticeBroadcast','noticeBroadcast'],
  ['LoanReminderService.js','runLoanReminders','loanReminder']
];

for(const [file,fn,useCase] of services){
  const src=fs.readFileSync(path.join(root,'app','LineBot',file),'utf8');
  const signature=new RegExp('function\\s+'+fn+'\\s*\\(\\s*\\)');
  if(!signature.test(src)) throw new Error(file+' must expose parameterless thin scheduled adapter: '+fn);

  const forbidden=[
    /\bopts\b/,
    /Data\.MemberRepository/,
    /Core\.MemberRules\.getExpiryStatus/,
    /Core\.NoticeRules\.getPendingNotices/,
    /Core\.LoanRules\.getDueLoans/,
    /MessageService\.push/,
    /MessageService\.pushFlex/,
    /RichMenu\.Gating\.unlinkMemberMenu/,
    /\.logExpiry\s*\(/,
    /\.logReminder\s*\(/,
    /\.markNoticeSent\s*\(/
  ];
  for(const pattern of forbidden){
    if(pattern.test(src)) throw new Error(file+' still contains retired scheduled compatibility orchestration: '+pattern);
  }

  const delegation=new RegExp('SystemFactory\\.createSystem\\(\\)\\.'+useCase+'\\.execute\\(\\)');
  if(!delegation.test(src)) throw new Error(file+' must delegate directly to '+useCase+'.execute()');
}

const legacyTests=fs.readFileSync(path.join(root,'app','Test.js'),'utf8');
for(const marker of [
  "runExpiryCheck('TOKEN', {",
  "runNoticeBroadcast('TOKEN', {",
  "runLoanReminders('TOKEN', {"
]){
  if(legacyTests.includes(marker)) throw new Error('legacy opts caller remains in Test.js: '+marker);
}

console.log('PASS  scheduled LineBot services are thin Application adapters');
console.log('PASS  no opts/repository/domain/messaging duplicate orchestration remains');
console.log('PASS  legacy Test.js opts callers are retired');
console.log('=== SCHEDULED COMPATIBILITY RETIREMENT TESTS PASS (3/3) ===');
