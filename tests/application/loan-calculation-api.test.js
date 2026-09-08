#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

let received=null;
const fakeSystem={
  calculateLoan:{
    execute:({params})=>{
      received=params;
      if(!params || Number(params.loanAmount)<=0) {
        return {ok:false,error:{code:'LOAN_AMOUNT_INVALID',message:'loanAmount ไม่ถูกต้อง'}};
      }
      return {
        ok:true,
        data:{
          contractVersion:'loan-calculation.v1',
          paymentType:'equal_installment',
          schedule:[{period:1,principal:Number(params.loanAmount),interest:0,totalPayment:Number(params.loanAmount)}],
          totalInterest:0,
          totalPrincipal:Number(params.loanAmount),
          totalPayment:Number(params.loanAmount)
        }
      };
    }
  }
};

const sandbox={
  Api:{},
  Composition:{SystemFactory:{createSystem:()=>fakeSystem}},
  DataDict:{formatDateTime:()=>''},
  Logger:{log:()=>{}},
  Date,Object,String,JSON,Error
};
vm.createContext(sandbox);
for(const rel of [
  'app/Api/ApiResponse.js',
  'app/Api/ApiError.js',
  'app/Api/ApiHandlers.js',
  'app/Api/ApiRegistry.js',
  'app/Api/ApiService.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const svc=sandbox.Api.ApiService;
const payload={
  loanAmount:120000,
  interestRatePercent:0,
  calcMode:'installment_count',
  calcValue:12,
  paymentType:'equal_total',
  startDate:'2026-09-01'
};
const ok=svc.handleRequest('POST','/api/loan/calculate',{body:payload});
if(!ok.ok||ok.data.contractVersion!=='loan-calculation.v1') throw new Error('public loan calculation endpoint failed');
if(received!==payload) throw new Error('handler must forward body unchanged to application use case');

const bad=svc.handleRequest('POST','/api/loan/calculate',{body:{loanAmount:0}});
if(bad.ok||bad.error.code!=='LOAN_AMOUNT_INVALID') throw new Error('validation error envelope mismatch');

const wrongMethod=svc.handleRequest('GET','/api/loan/calculate',{});
if(wrongMethod.ok||wrongMethod.error.code!=='METHOD_NOT_ALLOWED') throw new Error('loan calculation must be POST-only');

const routes=sandbox.Api.ApiRegistry.listRoutes();
const route=routes.find(r=>r.path==='/api/loan/calculate');
if(!route||route.method!=='POST'||route.auth!=='none') throw new Error('loan calculation route contract mismatch');

const webSrc=fs.readFileSync(path.join(root,'app','WebApp.js'),'utf8');
if(!/path === ['"]\/api\/loan\/calculate['"]/.test(webSrc)) {
  throw new Error('WebApp must classify /api/loan/calculate explicitly as public');
}
if(!/!isPublicApiPath\(path\) && !isIdentityAuthenticatedApiPath\(path\)/.test(webSrc)) {
  throw new Error('API-key gate must exempt public routes explicitly');
}

console.log('PASS  public POST loan calculation delivery contract');
console.log('PASS  stable validation envelope and POST-only method');
console.log('PASS  route is explicitly public and API-key exempt');
console.log('=== LOAN CALCULATION API TESTS PASS (3/3) ===');
