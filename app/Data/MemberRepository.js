/**
 * @fileoverview Data.MemberRepository
 * สัญญา (interface) ของ Repository สมาชิก + factory สำหรับเลือกฐานข้อมูล
 *
 * ออกแบบตาม Repository Pattern (บทที่ 3.2.4):
 * - Core/Business Logic เรียกผ่าน interface นี้เท่านั้น — ไม่รู้ว่าข้อมูลเก็บที่ไหน
 * - เปลี่ยนฐานข้อมูล = เขียน repository ใหม่ + เปลี่ยนค่า DB_TYPE ใน Script Properties
 *
 * สัญญาที่ทุก implementation ต้องมี:
 * - findByLineUserId(lineUserId) → member|null
 * - findByActivateCode(code)     → member|null (มี _rowIndex)
 * - activateMember(rowIndex, lineUserId) → { memEffDt, memExpDt }
 * - isActiveMember(member)       → boolean (กฎความ valid — จะย้ายไป Core ในเฟส 3)
 * - hasRole(member, role)        → boolean
 */

var Data = Data || {};

Data.MemberRepository = (() => {
  'use strict';

  const INTERFACE = ['findByLineUserId', 'findByActivateCode', 'activateMember', 'isActiveMember', 'hasRole'];

  /**
   * ตรวจว่า repository ครบตามสัญญา (interface) หรือไม่
   * @param {Object} repo
   * @returns {Object} repo เดิมถ้าครบ / throw ถ้าขาด
   */
  function assertImplemented(repo) {
    const missing = INTERFACE.filter(name => typeof repo[name] !== 'function');
    if (missing.length > 0) {
      throw new Error('MemberRepository ขาดฟังก์ชันตามสัญญา: ' + missing.join(', '));
    }
    return repo;
  }

  /**
   * factory — เลือก repository ตาม Config.DB_TYPE
   * 'sheets' (ค่า default) → Data.SheetsMemberRepository
   * 'firestore'           → ยังไม่ได้ implement (อนาคต)
   * @returns {Object} repository ตามสัญญา
   */
  function getRepository() {
    const cfg = Config.get();
    const type = (cfg.DB_TYPE || 'sheets').toLowerCase();
    if (type === 'firestore') {
      throw new Error('DB_TYPE=firestore ยังไม่ได้ implement — ดู Roadmap ระยะที่ 3 (การ์ด MT-15/MT-20b)');
    }
    return assertImplemented(Data.SheetsMemberRepository);
  }

  return {
    getRepository,
    assertImplemented
  };
})();
