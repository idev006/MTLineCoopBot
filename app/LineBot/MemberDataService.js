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
   * ไอคอนของเมนูการเงิน (ใช้ใน Flex Card — การ์ด MT-34)
   */
  const FINANCIAL_ICONS = {
    saving_acct: '💰',
    chk_balance: '💳',
    loan_balance: '💳',
    dividends: '📈',
    share_capital: '📈'
  };

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
      ...(hasValue(member.mem_kk) ? [`คะแนนความดี: ${member.mem_kk}`] : []),
      ...(hasValue(member.mem_bk) ? [`เงินกู้คงค้าง: ${formatMoney(member.mem_bk)} บาท`] : []),
      ...(hasValue(member.mem_bh) ? [`เงินหุ้น: ${formatMoney(member.mem_bh)} บาท`] : []),
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
   * ตรวจว่าค่ามีอยู่จริง (ไม่ใช่ undefined / null / '') — ใช้ตัดสินใจแสดงฟิลด์
   * @param {*} value
   * @returns {boolean}
   */
  function hasValue(value) {
    return value !== undefined && value !== null && value !== '';
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
   * สร้างข้อมูลสำหรับ Flex Card เมนูการเงิน (การ์ด MT-34)
   * ข้อมูลเหมือน buildFinanceText — rows/total/noData (ไม่ปลอมตัวเลข)
   * @param {string} item - item id ของเมนูการเงิน
   * @param {Object} member - member object
   * @param {Object} financeData - { savings: [], loans: [], dividends: [] }
   * @returns {Object} { title, icon, memberCode, rows: [{label,value}], total: {label,value}|null, noData: {message}|null }
   */
  function buildFinanceCardData(item, member, financeData) {
    const caption = LineBot.ReplyStore.getCaption(item);
    const data = financeData || { savings: [], loans: [], dividends: [] };
    const base = {
      title: caption,
      icon: FINANCIAL_ICONS[item] || '💼',
      memberCode: (member && member.mem_code) || '',
      rows: [],
      total: null,
      noData: null
    };

    if (item === 'saving_acct') {
      if (!data.savings || data.savings.length === 0) return noDataCard(base, 'บัญชีเงินฝาก');
      base.rows = data.savings.map(s => ({
        label: `${s.acct_type || 'บัญชี'} (${s.acct_no})`,
        value: `${formatMoney(s.balance)} บาท`
      }));
      const total = data.savings.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
      base.total = { label: 'รวมเงินฝาก', value: `${formatMoney(total)} บาท` };
      return base;
    }

    if (item === 'chk_balance') {
      if (!data.savings || data.savings.length === 0) return noDataCard(base, 'ยอดเงินฝาก');
      const total = data.savings.reduce((sum, s) => sum + (Number(s.balance) || 0), 0);
      base.rows = [{ label: 'จำนวนบัญชี', value: `${data.savings.length} บัญชี` }];
      base.total = { label: 'ยอดเงินฝากรวม', value: `${formatMoney(total)} บาท` };
      return base;
    }

    if (item === 'loan_balance') {
      if (!data.loans || data.loans.length === 0) return noDataCard(base, 'ยอดหนี้');
      base.rows = data.loans.map(l => ({
        label: l.loan_no || '-',
        value: `${formatMoney(l.outstanding)} บาท${l.due_dt ? ' (ครบกำหนด ' + l.due_dt + ')' : ''}`
      }));
      const total = data.loans.reduce((sum, l) => sum + (Number(l.outstanding) || 0), 0);
      base.total = { label: 'รวมหนี้คงค้าง', value: `${formatMoney(total)} บาท` };
      return base;
    }

    if (item === 'dividends') {
      if (!data.dividends || data.dividends.length === 0) return noDataCard(base, 'เงินปันผล');
      base.rows = data.dividends.map(d => ({
        label: `ปี ${d.year}`,
        value: `ปันผล ${formatMoney(d.dividend_amt)} บาท`
      }));
      return base;
    }

    if (item === 'share_capital') {
      if (!data.dividends || data.dividends.length === 0) return noDataCard(base, 'เงินหุ้น');
      const latest = data.dividends.reduce((a, b) => (Number(b.year) > Number(a.year) ? b : a));
      base.rows = [{
        label: `เงินหุ้น/ทุนเรือนหุ้น (ล่าสุด ปี ${latest.year})`,
        value: `${formatMoney(latest.share_capital)} บาท`
      }];
      return base;
    }

    return noDataCard(base, 'ข้อมูลการเงิน');
  }

  /**
   * ค่าที่คืนเมื่อไม่มีข้อมูล (ตอบสถานะจริง — ไม่ปลอมตัวเลข)
   * @param {Object} base
   * @param {string} label - ชื่อข้อมูล
   * @returns {Object}
   */
  function noDataCard(base, label) {
    return { ...base, noData: { label: label, message: `ไม่พบข้อมูล${label}สำหรับรหัสสมาชิกนี้` } };
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
   * สร้างข้อความเตือนวันหมดอายุ (การ์ด MT-11)
   * คืน '' ถ้าไม่ควรเตือน (สถานะ valid / ไม่มีข้อมูล)
   * @param {Object} member
   * @param {Object} expiry - { status, daysLeft } จาก Core.MemberRules.getExpiryStatus
   * @returns {string}
   */
  function buildExpiryWarning(member, expiry) {
    if (!expiry || !member) return '';
    const name = [member.mem_title, member.mem_fname, member.mem_lname].filter(Boolean).join(' ') || 'สมาชิก';
    if (expiry.status === 'expiring') {
      return `⚠️ สิทธิ์การใช้งานของ ${name} จะหมดอายุในอีก ${expiry.daysLeft} วัน (วันที่ ${member.mem_exp_dt}) — กรุณาติดต่อสหกรณ์เพื่อต่ออายุ`;
    }
    if (expiry.status === 'expired') {
      return `⚠️ สิทธิ์การใช้งานของ ${name} หมดอายุแล้ว (วันที่ ${member.mem_exp_dt}) — กรุณาติดต่อสหกรณ์เพื่อต่ออายุ`;
    }
    return '';
  }

  /**
   * แนบคำเตือนวันหมดอายุท้ายข้อความ (ใช้ตอนตอบกลับ — การ์ด MT-11)
   * @param {string} text - ข้อความเดิม
   * @param {Object} member
   * @param {Object} [expiry] - { status, daysLeft }
   * @returns {string}
   */
  function appendExpiryWarning(text, member, expiry) {
    const warn = buildExpiryWarning(member, expiry);
    if (!warn) return text;
    return text + '\n━━━━━━━━━━━━━━━━━\n' + warn;
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
    buildFinanceCardData,
    buildExpiryWarning,
    appendExpiryWarning,
    isFinancialItem,
    formatMoney,
    FINANCIAL_ITEMS
  };
})();
