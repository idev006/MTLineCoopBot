/**
 * @fileoverview Core.LoanRules
 * กฎการเตือนชำระหนี้ (payment reminders — การ์ด MT-13b, บทที่ 7 ระยะ 2)
 * Pure functions — เทสต์ใน node ได้โดยไม่ต้อง mock (ไม่มี SpreadsheetApp / LINE API)
 *
 * - getDueLoans(loans, now?, reminderDays?) — สัญญากู้ที่ถึงรอบเตือน
 * - buildLoanReminderText(loan, member, daysLeft) — ข้อความเตือนรายบุคคล
 * - isReminderTarget(member) — สมาชิกที่ส่งเตือนได้ (active + มี line_user_id)
 *
 * เกณฑ์ \"ถึงรอบเตือน\": due_dt อยู่ในช่วง [now, now + reminderDays] (ไม่รวมเลยกำหนดแล้ว)
 * เปรียบเทียบ string ตรง ๆ ตามมาตรฐาน yyyy-mm-dd — เรียงตามเวลาเสมอ
 */

var Core = Core || {};

Core.LoanRules = (() => {
  'use strict';

  /** จัดรูปแบบ Date เป็น yyyy-mm-dd (pure — กันการพึ่ง DataDict/timezone) */
  function fmtDate(d) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /**
   * จำนวนวันจาก due_dt ถึงตอนนี้ (ปัดขึ้น) — ใช้สำหรับข้อความ "อีก X วัน"
   * @param {string} dueDt - yyyy-mm-dd
   * @param {Date} now
   * @returns {number}
   */
  function daysUntil(dueDt, now) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const due = new Date(
      Number(dueDt.substring(0, 4)),
      Number(dueDt.substring(5, 7)) - 1,
      Number(dueDt.substring(8, 10))
    );
    return Math.round((due - d) / 86400000);
  }

  /**
   * กรองสัญญากู้ที่ถึงรอบเตือน (due_dt ∈ [now, now + reminderDays])
   * @param {Array<Object>} loans - รายการจาก t_loan_acct
   * @param {Date|string} [now]
   * @param {number} [reminderDays]
   * @returns {Array<{loan: Object, daysLeft: number}>}
   */
  function getDueLoans(loans, now, reminderDays) {
    const nowDate = now instanceof Date ? now : new Date(String(now || fmtDate(new Date())));
    const days = typeof reminderDays === 'number' ? reminderDays : 14;
    const nowStr = fmtDate(nowDate);
    const limit = new Date(nowDate.getTime() + days * 86400000);
    const limitStr = fmtDate(limit);

    return (loans || [])
      .filter((loan) => {
        if (!loan || !loan.due_dt) return false;
        const due = String(loan.due_dt);
        return due >= nowStr && due <= limitStr;
      })
      .map((loan) => ({ loan, daysLeft: daysUntil(String(loan.due_dt), nowDate) }));
  }

  /**
   * ข้อความเตือนชำระรายบุคคล (ใช้ชื่อสมาชิกจริง — ไม่ใช่ broadcast ข้อความเดียว)
   * @param {Object} loan - { loan_no, outstanding, due_dt }
   * @param {Object} member - { mem_title, mem_fname, mem_lname }
   * @param {number} daysLeft
   * @returns {string}
   */
  function buildLoanReminderText(loan, member, daysLeft) {
    const name = [member && member.mem_title, member && member.mem_fname, member && member.mem_lname]
      .filter(Boolean).join(' ') || 'สมาชิก';
    const outstanding = (Number(loan.outstanding) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const bar = '━━━━━━━━━━━━━━━━━';
    return [
      `💳 เตือนชำระหนี้ — คุณ${name}`,
      bar,
      `สัญญา: ${loan.loan_no}`,
      `ยอดคงค้าง: ${outstanding} บาท`,
      `ครบกำหนด: ${loan.due_dt} (อีก ${daysLeft} วัน)`,
      bar,
      'กรุณาชำระภายในกำหนด เพื่อรักษาเครดิตการกู้ยืม — ติดต่อสหกรณ์หากมีข้อสงสัย'
    ].join('\n');
  }

  /**
   * สมาชิกที่ส่งเตือนได้หรือไม่ (active + มี LINE userId — activated แล้ว)
   * @param {Object} member
   * @returns {boolean}
   */
  function isReminderTarget(member) {
    if (!member) return false;
    if (member.mem_status !== 'active') return false;
    if (!member.line_user_id) return false;
    return true;
  }

  return {
    getDueLoans,
    buildLoanReminderText,
    isReminderTarget,
    daysUntil
  };
})();
