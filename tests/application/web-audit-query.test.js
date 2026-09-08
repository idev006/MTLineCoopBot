#!/usr/bin/env node
'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Ports:{},Security:{},Engine:{},Application:{},Date,Object,Array,Set,JSON,String,Number};
vm.createContext(sandbox);
for(const rel of [
 'app/Security/Principal.js',
 'app/Ports/AuditQueryPort.js',
 'app/Engine/AuthorizationEngine.js',
 'app/Application/Web/GetAuditLogUseCase.js'
]){
 vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}
const auth=sandbox.Engine.AuthorizationEngine.create();
const auditQuery={list:()=>[
 {type:'activation',log_id:'A1',mem_code:'M1',line_user_id:'U1',activate_code:'SECRET',status:'success',activated_dt:'2026-09-08 10:00:00'},
 {type:'expiry',log_id:'E1',mem_code:'M2',line_user_id:'U2',status:'expiring',days_left:7,mem_exp_dt:'2026-09-15',checked_dt:'2026-09-08 09:00:00'}
]};
const uc=sandbox.Application.Web.GetAuditLogUseCase.create({auditQuery,authorization:auth});
const p=role=>sandbox.Security.Principal.create({subject:'web:'+role,channel:'web',roles:[role],authenticated:true});
const ok=uc.execute({principal:p('admin'),type:'all'});
if(!ok.ok||ok.data.logs.length!==2) throw new Error('admin query failed');
const json=JSON.stringify(ok.data);
if(json.includes('SECRET')||json.includes('line_user_id')||json.includes('activate_code')||json.includes('U1')) throw new Error('sensitive audit data leaked');
const denied=uc.execute({principal:p('staff')});
if(denied.ok||denied.error.code!=='FORBIDDEN') throw new Error('staff must be denied');
const invalid=uc.execute({principal:p('admin'),type:'bad'});
if(invalid.ok||invalid.error.code!=='VALIDATION') throw new Error('type validation failed');
console.log('PASS  admin-only audit query');
console.log('PASS  audit projection removes sensitive identity/activation fields');
console.log('PASS  invalid type rejected');
console.log('=== WEB AUDIT QUERY TESTS PASS (3/3) ===');
