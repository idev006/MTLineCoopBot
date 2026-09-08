#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Security:{},Engine:{},Application:{},Date,Object,Array,Set,JSON,String,Number};
vm.createContext(sandbox);
for(const rel of [
 'app/Security/Principal.js',
 'app/Ports/ConfigPort.js',
 'app/Engine/AuthorizationEngine.js',
 'app/Application/Web/GetAdminSettingsUseCase.js'
]){
 vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}
const auth=sandbox.Engine.AuthorizationEngine.create();
const config={get:()=>({
 DB_TYPE:'sheets',
 EXPIRY_WARNING_DAYS:30,
 PAYMENT_REMINDER_DAYS:14,
 WEB_SESSION_TTL_SECONDS:28800,
 LINE_LOGIN_CHANNEL_ID:'123',
 WEBHOOK_SECRET:'super-secret',
 API_KEY:'browser-secret',
 CHANNEL_ACCESS_TOKEN:'line-secret'
})};
const uc=sandbox.Application.Web.GetAdminSettingsUseCase.create({config,authorization:auth});
const principal=role=>sandbox.Security.Principal.create({subject:'web:'+role,channel:'web',roles:[role],authenticated:true});
const ok=uc.execute({principal:principal('admin')});
if(!ok.ok||ok.data.dbType!=='sheets'||ok.data.webSessionTtlSeconds!==28800) throw new Error('admin settings read failed');
const json=JSON.stringify(ok.data);
for(const secret of ['super-secret','browser-secret','line-secret']){
 if(json.includes(secret)) throw new Error('secret leaked: '+secret);
}
const staff=uc.execute({principal:principal('staff')});
if(staff.ok||staff.error.code!=='FORBIDDEN') throw new Error('staff must be denied');
const anon=uc.execute({principal:sandbox.Security.Principal.anonymous('web')});
if(anon.ok||anon.error.code!=='UNAUTHENTICATED') throw new Error('anonymous must be denied');
console.log('PASS  admin-only settings read');
console.log('PASS  settings projection excludes secrets');
console.log('PASS  staff/anonymous denied server-side');
console.log('=== WEB ADMIN SETTINGS TESTS PASS (3/3) ===');
