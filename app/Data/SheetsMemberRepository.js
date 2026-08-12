/**
 * @fileoverview Data.SheetsMemberRepository
 * Repository สมาชิกบน Google Sheets — ห่อ LineBot.SheetService
 *
 * การสลับฐานข้อมูล (Firestore/PostgreSQL) = เขียน repository ใหม่ตามสัญญา
 * Data.MemberRepository (บทที่ 3.2.4) แล้วเปลี่ยน Config.DB_TYPE — ไม่ต้อง
 * แก้ Core/Handler แต่อย่างใด
 *
 * หมายเหตุ: SpreadsheetApp ถูกจำกัดอยู่ใน layer นี้เท่านั้น (ผ่าน SheetService)
 */

var Data = Data || {};

Data.SheetsMemberRepository = (() => {
  'use strict';

  /**
   * ค้นหาสมาชิกจาก LINE userId
   * @param {string} lineUserId
   * @returns {Object|null} member object หรือ null
   */
  function findByLineUserId(lineUserId) {
    return LineBot.SheetService.findByLineUserId(lineUserId);
  }

  /**
   * ค้นหาสมาชิกจาก activate code
   * @param {string} activateCode
   * @returns {Object|null} member object (มี _rowIndex) หรือ null
   */
  function findByActivateCode(activateCode) {
    return LineBot.SheetService.findByActivateCode(activateCode);
  }

  /**
   * ลงทะเบียน activate สมาชิก (เขียน mem_eff_dt/mem_exp_dt/mem_status/line_user_id)
   * @param {number} rowIndex
   * @param {string} lineUserId
   * @returns {Object} { memEffDt, memExpDt }
   */
  function activateMember(rowIndex, lineUserId) {
    return LineBot.SheetService.activateMember(rowIndex, lineUserId);
  }

  /**
   * ตรวจว่าสมาชิก valid หรือไม่ (ช่วงวัน + สถานะ — บทที่ 3.7.2)
   * @param {Object} member
   * @returns {boolean}
   */
  function isActiveMember(member) {
    return LineBot.SheetService.isActiveMember(member);
  }

  /**
   * ตรวจบทบาทสมาชิก
   * @param {Object} member
   * @param {string} role - member / staff / admin
   * @returns {boolean}
   */
  function hasRole(member, role) {
    return LineBot.SheetService.hasRole(member, role);
  }

  /**
   * ดึงบัญชีเงินฝากของสมาชิก (MT-27)
   * @param {string} memCode
   * @returns {Array<Object>}
   */
  function findSavingsByMember(memCode) {
    return LineBot.SheetService.findSavingsByMember(memCode);
  }

  /**
   * ดึงบัญชีหนี้เงินกู้ของสมาชิก (MT-27)
   * @param {string} memCode
   * @returns {Array<Object>}
   */
  function findLoansByMember(memCode) {
    return LineBot.SheetService.findLoansByMember(memCode);
  }

  /**
   * ดึงเงินปันผล/หุ้นของสมาชิก (MT-27)
   * @param {string} memCode
   * @returns {Array<Object>}
   */
  function findDividendsByMember(memCode) {
    return LineBot.SheetService.findDividendsByMember(memCode);
  }

  /**
   * บันทึกเหตุการณ์ Activate (MT-27)
   * @param {Object} entry
   * @returns {Object} { log_id, status }
   */
  function logActivation(entry) {
    return LineBot.SheetService.logActivation(entry);
  }

  /**
   * ดึงสมาชิกทั้งหมด (MT-11 — scan วันหมดอายุ)
   * @returns {Array<Object>}
   */
  function listMembers() {
    return LineBot.SheetService.findAllMembers();
  }

  /**
   * บันทึกผลการตรวจวันหมดอายุ (MT-32)
   * @param {Object} entry - { memCode, lineUserId, status, daysLeft, memExpDt }
   * @returns {Object} { log_id, status }
   */
  function logExpiry(entry) {
    return LineBot.SheetService.appendExpiryLog(entry);
  }

  /**
   * ต่ออายุสมาชิก (MT-12): เขียน mem_exp_dt ใหม่ + สถานะ active
   * @param {number} rowIndex
   * @param {string} newExpDt - yyyy-mm-dd
   * @param {string} [lineUserId]
   * @returns {Object} { memExpDt, memStatus }
   */
  function renewMember(rowIndex, newExpDt, lineUserId) {
    return LineBot.SheetService.renewMember(rowIndex, newExpDt, lineUserId);
  }

  return {
    findByLineUserId,
    findByActivateCode,
    activateMember,
    isActiveMember,
    hasRole,
    findSavingsByMember,
    findLoansByMember,
    findDividendsByMember,
    logActivation,
    listMembers,
    logExpiry,
    renewMember
  };
})();
