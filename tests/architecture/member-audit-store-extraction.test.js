const fs=require('fs');
const path=require('path');

const root=process.cwd();
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');

const memberPort=read('app/Ports/MemberRepositoryPort.js');
const sheetsRepo=read('app/Data/SheetsMemberRepository.js');
const memoryRepo=read('app/Adapters/Test/InMemoryMemberRepository.js');
const memberAuditPort=read('app/Ports/MemberAuditStorePort.js');
const durable=read('app/Adapters/Audit/DurableAuditAdapter.js');
const sheetsStore=read('app/Adapters/Audit/SheetsMemberAuditStore.js');
const factory=read('app/Composition/SystemFactory.js');

for(const [name,src] of [
  ['MemberRepositoryPort',memberPort],
  ['SheetsMemberRepository',sheetsRepo],
  ['InMemoryMemberRepository',memoryRepo]
]){
  for(const pattern of [
    /['"]logActivation['"]/,
    /['"]logExpiry['"]/,
    /['"]logReminder['"]/,
    /function\s+logActivation\s*\(/,
    /function\s+logExpiry\s*\(/,
    /function\s+logReminder\s*\(/
  ]){
    if(pattern.test(src)) throw new Error(name+' must not own durable audit persistence: '+pattern);
  }
}

for(const method of ['logActivation','logExpiry','logReminder']){
  if(!memberAuditPort.includes("'"+method+"'")){
    throw new Error('MemberAuditStorePort missing '+method);
  }
  if(!sheetsStore.includes('function '+method+'(')){
    throw new Error('SheetsMemberAuditStore missing '+method);
  }
}

for(const required of [
  'Ports.MemberAuditStorePort.assertImplemented(d.memberAuditStore)',
  'Ports.AdminAuditStorePort.assertImplemented(d.adminAuditStore)',
  'memberStore.logActivation',
  'memberStore.logExpiry',
  'memberStore.logReminder',
  'adminStore.append'
]){
  if(!durable.includes(required)){
    throw new Error('DurableAuditAdapter missing dedicated store authority: '+required);
  }
}

for(const forbidden of [
  'MemberRepositoryAuditAdapter',
  'memberRepository,\n        adminAuditStore'
]){
  if(factory.includes(forbidden)){
    throw new Error('SystemFactory must not compose transitional repository audit adapter: '+forbidden);
  }
}
for(const required of [
  'Ports.MemberAuditStorePort.assertImplemented',
  'Adapters.Audit.SheetsMemberAuditStore',
  'Adapters.Audit.DurableAuditAdapter.create',
  'memberAuditStore'
]){
  if(!factory.includes(required)){
    throw new Error('SystemFactory missing dedicated audit-store composition: '+required);
  }
}

console.log('member audit store extraction: PASS');
