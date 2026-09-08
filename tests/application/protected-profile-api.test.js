#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..', '..');

const files = [
  'app/Api/ApiResponse.js',
  'app/Api/ApiError.js',
  'app/Api/ApiHandlers.js',
  'app/Api/ApiRegistry.js',
  'app/Api/ApiService.js'
];

const fakeProfile = { mem_code:'M001', mem_fname:'Verified' };
let identityInput = null;
const fakeSystem = {
  lineIdentity: {
    authenticate: input => {
      identityInput = input;
      return { subject:'line:U1', channel:'line', roles:['member'], memberCode:'M001', claims:{}, authenticated:true };
    }
  },
  getCurrentMemberProfile: {
    execute: ({principal}) => principal.authenticated
      ? { ok:true, data:fakeProfile }
      : { ok:false, error:{code:'UNAUTHENTICATED'} }
  },
  memberRepository: {},
  memberAccess: {},
  config: { get: () => ({}) }
};

const sandbox = {
  Security:{ Principal:{ isAuthenticated:p=>!!(p&&p.authenticated) } },
  Api:{},
  Composition:{ SystemFactory:{ createSystem: () => fakeSystem } },
  Logger:{ log:()=>{} },
  DataDict:{ formatDateTime:()=>'' },
  Date,
  Object,
  String,
  JSON,
  Error
};

vm.createContext(sandbox);
for(const rel of files) {
  vm.runInContext(fs.readFileSync(path.join(root, rel),'utf8'), sandbox, {filename:rel});
}

const svc=sandbox.Api.ApiService;

const ok=svc.handleRequest('POST','/api/member/me/profile',{body:{idToken:'raw-id-token'}});
if(!ok.ok || ok.data.mem_code!=='M001') throw new Error('verified self-profile endpoint should succeed');
if(!identityInput || identityInput.idToken!=='raw-id-token') throw new Error('raw ID token must reach identity adapter');

const missing=svc.handleRequest('POST','/api/member/me/profile',{body:{}});
if(missing.ok || missing.error.code!=='UNAUTHENTICATED') throw new Error('missing token must fail closed');

fakeSystem.lineIdentity.authenticate=()=>({subject:'anonymous',channel:'line',roles:[],memberCode:null,claims:{},authenticated:false});
const denied=svc.handleRequest('POST','/api/member/me/profile',{body:{idToken:'bad'}});
if(denied.ok || denied.error.code!=='UNAUTHENTICATED') throw new Error('invalid identity must be denied');

const wrongMethod=svc.handleRequest('GET','/api/member/me/profile',{body:{idToken:'raw'}});
if(wrongMethod.ok || wrongMethod.error.code!=='METHOD_NOT_ALLOWED') throw new Error('protected token route must be POST-only');

console.log('PASS  protected profile routes raw token to identity adapter');
console.log('PASS  missing/invalid identity fails closed');
console.log('PASS  protected profile endpoint is POST-only');
console.log('=== PROTECTED PROFILE API TESTS PASS (3/3) ===');
