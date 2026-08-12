/**
 * @fileoverview LineBot.MemberDataService
 * จัดรูปแบบข้อมูลสมาชิก (จาก MemberRepository) เป็นข้อความตอบกลับจริง
 *
 * หมายเหตุสำคัญ (การ์ด MT-10, 2026-08-12):
 * ตาราง t_member_mast มีเฉพาะข้อมูลสมาชิก + คะแนน (13 คอลัมน์) —
 * ยังไม่มีข้อมูลการเงิน (เงินฝาก/หนี้/ปันผล) ซึ่งต้องใช้ตารางใหม่
 * (t_savings_acct / t_loan_acct / t_dividend — ออกแบบไว้ 📌)
 * ดังนั้น:
 * - profile → แสดงข้อมูลจริงจาก t_member_mast
 * - เมนูการเงิน → ตอบแจ้งสถานะชัดเจน (ไม่เดา/ไม่ปลอมข้อมูล) + เตรียม
 *   code path ไว้พร้อมเชื่อมตารางใหม่ในอนาคต
 */

var LineBot = LineBot || {};

LineBot.MemberDataService = (() => {
  'use strict';

  /**
   * เมนูที่ต้องใช้ข้อมูลการเงิน (ยังไม่มีตาราง — ตอบ "ยังไม่เชื่อมต่อ")
   */
  const FINANCIAL_ITEMS = ['saving_acct', 'chk_balance', 'dividends', 'share_capital', 'loan_balance'];

  /**
   * สร้างข้อความโปรไฟล์สมาชิกจากข้อมูลจริง
   * @param {Object} member - member object จาก repository
   * @returns {string}
   */
  function buildProfileText(member) {
    if (!member) return 'ไม่พบข้อมูลสมาชิก';
    const name = [member.mem_title, member.mem_fname, member.mem_lname].filter(Boolean).join(' ');
    const lines = [
      '👤 ข้อมูลส่วนตัว',
      '━━━━━━━━━━━━━━━━━',
      `ชื่อ: ${name || '-'}`,
      `รหัสสมาชิก: ${member.mem_code || '-'}`,
      `บทบาท: ${member.mem_role || 'member'}`,
      `ตำแหน่ง: ${member.mem_position || '-'}${member.mem_position_score ? ' (คะแนน ' + member.mem_position_score + ')' : ''}`,
      `คะแนนสมาชิก: ${member.mem_rank_score || '-'}`,
      `สถานะ: ${member.mem_status || '-'}`
    ];
    if (member.mem_eff_dt && member.mem_exp_dt) {
      lines.push(`สิทธิ์ใช้งาน: ${member.mem_eff_dt} → ${member.mem_exp_dt}`);
    } else if (member.mem_eff_dt) {
      lines.push(`วันที่มีผล: ${member.mem_eff_dt}`);
    }
    lines.push('━━━━━━━━━━━━━━━━━');
    lines.push('หากข้อมูลไม่ถูกต้อง กรุณาติดต่อสหกรณ์');
    return lines.join('\n');
  }

  /**
   * สร้างข้อความตอบกลับสำหรับเมนูการเงิน
   * ตารางข้อมูลการเงินยังไม่มี (t_savings_acct / t_loan_acct / t_dividend) —
   * ตอบสถานะจริงและบอกวิธีติดต่อ แทนการปลอมตัวเลข
   * @param {string} item - item id ของเมนูการเงิน
   * @param {Object} member - member object (สำหรับเตรียมพร้อมเชื่อมข้อมูลในอนาคต)
   * @returns {string}
   */
  function buildFinanceText(item, member) {
    const caption = LineBot.ReplyStore.getCaption(item);
    const memberRef = (member && member.mem_code) ? ` (รหัส ${member.mem_code})` : '';
    return [
      `${caption}${memberRef}`,
      '━━━━━━━━━━━━━━━━━',
      'ระบบยังไม่เชื่อมต่อข้อมูลการเงินของสมาชิก',
      '— ข้อมูลนี้จะพร้อมใช้งานเมื่อเชื่อมต่อตารางข้อมูลการเงินแล้ว (ดูบทที่ 7)',
      '━━━━━━━━━━━━━━━━━',
      'ติดต่อสหกรณ์: โทร. XXX-XXX-XXXX'
    ].join('\n');
  }

  /**
   * ตรวจว่าเป็นเมนูการเงินหรือไม่
   * @param {string} item
   * @returns {boolean}
   */
  function isFinancialItem(item) {
    return FINANCIAL_ITEMS.includes(item);
  }

  return {
    buildProfileText,
    buildFinanceText,
    isFinancialItem,
    FINANCIAL_ITEMS
  };
})();
