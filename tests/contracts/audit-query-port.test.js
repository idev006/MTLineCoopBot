#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const tables={
  ACTIVATION_LOG:[
    {log_id:'A1',mem_code:'M1',activated_dt:'2026-09-08 10:00:00'}
  ],
  EXPIRY_LOG:[
    {log_id:'E1',mem_code:'M2',checked_dt:'2026-09-08 11:00:00'}
  ],
  REMINDER_LOG:[
    {log_id:'R1',mem_code:'M3',reminded_dt:'2026-09-08 09:00:00'}
  ]
};
const sandbox={
  Ports:{},
  Adapters:{},
  LineBot:{SheetService:{
    getSheet:key=>({key}),
    readRowsAsObjects:key=>(tables[key]||[]).map(x=>({...x}))
  }},
  Object,Array,String,Number
};
vm.createContext(sandbox);
for(const rel of [
  'app/Ports/AuditQueryPort.js',
  'app/Adapters/Audit/SheetsAuditQueryAdapter.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}
const port=sandbox.Ports.AuditQueryPort;
const adapter=port.assertImplemented(sandbox.Adapters.Audit.SheetsAuditQueryAdapter);
const all=adapter.list({type:'all',limit:2});
if(all.length!==2||all[0].log_id!=='E1'||all[1].log_id!=='A1') throw new Error('sort/limit contract failed');
const expiry=adapter.list({type:'expiry',limit:50});
if(expiry.length!==1||expiry[0].type!=='expiry') throw new Error('type filter failed');
const bad=adapter.list({type:'unknown'});
if(bad.length!==0) throw new Error('unknown type adapter behavior failed');
console.log('PASS  AuditQueryPort production adapter');
console.log('PASS  audit type filter, newest-first sort and limit');
console.log('=== AUDIT QUERY ADAPTER TESTS PASS (2/2) ===');
