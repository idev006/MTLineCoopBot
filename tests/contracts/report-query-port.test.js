#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const tables={
  MEMBER_MASTER:[{mem_code:'M1'}],
  SAVINGS_ACCT:[{balance:100}],
  LOAN_ACCT:[{outstanding:50}],
  DIVIDEND:[{dividend_amt:10}]
};
const sandbox={
  Ports:{},Adapters:{},
  LineBot:{SheetService:{
    getSheet:key=>({key}),
    readRowsAsObjects:key=>(tables[key]||[]).map(x=>({...x}))
  }},
  Object,Array,String
};
vm.createContext(sandbox);
for(const rel of [
  'app/Ports/ReportQueryPort.js',
  'app/Adapters/Report/SheetsReportQueryAdapter.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}
const adapter=sandbox.Ports.ReportQueryPort.assertImplemented(sandbox.Adapters.Report.SheetsReportQueryAdapter);
const snap=adapter.snapshot();
if(snap.members.length!==1||snap.savings.length!==1||snap.loans.length!==1||snap.dividends.length!==1) throw new Error('snapshot contract failed');
console.log('PASS  ReportQueryPort production adapter reads canonical report tables');
console.log('=== REPORT QUERY ADAPTER TESTS PASS (1/1) ===');
