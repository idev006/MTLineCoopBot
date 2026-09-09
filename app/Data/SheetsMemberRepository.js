/**
 * @fileoverview Data.SheetsMemberRepository
 * Repository สมาชิกบน Google Sheets — ห่อ LineBot.SheetService
 *
 * การสลับฐานข้อมูล (Firestore/PostgreSQL) = เขียน adapter ใหม่ให้ผ่าน
 * Ports.MemberRepositoryPort แล้วให้ Composition.SystemFactory เลือกตาม DB_TYPE
 * โดยไม่ต้องแก้ Core/Handler
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
   * ค้นหาสมาชิกจากรหัสสมาชิก
   * @param {string} memberCode
   * @returns {Object|null}
   */
  function findByMemberCode(memberCode) {
    return LineBot.SheetService.findByMemberCode(memberCode);
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
   * Persist precomputed activation values.
   * Business date/status policy must be computed before calling this adapter.
   * @param {number} rowIndex
   * @param {Object} activation
   * @returns {Object}
   */
  function saveActivation(rowIndex, activation) {
    return LineBot.SheetService.saveActivation(rowIndex, activation);
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
   * ดึงสมาชิกทั้งหมด (MT-11 — scan วันหมดอายุ)
   * @returns {Array<Object>}
   */
  function listMembers() {
    return LineBot.SheetService.findAllMembers();
  }

  /**
   * Persist precomputed renewal values.
   * @param {number} rowIndex
   * @param {{memExpDt:string,memStatus:string}} renewal
   * @returns {Object}
   */
  function saveRenewal(rowIndex, renewal) {
    return LineBot.SheetService.saveRenewal(rowIndex, renewal);
  }

  /**
   * ดึงประกาศทั้งหมดจาก t_notice (MT-13)
   * @returns {Array<Object>}
   */
  function listNotices() {
    return LineBot.SheetService.listNotices();
  }

  /**
   * ทำเครื่องหมายประกาศว่าส่งแล้ว (กัน broadcast ซ้ำ — MT-13)
   * @param {string} noticeId
   * @param {Date|string} sentDt
   * @returns {boolean}
   */
  function markNoticeSent(noticeId, sentDt) {
    return LineBot.SheetService.markNoticeSent(noticeId, sentDt);
  }

  /**
   * ดึงสัญญากู้ทั้งหมดจาก t_loan_acct (MT-13b — เตือนชำระ)
   * @returns {Array<Object>}
   */
  function listLoans() {
    return LineBot.SheetService.findAllLoans();
  }

  /**
   * ดึงเนื้อหาเมนูจาก t_content (MT-14)
   * @param {string} key
   * @returns {string|null}
   */
  function getContent(key) {
    return LineBot.SheetService.findContent(key);
  }

  return {
    findByLineUserId,
    findByMemberCode,
    findByActivateCode,
    saveActivation,
    findSavingsByMember,
    findLoansByMember,
    findDividendsByMember,
    listMembers,
    saveRenewal,
    listNotices,
    markNoticeSent,
    listLoans,
    getContent
  };
})();
