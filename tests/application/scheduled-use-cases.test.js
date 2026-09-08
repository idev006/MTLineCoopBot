#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const files=[
  'app/Core/MemberRules.js',
  'app/Core/NoticeRules.js',
  'app/Core/LoanRules.js',
  'app/Ports/ClockPort.js',
  'app/Ports/ConfigPort.js',
  'app/Ports/AuditPort.js',
  'app/Ports/MessagingPort.js',
  'app/Ports/MemberMenuPort.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Adapters/Test/InMemoryMemberRepository.js',
  'app/Adapters/Test/InMemoryAuditAdapter.js',
  'app/Adapters/Test/InMemoryMessagingAdapter.js',
  'app/Adapters/Test/InMemoryMemberMenuAdapter.js',
  'app/Application/Scheduled/ExpiryScanUseCase.js',
  'app/Application/Scheduled/NoticeBroadcastUseCase.js',
  'app/Application/Scheduled/LoanReminderUseCase.js'
];

const sandbox={Core:{},Ports:{},Adapters:{},Application:{},Date,Object,Array,Set,JSON,String,Number,Math};
vm.createContext(sandbox);
for(const rel of files){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const now=new Date(2026,8,8,9,0,0);
const clock={now:()=>new Date(now)};
const config={get:()=>({EXPIRY_WARNING_DAYS:30,PAYMENT_REMINDER_DAYS:14})};

function makeDeps(seed){
  return {
    repo:sandbox.Adapters.Test.InMemoryMemberRepository.create(seed),
    audit:sandbox.Adapters.Test.InMemoryAuditAdapter.create(),
    messaging:sandbox.Adapters.Test.InMemoryMessagingAdapter.create(),
    menu:sandbox.Adapters.Test.InMemoryMemberMenuAdapter.create()
  };
}

{
  const d=makeDeps({
    members:[
      {mem_code:'M1',mem_status:'active',mem_role:'member',line_user_id:'U1',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-09-10'},
      {mem_code:'M2',mem_status:'active',mem_role:'member',line_user_id:'U2',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-09-01'},
      {mem_code:'M3',mem_status:'inactive',mem_role:'member',line_user_id:'U3',mem_eff_dt:'2026-01-01',mem_exp_dt:'2026-12-31'}
    ]
  });
  const uc=sandbox.Application.Scheduled.ExpiryScanUseCase.create({
    memberRepository:d.repo,clock,config,messaging:d.messaging,memberMenu:d.menu,audit:d.audit
  });
  const s=uc.execute();
  if(s.checked!==3 || s.logged!==2 || s.expiring!==1 || s.expired!==1 || s.pushed!==2) throw new Error('expiry summary mismatch');
  if(d.messaging.list().length!==2) throw new Error('expiry messages mismatch');
  if(d.menu.listRevoked()[0]!=='U2') throw new Error('expired member menu not revoked');
  if(d.audit.snapshot().length!==2) throw new Error('expiry audit mismatch');
}

{
  const d=makeDeps({
    members:[
      {mem_code:'M1',mem_status:'active',line_user_id:'U1'},
      {mem_code:'M2',mem_status:'inactive',line_user_id:'U2'}
    ],
    notices:[
      {notice_id:'N1',status:'pending',publish_dt:'2026-09-01'},
      {notice_id:'N2',status:'sent',publish_dt:'2026-09-01'}
    ]
  });
  const uc=sandbox.Application.Scheduled.NoticeBroadcastUseCase.create({
    memberRepository:d.repo,clock,messaging:d.messaging
  });
  const s=uc.execute();
  if(s.notices!==2 || s.pending!==1 || s.targets!==1 || s.sent!==1 || s.pushed!==1) throw new Error('notice summary mismatch');
  if(d.messaging.list()[0].type!=='notice') throw new Error('notice semantic message missing');
  if(d.repo.listNotices().find(n=>n.notice_id==='N1').sent!==true) throw new Error('notice not marked sent');
}

{
  const d=makeDeps({
    members:[
      {mem_code:'M1',mem_status:'active',line_user_id:'U1'},
      {mem_code:'M2',mem_status:'inactive',line_user_id:'U2'}
    ],
    loans:[
      {mem_code:'M1',loan_no:'L1',due_dt:'2026-09-15'},
      {mem_code:'M2',loan_no:'L2',due_dt:'2026-09-16'},
      {mem_code:'M1',loan_no:'L3',due_dt:'2026-12-01'}
    ]
  });
  const uc=sandbox.Application.Scheduled.LoanReminderUseCase.create({
    memberRepository:d.repo,clock,config,messaging:d.messaging,audit:d.audit
  });
  const s=uc.execute();
  if(s.loans!==3 || s.due!==2 || s.reminded!==1 || s.skipped!==1 || s.pushed!==1) throw new Error('loan reminder summary mismatch');
  if(d.messaging.list()[0].type!=='loan-reminder') throw new Error('loan reminder semantic message missing');
  const events=d.audit.snapshot();
  if(events.length!==2 || !events.some(e=>e.status==='reminded') || !events.some(e=>e.status==='skipped')) throw new Error('loan reminder audit mismatch');
}

console.log('PASS  ExpiryScanUseCase headless orchestration');
console.log('PASS  NoticeBroadcastUseCase headless orchestration');
console.log('PASS  LoanReminderUseCase headless orchestration');
console.log('=== SCHEDULED APPLICATION TESTS PASS (3/3) ===');
