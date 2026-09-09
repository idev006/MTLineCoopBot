const fs=require('fs');
const path=require('path');

const root=process.cwd();
const appRoot=path.join(root,'app');

function listJs(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...listJs(full));
    else if(entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const allowed={
  'LineBot.SheetService.logActivation(':'app/Adapters/Audit/SheetsMemberAuditStore.js',
  'LineBot.SheetService.appendExpiryLog(':'app/Adapters/Audit/SheetsMemberAuditStore.js',
  'LineBot.SheetService.appendReminderLog(':'app/Adapters/Audit/SheetsMemberAuditStore.js',
  'LineBot.SheetService.appendAdminAuditLog(':'app/Adapters/Audit/SheetsAdminAuditStore.js'
};

const violations=[];
for(const full of listJs(appRoot)){
  const rel=path.relative(root,full).replace(/\\/g,'/');
  const src=fs.readFileSync(full,'utf8');
  for(const [needle,allowedRel] of Object.entries(allowed)){
    if(src.includes(needle) && rel!==allowedRel){
      violations.push({rel,writer:needle,allowed:allowedRel});
    }
  }
}
if(violations.length){
  throw new Error('durable audit writer bypass detected: '+JSON.stringify(violations));
}

const memberStore=fs.readFileSync(path.join(root,'app/Adapters/Audit/SheetsMemberAuditStore.js'),'utf8');
const adminStore=fs.readFileSync(path.join(root,'app/Adapters/Audit/SheetsAdminAuditStore.js'),'utf8');
for(const needle of [
  'LineBot.SheetService.logActivation(',
  'LineBot.SheetService.appendExpiryLog(',
  'LineBot.SheetService.appendReminderLog('
]){
  if(!memberStore.includes(needle)) throw new Error('member audit store missing raw writer delegation: '+needle);
}
if(!adminStore.includes('LineBot.SheetService.appendAdminAuditLog(')){
  throw new Error('admin audit store missing raw writer delegation');
}

const factory=fs.readFileSync(path.join(root,'app/Composition/SystemFactory.js'),'utf8');
for(const required of [
  'Adapters.Audit.DurableAuditAdapter.create',
  'Adapters.Audit.SheetsMemberAuditStore',
  'Adapters.Audit.SheetsAdminAuditStore'
]){
  if(!factory.includes(required)) throw new Error('SystemFactory missing canonical audit composition: '+required);
}

console.log('repository-wide durable audit caller authority: PASS');
