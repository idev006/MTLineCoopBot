/**
 * @fileoverview RichMenu.Gating
 * Per-User Rich Menu Gating (บทที่ 3.3.6):
 * - สมาชิกที่ valid → ผูก Member Menu (Tab 1) เป็นรายบุคคล
 * - ไม่ valid / ยังไม่ Activate → ใช้ default (Welcome Menu) — ไม่ผูก
 *
 * หมายเหตุ: กลไกนี้ควบคุมเฉพาะ UI — การอนุญาตจริงต้องตรวจที่ Server
 * (LineBot.EventHandler.getAuthorizedMember) เสมอ
 */

var RichMenu = RichMenu || {};

RichMenu.Gating = (() => {
  'use strict';

  /**
   * ผูก Member Menu (Tab 1) ให้สมาชิก — เรียกหลัง Activate สำเร็จ
   * @param {string} lineUserId
   * @param {string} token
   * @returns {boolean}
   */
  function linkMemberMenu(lineUserId, token) {
    if (!lineUserId || !token) {
      throw new Error('linkMemberMenu: ต้องระบุ lineUserId และ token');
    }
    const memberMenuId = RichMenu.ApiService.getRichMenuIdByAlias(Config.ALIAS.TAB_1, token);
    return RichMenu.ApiService.linkUser(lineUserId, memberMenuId, token);
  }

  /**
   * ยกเลิกการผูกเมนูสมาชิก — กลับไปใช้ default (Welcome Menu)
   * เรียกเมื่อสมาชิกหมดอายุ / ถูกเพิกถอน
   * @param {string} lineUserId
   * @param {string} token
   * @returns {boolean}
   */
  function unlinkMemberMenu(lineUserId, token) {
    if (!lineUserId || !token) {
      throw new Error('unlinkMemberMenu: ต้องระบุ lineUserId และ token');
    }
    return RichMenu.ApiService.unlinkUser(lineUserId, token);
  }

  /**
   * ยืนยันว่า Rich Menu ปัจจุบันของผู้ใช้เป็นเมนูสมาชิก (Tab 1) หรือไม่
   * @param {string} lineUserId
   * @param {string} token
   * @returns {boolean}
   */
  function hasMemberMenu(lineUserId, token) {
    const current = RichMenu.ApiService.getUserRichMenu(lineUserId, token);
    if (!current) return false; // ยังใช้ default อยู่ (welcome)
    const memberMenuId = RichMenu.ApiService.getRichMenuIdByAlias(Config.ALIAS.TAB_1, token);
    return current === memberMenuId;
  }

  return {
    linkMemberMenu,
    unlinkMemberMenu,
    hasMemberMenu
  };
})();
