#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={Core:{},Application:{},Date,Object,Array,Math,Number,String,RegExp};
vm.createContext(sandbox);
for(const rel of [
  'app/Core/LoanCalculator.js',
  'app/Application/Finance/CalculateLoanUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const uc=sandbox.Application.Finance.CalculateLoanUseCase.create();
const ok=uc.execute({params:{
  loanAmount:100000,
  interestRatePercent:5,
  calcMode:'installment_count',
  calcValue:12,
  paymentType:'equal_installment',
  startDate:'2026-09-01'
}});
if(!ok.ok||ok.data.schedule.length!==12) throw new Error('valid calculation use case failed');

const bad=uc.execute({params:{loanAmount:0}});
if(bad.ok||bad.error.code!=='LOAN_AMOUNT_INVALID') throw new Error('invalid calculation must expose stable error');

let called=false;
const fake=sandbox.Application.Finance.CalculateLoanUseCase.create({
  calculator:{calculateLoanSchedule:p=>{called=true;return {schedule:[],totalPrincipal:Number(p.loanAmount)||0};}}
});
const fakeResult=fake.execute({params:{loanAmount:123}});
if(!called||!fakeResult.ok||fakeResult.data.totalPrincipal!==123) throw new Error('calculator injection failed');

console.log('PASS  CalculateLoanUseCase success boundary');
console.log('PASS  CalculateLoanUseCase stable validation error');
console.log('PASS  CalculateLoanUseCase calculator injection');
console.log('=== CALCULATE LOAN USE CASE TESTS PASS (3/3) ===');
