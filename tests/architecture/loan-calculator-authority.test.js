#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const root=path.join(__dirname,'..','..');

const core=fs.readFileSync(path.join(root,'app','Core','LoanCalculator.js'),'utf8');
const registry=fs.readFileSync(path.join(root,'app','Api','ApiRegistry.js'),'utf8');
const legacy=fs.readFileSync(path.join(root,'loan_calculator.html'),'utf8');
const menu=fs.readFileSync(path.join(root,'app','RichMenu','MenuData.js'),'utf8');

if(!/Core\.LoanCalculator/.test(core) || !/calculateLoanSchedule/.test(core)) {
  throw new Error('Core.LoanCalculator canonical authority missing');
}
if(!/\/api\/loan\/calculate/.test(registry)) {
  throw new Error('canonical public loan calculation API route missing');
}

const forbidden=[
  /getDaysDiff\s*=/,
  /getNextMonthEnd\s*=/,
  /balance\s*\*\s*rate\s*\*\s*days\s*\/\s*365/,
  /monthlyRate\s*=\s*rate\s*\/\s*12/,
  /Math\.pow\s*\(\s*1\s*\+\s*monthlyRate/
];
for(const p of forbidden){
  if(p.test(legacy)) throw new Error('duplicate loan formula remains in backend HTML: '+p);
}

const canonicalUrl='https://idev006.github.io/MTP6LineCoopBot/loan_calculator.html';
if(!legacy.includes(canonicalUrl)) {
  throw new Error('backend legacy calculator must redirect to canonical frontend URL');
}
if(!menu.includes(canonicalUrl)) {
  throw new Error('Rich Menu must target canonical frontend calculator URL');
}

console.log('PASS  Core.LoanCalculator is canonical backend authority');
console.log('PASS  public calculation API route exists');
console.log('PASS  backend legacy calculator contains no duplicated formula');
console.log('PASS  backend legacy page and Rich Menu target canonical frontend URL');
console.log('=== LOAN CALCULATOR AUTHORITY ARCHITECTURE TESTS PASS (4/4) ===');
