#!/usr/bin/env node
'use strict';

const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={Ports:{},Security:{},Engine:{},Application:{},Date,Object,Array,Set,JSON,String,Number};
vm.createContext(sandbox);
for(const rel of [
  'app/Security/Principal.js',
  'app/Security/RoleCatalog.js',
  'app/Ports/ClockPort.js',
  'app/Ports/AuditPort.js',
  'app/Ports/MemberRepositoryPort.js',
  'app/Ports/StaffAdminRepositoryPort.js',
  'app/Engine/AuthorizationEngine.js',
  'app/Application/Web/AssignStaffRoleUseCase.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const members=[{mem_code:'A001',mem_role:'admin',_rowIndex:2},{mem_code:'S001',mem_role:'staff',_rowIndex:3}];
const memberRepository={
  findByLineUserId:()=>null,findByMemberCode:c=>members.find(m=>m.mem_code===c)||null,
  findByActivateCode:()=>null,activateMember:()=>null,saveActivation:()=>null,
  findSavingsByMember:()=>[],findLoansByMember:()=>[],findDividendsByMember:()=>[],
  logActivation:()=>null,listMembers:()=>members,logExpiry:()=>null,renewMember:()=>null,saveRenewal:()=>null,
  listNotices:()=>[],markNoticeSent:()=>false,listLoans:()=>[],logReminder:()=>null,getContent:()=>null
};
let saved=[];
const staffAdminRepository={saveRole:(rowIndex,role)=>{saved.push({rowIndex,role});return {memRole:role};}};
const events=[];
const audit={record:e=>{events.push({...e});return {ok:true};}};
const clock={now:()=>new Date('2026-09-08T08:00:00Z')};
const auth=sandbox.Engine.AuthorizationEngine.create();
const uc=sandbox.Application.Web.AssignStaffRoleUseCase.create({
  memberRepository,staffAdminRepository,clock,authorization:auth,audit,roleCatalog:sandbox.Security.RoleCatalog
});
const P=sandbox.Security.Principal;
const admin=P.create({subject:'web:A001',channel:'web',roles:['admin'],memberCode:'A001',authenticated:true});

let r=uc.execute({principal:admin,memberCode:'S001',role:'manager'});
if(!r.ok||!r.data.changed||saved.length!==1||saved[0].role!=='manager') throw new Error('role assignment failed');
if(events.length!==2||events[0].status!=='attempt'||events[1].status!=='success') throw new Error('audit lifecycle mismatch');

r=uc.execute({principal:admin,memberCode:'A001',role:'staff'});
if(r.ok||r.error.code!=='SELF_ROLE_CHANGE_FORBIDDEN') throw new Error('self role change must be denied');

r=uc.execute({principal:admin,memberCode:'S001',role:'superadmin'});
if(r.ok||r.error.code!=='VALIDATION') throw new Error('invalid role must reject');

const staff=P.create({subject:'web:S001',channel:'web',roles:['staff'],memberCode:'S001',authenticated:true});
r=uc.execute({principal:staff,memberCode:'S001',role:'manager'});
if(r.ok||r.error.code!=='FORBIDDEN') throw new Error('non-admin must be denied');

const noAudit=sandbox.Application.Web.AssignStaffRoleUseCase.create({
  memberRepository,staffAdminRepository,clock,authorization:auth,
  audit:{record:()=>{throw new Error('down');}},roleCatalog:sandbox.Security.RoleCatalog
});
const before=saved.length;
r=noAudit.execute({principal:admin,memberCode:'S001',role:'admin'});
if(r.ok||r.error.code!=='AUDIT_UNAVAILABLE'||saved.length!==before) throw new Error('audit-first guarantee failed');

console.log('PASS  admin role assignment with attempt/success audit');
console.log('PASS  self-change/invalid role/non-admin denied');
console.log('PASS  audit unavailable prevents persistence');
console.log('=== STAFF ROLE ASSIGNMENT TESTS PASS (3/3) ===');
