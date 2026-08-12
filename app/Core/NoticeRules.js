/**
 * @fileoverview Core.NoticeRules
 * กฎการ Broadcast ประกาศ/ข่าวสาร (การ์ด MT-13 — บทที่ 7 ระยะ 2)
 * Pure functions — เทสต์ใน node ได้โดยไม่ต้อง mock (ไม่มี SpreadsheetApp / LINE API)
 *
 * - getPendingNotices(notices, now?) — กรองประกาศที่พร้อมส่ง
 * - buildNoticeText(notice)          — ข้อความ push (รูปแบบเดียวกับข้อความอื่นในระบบ)
 * - getBroadcastTargets(members)     — สมาชิกที่ควรได้รับ broadcast (active + มี line_user_id)
 *
 * เกณฑ์ "พร้อมส่ง": status='published' + ยังไม่มี sent_dt + published_dt <= ตอน broadcast
 * (เปรียบเทียบ string ตรง ๆ ตามมาตรฐาน yyyy-mm-dd HH:mm:ss — เรียงตามเวลาเสมอ)
 */

var Core = Core || {};

Core.NoticeRules = (() => {
  'use strict';

  /** จัดรูปแบบ Date เป็น yyyy-mm-dd HH:mm:ss (pure — กันการพึ่ง DataDict/timezone) */
  function fmtDateTime(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
      `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /**
   * กรองประกาศที่พร้อมส่ง (status='published' + ยังไม่เคยส่ง + ถึงเวลาแล้ว)
   * @param {Array<Object>} notices - รายการจาก t_notice
   * @param {Date|string} [now] - เวลาปัจจุบัน (default = new Date()) — ส่ง Date หรือ string ได้
   * @returns {Array<Object>}
   */
  function getPendingNotices(notices, now) {
    const nowStr = now instanceof Date ? fmtDateTime(now) : String(now || fmtDateTime(new Date()));
    return (notices || []).filter((n) => {
      if (!n) return false;
      if (n.status !== 'published') return false;
      if (n.sent_dt) return false; // ส่งแล้ว → ไม่ส่งซ้ำ
      if (n.published_dt && String(n.published_dt) > nowStr) return false; // ยังไม่ถึงเวลา
      return true;
    });
  }

  /**
   * สร้างข้อความ push ประกาศ (รูปแบบเดียวกับ Flex/ข้อความอื่น — ใช้กั้นบรรทัดเดียวกัน)
   * @param {Object} notice - { title, message, published_dt }
   * @returns {string}
   */
  function buildNoticeText(notice) {
    const bar = '━━━━━━━━━━━━━━━━━';
    const lines = ['📢 ประกาศสหกรณ์', bar];
    if (notice.title) lines.push(notice.title);
    if (notice.message) lines.push(notice.message);
    lines.push(bar);
    if (notice.published_dt) lines.push(`ประกาศเมื่อ: ${notice.published_dt}`);
    return lines.join('\n');
  }

  /**
   * สมาชิกที่ควรได้รับ broadcast — active + มี LINE userId (activated แล้ว)
   * @param {Array<Object>} members - รายการจาก t_member_mast
   * @returns {Array<Object>}
   */
  function getBroadcastTargets(members) {
    return (members || []).filter((m) => {
      if (!m) return false;
      if (m.mem_status !== 'active') return false;
      if (!m.line_user_id) return false;
      return true;
    });
  }

  return {
    getPendingNotices,
    buildNoticeText,
    getBroadcastTargets
  };
})();
