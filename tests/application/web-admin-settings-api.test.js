#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

let principal={subject:'web:admin',channel:'web',roles:['admin'],authenticated:true};
const fakeSystem={
  webIdentity:{authenticate:({sessionToken})=>sessionToken==='good'?principal:{subject:'anonymous',channel:'web',roles:[],authenticated:false}},
  getAdminSettings:{execute:({principal:p})=>{
    if(!p.authenticated) return {ok:false,error:{code:'UNAUTHENTICATED'}};
    if(!(p.roles||[]).includes('admin')) return {ok:false,error:{code:'FORBIDDEN'}};
    return {ok:true,data:{
      appName:'MTP6LineCoopBot',
      dbType:'sheets',
      expiryWarningDays:30,
      paymentReminderDays:14,
      webSessionTtlSeconds:28800,
      features:{liffEnabled:true,webhookConfigured:true,autoExpiryCheck:true}
    }};
  }}
};

const sandbox={
  Api:{},
  Composition:{SystemFactory:{createSystem:()=>fakeSystem}},
  Security:{Principal:{isAuthenticated:p=>!!(p&&p.authenticated)}},
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

let res=svc.handleRequest('POST','/api/web/admin/settings',{body:{sessionToken:'good'}});
if(!res.ok||res.data.dbType!=='sheets') throw new Error('admin settings endpoint failed');
const json=JSON.stringify(res.data);
for(const forbidden of ['API_KEY','CHANNEL_ACCESS_TOKEN','WEBHOOK_SECRET','LINE_LOGIN_CHANNEL_ID']){
  if(json.includes(forbidden)) throw new Error('secret/config identifier leaked: '+forbidden);
}

principal={subject:'web:staff',channel:'web',roles:['staff'],authenticated:true};
res=svc.handleRequest('POST','/api/web/admin/settings',{body:{sessionToken:'good'}});
if(res.ok||res.error.code!=='FORBIDDEN') throw new Error('staff must be denied');

res=svc.handleRequest('POST','/api/web/admin/settings',{body:{sessionToken:'bad'}});
if(res.ok||res.error.code!=='UNAUTHENTICATED') throw new Error('invalid session must fail closed');

res=svc.handleRequest('GET','/api/web/admin/settings',{body:{sessionToken:'good'}});
if(res.ok||res.error.code!=='METHOD_NOT_ALLOWED') throw new Error('admin settings must be POST-only');

const route=sandbox.Api.ApiRegistry.listRoutes().find(r=>r.path==='/api/web/admin/settings');
if(!route||route.auth!=='web-session'||route.method!=='POST') throw new Error('route metadata mismatch');

const webSrc=fs.readFileSync(path.join(root,'app','WebApp.js'),'utf8');
if(!webSrc.includes("path === '/api/web/admin/settings'")) throw new Error('WebApp route classification missing');

console.log('PASS  admin settings requires server Web session');
console.log('PASS  admin-only RBAC enforced');
console.log('PASS  settings response excludes secret material');
console.log('PASS  route is POST-only web-session authenticated');
console.log('=== WEB ADMIN SETTINGS API TESTS PASS (4/4) ===');
