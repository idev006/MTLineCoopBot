/**
 * @fileoverview Security.RoleCatalog
 * Canonical role vocabulary and presentation-safe metadata.
 */
var Security = Security || {};

Security.RoleCatalog = (() => {
  'use strict';

  const ROLES = Object.freeze([
    Object.freeze({
      id:'member',
      label:'Member',
      description:'สมาชิกทั่วไป ใช้งานข้อมูลและบริการของตนเอง',
      assignableToStaff:false,
      capabilities:Object.freeze(['member-self-service'])
    }),
    Object.freeze({
      id:'staff',
      label:'Staff',
      description:'เจ้าหน้าที่ปฏิบัติงานสมาชิกและรายงานตามสิทธิ์ที่ระบบอนุญาต',
      assignableToStaff:true,
      capabilities:Object.freeze(['member-read','member-renew','reports-read'])
    }),
    Object.freeze({
      id:'manager',
      label:'Manager',
      description:'ผู้ควบคุมงานที่ใช้ขอบเขตปฏิบัติงานสมาชิกและรายงานระดับเดียวกับ operational management',
      assignableToStaff:true,
      capabilities:Object.freeze(['member-read','member-renew','reports-read'])
    }),
    Object.freeze({
      id:'admin',
      label:'Admin',
      description:'ผู้ดูแลระบบ มีสิทธิ์ admin-only reads และงานบริหารที่เปิดใช้งาน',
      assignableToStaff:true,
      capabilities:Object.freeze([
        'member-read','member-renew','reports-read',
        'admin-settings-read','admin-audit-read','admin-staff-read','admin-role-catalog-read'
      ])
    })
  ]);

  function list() {
    return ROLES.map(r => ({
      id:r.id,
      label:r.label,
      description:r.description,
      assignableToStaff:r.assignableToStaff,
      capabilities:Array.from(r.capabilities)
    }));
  }

  function ids() {
    return ROLES.map(r => r.id);
  }

  function staffRoleIds() {
    return ROLES.filter(r => r.assignableToStaff).map(r => r.id);
  }

  function has(role) {
    return ids().includes(String(role || ''));
  }

  return Object.freeze({ list, ids, staffRoleIds, has });
})();
