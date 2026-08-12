/**
 * @fileoverview LineBot.MemberDataService
 * จัดรูปแบบข้อมูลสมาชิก (จาก MemberRepository) เป็นข้อความตอบกลับจริง
 *
 * - profile → ข้อมูลจริงจาก t_member_mast
 * - เมนูการเงิน → ข้อมูลจริงจาก t_savings_acct / t_loan_acct / t_dividend
 *   (การ์ด MT-27 — dummy data) ผ่าน financeData ที่ EventHandler ดึงจาก
 *   repository ส่งเข้ามา (ฟังก์ชันนี้เป็น pure — ทดสอบใน node ได้)
 *   ถ้าไม่มีข้อมูล → ตอบสถานะจริง "ไม่พบข้อมูล" (ไม่ปลอมตัวเลข)
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
   * จัดรูปแบบตัวเลขเป็นเงินไทย (เช่น 25,000.00)
   * @param {*} value
   * @returns {string}
   */
  function formatMoney(value) {
    const n = Number(value);
    if (isNaN(n)) return '0.00';
    const fixed = n.toFixed(2);
    const parts = fixed.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }

  /**
   * สร้างข้อความตอบกลับสำหรับเมนูการเงินจากข้อมูลจริง
   * (ตาราง t_savings_acct / t_loan_acct / t_dividend — การ์ด MT-27)
   * @param {string} item - item id ของเมนูการเงิน
   * @param {Object} member - member object
   * @param {Object} financeData - { savings: [], loans: [], dividends: [] }
   * @returns {string}
   */
  function buildFinanceText(item, member, financeData) {
    const caption = LineBot.ReplyStore.getCaption(item);
    const memberRef = (member && member.mem_code) ? ` (รหัส ${member.mem_code})` : '';
    const data = financeData || { savings: [], loans: [], dividends: [] };
    const header = `${caption}${memberRef}`;
    const footer = '━━━━━━━━━━━━━━━━━\nหากข้อมูลไม่ถูกต้อง กรุณาติดต่อสหกรณ์';

    if (item === 'saving_acct') {
      if (!data.savings || data.savings.length === 0) return noFinanceData(header, 'บัญชีเงินฝาก');
      const lines = data.savings.map(s =>
        `• ${s.acct_type || 'บัญชี'} (${s.acct_no}) : ${formatMoney(s.balance)} บาท`);
      const total = data.savings.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
      lines.push('━━━━━━━━━━━━━━━━━');
      lines.push(`รวมเงินฝาก: ${formatMoney(total)} บาท`);
      return [header, '━━━━━━━━━━━━━━━━━', ...lines, footer].join('\n');
    }

    if (item === 'chk_balance') {
      if (!data.savings || data.savings.length === 0) return noFinanceData(header, 'ยอดเงินฝาก');
      const total = data.savings.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
      return [
        header,
        '━━━━━━━━━━━━━━━━━',
        `ยอดเงินฝากรวม: ${formatMoney(total)} บาท`,
        `จำนวนบัญชี: ${data.savings.length} บัญชี`,
        footer
      ].join('\n');
    }

    if (item === 'loan_balance') {
      if (!data.loans || data.loans.length === 0) return noFinanceData(header, 'ยอดหนี้');
      const lines = data.loans.map(l => {
        const due = l.due_dt ? ` (ครบกำหนด ${l.due_dt})` : '';
        return `• ${l.loan_no}: ${formatMoney(l.outstanding)} บาท${due}`;
      });
      const total = data.loans.reduce((sum, l) => sum + (Number(l.outstanding) || 0), 0);
      lines.push('━━━━━━━━━━━━━━━━━');
      lines.push(`รวมหนี้คงค้าง: ${formatMoney(total)} บาท`);
      return [header, '━━━━━━━━━━━━━━━━━', ...lines, footer].join('\n');
    }

    if (item === 'dividends') {
      if (!data.dividends || data.dividends.length === 0) return noFinanceData(header, 'เงินปันผล');
      const lines = data.dividends.map(d =>
        `• ปี ${d.year}: ปันผล ${formatMoney(d.dividend_amt)} บาท`);
      return [header, '━━━━━━━━━━━━━━━━━', ...lines, footer].join('\n');
    }

    if (item === 'share_capital') {
      if (!data.dividends || data.dividends.length === 0) return noFinanceData(header, 'เงินหุ้น');
      const latest = data.dividends.reduce((a, b) => (Number(b.year) > Number(a.year) ? b : a));
      return [
        header,
        '━━━━━━━━━━━━━━━━━',
        `เงินหุ้น/ทุนเรือนหุ้น (ล่าสุด ปี ${latest.year}): ${formatMoney(latest.share_capital)} บาท`,
        footer
      ].join('\n');
    }

    return noFinanceData(header, 'ข้อมูลการเงิน');
  }

  /**
   * ข้อความเมื่อไม่มีข้อมูล (ตอบสถานะจริง — ไม่ปลอมตัวเลข)
   * @param {string} header
   * @param {string} label - ชื่อข้อมูล
   * @returns {string}
   */
  function noFinanceData(header, label) {
    return [
      header,
      '━━━━━━━━━━━━━━━━━',
      `ไม่พบข้อมูล${label}สำหรับรหัสสมาชิกนี้`,
      '— หากเป็นสมาชิก กรุณาติดต่อสหกรณ์เพื่อตรวจสอบข้อมูล',
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
    formatMoney,
    FINANCIAL_ITEMS
  };
})();
