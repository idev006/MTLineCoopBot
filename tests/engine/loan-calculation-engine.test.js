#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={Core:{},Date,Object,Array,Math,Number,String,RegExp};
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(root,'app','Core','LoanCalculator.js'),'utf8'),
  sandbox,
  {filename:'LoanCalculator.js'}
);

const calc=sandbox.Core.LoanCalculator;

function almost(a,b,eps=0.02){
  return Math.abs(Number(a)-Number(b))<=eps;
}

function assertValidResult(result, amount){
  if(result.error) throw new Error('unexpected calculation error: '+result.error);
  if(!result.schedule.length) throw new Error('schedule must not be empty');
  const principal=result.schedule.reduce((s,r)=>s+r.principal,0);
  const interest=result.schedule.reduce((s,r)=>s+r.interest,0);
  const payment=result.schedule.reduce((s,r)=>s+r.totalPayment,0);
  if(!almost(principal,amount,0.05)) throw new Error('principal conservation failed: '+principal);
  if(!almost(result.totalPrincipal,amount,0.05)) throw new Error('total principal mismatch');
  if(!almost(payment,principal+interest,0.10)) throw new Error('row totals do not reconcile');
  if(!almost(result.totalPayment,result.totalPrincipal+result.totalInterest,0.10)) throw new Error('summary totals do not reconcile');
  if(result.schedule.some(r=>r.principal<0||r.interest<0||r.totalPayment<0)) throw new Error('negative money value');
}

const base={
  loanAmount:500000,
  interestRatePercent:5,
  calcMode:'installment_count',
  calcValue:50,
  paymentType:'equal_principal',
  startDate:'2026-09-01'
};

const principal=calc.calculateLoanSchedule(base);
assertValidResult(principal,500000);
if(principal.schedule.length!==50) throw new Error('installment_count must produce requested periods');

const alias=calc.calculateLoanSchedule({...base,paymentType:'equal_total'});
const canonical=calc.calculateLoanSchedule({...base,paymentType:'equal_installment'});
if(alias.error||canonical.error) throw new Error('equal installment calculations should succeed');
if(alias.paymentType!=='equal_installment') throw new Error('legacy alias not canonicalized');
if(JSON.stringify(alias.schedule)!==JSON.stringify(canonical.schedule)) throw new Error('legacy alias must equal canonical result');

const zero=calc.calculateLoanSchedule({
  ...base,
  loanAmount:120000,
  interestRatePercent:0,
  calcValue:12,
  paymentType:'equal_installment'
});
assertValidResult(zero,120000);
if(zero.totalInterest!==0) throw new Error('zero interest must yield zero totalInterest');
if(zero.schedule.length!==12) throw new Error('zero-interest count must preserve period count');

const amountMode=calc.calculateLoanSchedule({
  ...base,
  loanAmount:100000,
  calcMode:'installment_amount',
  calcValue:10000,
  paymentType:'equal_principal'
});
assertValidResult(amountMode,100000);

const low=calc.calculateLoanSchedule({
  ...base,
  loanAmount:1000000,
  interestRatePercent:36,
  calcMode:'installment_amount',
  calcValue:100,
  paymentType:'equal_installment'
});
if(low.code!=='INSTALLMENT_TOO_LOW') throw new Error('too-low installment must be explicit');

for(const [params,code] of [
  [{...base,loanAmount:0},'LOAN_AMOUNT_INVALID'],
  [{...base,interestRatePercent:-1},'INTEREST_RATE_INVALID'],
  [{...base,calcMode:'bad'},'CALC_MODE_INVALID'],
  [{...base,calcValue:0},'CALC_VALUE_INVALID'],
  [{...base,calcValue:12.5},'INSTALLMENT_COUNT_INVALID'],
  [{...base,calcValue:361},'INSTALLMENT_COUNT_INVALID'],
  [{...base,paymentType:'bad'},'PAYMENT_TYPE_INVALID'],
  [{...base,startDate:'2026-02-30'},'START_DATE_INVALID']
]){
  const r=calc.calculateLoanSchedule(params);
  if(r.code!==code) throw new Error('expected '+code+', got '+r.code);
}

const d=calc.getNextMonthEnd('2026-09-01',1);
if(calc.formatLocalDate(d)!=='2026-09-30') throw new Error('month-end date must remain local calendar date');
if(calc.parseLocalDate('2026-02-30')!==null) throw new Error('invalid calendar date must reject');

console.log('PASS  principal conservation and totals reconciliation');
console.log('PASS  canonical/legacy payment type parity');
console.log('PASS  zero-interest and amount-mode calculations');
console.log('PASS  invalid/boundary inputs fail explicitly');
console.log('PASS  local calendar dates remain stable');
console.log('=== LOAN CALCULATION ENGINE TESTS PASS (5/5) ===');
