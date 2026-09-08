#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');
const sandbox={Security:{},Engine:{},Application:{},Date,Object,Array,Set,JSON,String};
vm.createContext(sandbox);
for(const rel of [
  'app/Security/Principal.js',
  'app/Security/RoleCatalog.js',
  'app/Engine/AuthorizationEngine.js',
  'app/Application/Web/GetRoleCatalogUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const catalog=sandbox.Security.RoleCatalog;
if(JSON.stringify(catalog.ids())!==JSON.stringify(['member','staff','manager','admin'])) {
  throw new Error('canonical role order/vocabulary mismatch');
}
if(JSON.stringify(catalog.staffRoleIds())!==JSON.stringify(['staff','manager','admin'])) {
  throw new Error('staff-assignable role vocabulary mismatch');
}
if(!catalog.has('manager')||catalog.has('superadmin')) throw new Error('role membership contract failed');

const auth=sandbox.Engine.AuthorizationEngine.create();
const uc=sandbox.Application.Web.GetRoleCatalogUseCase.create({authorization:auth,roleCatalog:catalog});
const P=sandbox.Security.Principal;
const admin=P.create({subject:'web:admin',channel:'web',roles:['admin'],authenticated:true});
const ok=uc.execute({principal:admin});
if(!ok.ok||ok.data.roles.length!==4) throw new Error('admin role catalog read failed');
if(ok.data.roles.some(r=>r.id==='member'&&r.assignableToStaff!==false)) throw new Error('member staff-assignability mismatch');

const staff=P.create({subject:'web:staff',channel:'web',roles:['staff'],authenticated:true});
const denied=uc.execute({principal:staff});
if(denied.ok||denied.error.code!=='FORBIDDEN') throw new Error('non-admin must be denied');

console.log('PASS  canonical role vocabulary is centralized');
console.log('PASS  staff-assignable roles are explicit');
console.log('PASS  admin-only role catalog read');
console.log('=== ROLE CATALOG TESTS PASS (3/3) ===');
