const fs=require('fs');
const path=require('path');
const vm=require('vm');

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

const dateNow=[];
for(const full of listJs(appRoot)){
  const rel=path.relative(root,full).replace(/\\/g,'/');
  const src=fs.readFileSync(full,'utf8');
  if(/\bDate\.now\s*\(/.test(src)) dateNow.push(rel);
}
if(dateNow.length){
  throw new Error('Date.now() must not remain in backend app tree: '+JSON.stringify(dateNow));
}

const memberStore=fs.readFileSync(path.join(root,'app/Adapters/Audit/SheetsMemberAuditStore.js'),'utf8');
const adminStore=fs.readFileSync(path.join(root,'app/Adapters/Audit/SheetsAdminAuditStore.js'),'utf8');
for(const [src,expected] of [
  [memberStore,["ids.next('LOG')","ids.next('ELOG')","ids.next('RLOG')"]],
  [adminStore,["ids.next('ALOG')"]]
]){
  for(const required of expected){
    if(!src.includes(required)) throw new Error('audit store missing explicit ID generation: '+required);
  }
}
for(const src of [memberStore,adminStore]){
  if(!src.includes('Ports.IdPort.assertImplemented')){
    throw new Error('audit store must validate IdPort dependency');
  }
}

const factory=fs.readFileSync(path.join(root,'app/Composition/SystemFactory.js'),'utf8');
for(const required of [
  'Ports.IdPort.assertImplemented',
  'Adapters.Id.AppsScriptIdAdapter',
  'SheetsMemberAuditStore.create({ idGenerator })',
  'SheetsAdminAuditStore.create({ idGenerator })',
  'idGenerator,'
]){
  if(!factory.includes(required)) throw new Error('SystemFactory missing ID authority: '+required);
}

const sheetSrc=fs.readFileSync(path.join(root,'app/LineBot/SheetService.js'),'utf8');
for(const required of [
  'Activation audit log ID is required',
  'Expiry audit log ID is required',
  'Reminder audit log ID is required',
  'Admin audit log ID is required'
]){
  if(!sheetSrc.includes(required)) throw new Error('SheetService missing fail-closed ID contract: '+required);
}

let spreadsheetTouches=0;
const sandbox={
  LineBot:{},
  Logger:{log:()=>{}},
  DataDict:{},
  Date,Object,String
};
Object.defineProperty(sandbox,'SpreadsheetApp',{
  get(){
    spreadsheetTouches+=1;
    throw new Error('SpreadsheetApp must not be touched when audit ID is missing');
  }
});
vm.createContext(sandbox);
vm.runInContext(sheetSrc,sandbox,{filename:'SheetService.js'});

const cases=[
  ['logActivation',{activatedDt:'2026-09-09 10:00:00'},'Activation audit log ID is required'],
  ['appendExpiryLog',{checkedDt:'2026-09-09 10:00:00'},'Expiry audit log ID is required'],
  ['appendReminderLog',{remindedDt:'2026-09-09 10:00:00'},'Reminder audit log ID is required'],
  ['appendAdminAuditLog',{createdDt:'2026-09-09 10:00:00'},'Admin audit log ID is required']
];
for(const [method,entry,expected] of cases){
  let rejected=false;
  try{ sandbox.LineBot.SheetService[method](entry); }
  catch(e){ rejected=String(e.message).includes(expected); }
  if(!rejected) throw new Error(method+' must fail closed when audit ID is missing');
}
if(spreadsheetTouches!==0){
  throw new Error('missing audit ID must be rejected before persistence access');
}

console.log('durable audit ID authority: PASS');
