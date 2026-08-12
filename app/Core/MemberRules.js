/**
 * @fileoverview Core.MemberRules
 * กฎความถูกต้องของสมาชิก (pure functions — ไม่แตะ SpreadsheetApp/UrlFetchApp)
 *
 * เป็น Core/Business Logic (บทที่ 3.1.1, 3.2.4): เทสต์ได้ใน node โดยไม่ต้อง
 * mock service ใดๆ · รับค่า `now` เป็น parameter (optional) เพื่อให้ test
 * deterministic — production ใช้ค่า default new Date()
 */

var Core = Core || {};

Core.MemberRules = (() => {
  'use strict';

  /**
   * แปลงวันที่รูปแบบ yyyy-mm-dd[ HH:mm:ss] เป็น Date
   * (parse แบบ manual เพื่อกันปัญหา timezone ของ new Date(string))
   * @param {string|Date} value
   * @returns {Date|null}
   */
  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const m = String(value).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }

  /**
   * ตรวจว่าสมาชิก valid: สถานะ active + ช่วงเวลา [mem_eff_dt, mem_exp_dt] ครอบคลุม now
   * (ขอบเขตรวม: now >= mem_eff_dt และ now <= mem_exp_dt) — fail-safe เมื่อไม่มีวันครบ
   * @param {Object} member
   * @param {Date} [now] - เวลาอ้างอิง (default: เวลาจริง)
   * @returns {boolean}
   */
  function isActiveMember(member, now) {
    if (!member) return false;
    if (member.mem_status !== 'active') return false;
    const eff = parseDate(member.mem_eff_dt);
    const exp = parseDate(member.mem_exp_dt);
    // Fail-safe: ต้องมีวันเริ่มและวันหมดอายุครบทั้งคู่
    if (!eff || !exp) return false;
    const n = now || new Date();
    if (n < eff || n > exp) return false;
    return true;
  }

  /**
   * ตรวจว่าสมาชิก valid และมีบทบาทตรงตามที่กำหนด
   * @param {Object} member
   * @param {string} role - 'member' | 'staff' | 'admin'
   * @param {Date} [now]
   * @returns {boolean}
   */
  function hasRole(member, role, now) {
    return isActiveMember(member, now) && member.mem_role === role;
  }

  return {
    parseDate,
    isActiveMember,
    hasRole
  };
})();
