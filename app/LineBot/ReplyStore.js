/**
 * @fileoverview LineBot.ReplyStore
 * เก็บข้อความตอบกลับสำหรับแต่ละเมนู แยกตาม Tab เพื่อให้ขยายและแก้ไขง่าย
 *
 * IMPORTANT: key ของ CAPTIONS และ TAB_1..TAB_5 ต้องตรงกับ item id
 * ที่กำหนดใน RichMenu/MenuData.js (postback data: action=menu_item&item=<id>)
 * หากเพิ่มเมนูใหม่ ต้องเพิ่ม key ให้ครบทั้งสองไฟล์
 */

var LineBot = LineBot || {};

LineBot.ReplyStore = (() => {
  'use strict';

  // =====================================================
  // ข้อความตอบกลับ แยกตามแท็บ (key = item id ใน MenuData)
  // =====================================================

  // Tab 1: ข้อมูลส่วนตัว
  const TAB_1 = {
    saving_acct: 'กำลังดึงข้อมูลบัญชีเงินฝากของท่าน...',
    chk_balance: 'กำลังตรวจสอบยอดคงเหลือของท่าน...',
    dividends: 'กำลังดึงข้อมูลเงินปันผลของท่าน...',
    share_capital: 'กำลังดึงข้อมูลทุนเรือนหุ้นของท่าน...',
    profile: 'ข้อมูลส่วนตัวของท่าน: (ยังไม่มีข้อมูลให้แสดง)',
    chg_password: 'พิมพ์รหัสผ่านใหม่ที่ต้องการเปลี่ยน...'
  };

  // Tab 2: เงินกู้ & สวัสดิการ
  const TAB_2 = {
    loan_apply: 'เริ่มขั้นตอนยื่นขอกู้ — กรุณากรอกแบบฟอร์ม...',
    loan_balance: 'กำลังดึงข้อมูลยอดหนี้เงินกู้ของท่าน...',
    loan_calc: 'เปิดเครื่องคำนวณสินเชื่อ: https://idev006.github.io/MTP6LineCoopBot/loan_calculator.html',
    calc_install: 'พิมพ์ยอดเงินกู้ที่ต้องการคำนวณ เช่น "คำนวณ 100000"',
    welfare: 'ข้อมูลสวัสดิการสมาชิก: (ยังไม่มีข้อมูล)',
    emergency: 'ข้อมูลเงินกู้ฉุกเฉิน — เงื่อนไขและวงเงิน...'
  };

  // Tab 3: ข่าวสารสหกรณ์
  const TAB_3 = {
    news_pr: 'ข่าวประชาสัมพันธ์: (ยังไม่มีข้อมูล)',
    activities: 'ข่าวกิจกรรม: (ยังไม่มีข้อมูล)',
    announce: 'ประกาศสหกรณ์: (ยังไม่มีข้อมูล)',
    about_coop: 'ข้อมูลเกี่ยวกับสหกรณ์: (ยังไม่มีข้อมูล)',
    perf_report: 'ผลการดำเนินงาน: (ยังไม่มีข้อมูล)'
  };

  // Tab 4: เอกสาร & คู่มือ
  const TAB_4 = {
    manual: 'คู่มือสมาชิก: (ยังไม่มีข้อมูล)',
    dl_forms: 'แบบฟอร์มดาวน์โหลด: (ยังไม่มีข้อมูล)',
    rules: 'ระเบียบและข้อบังคับ: (ยังไม่มีข้อมูล)',
    annual_report: 'รายงานประจำปี: (ยังไม่มีข้อมูล)'
  };

  // Tab 5: ติดต่อเรา
  const TAB_5 = {
    contact_coop: 'ติดต่อสหกรณ์ได้ที่ โทร. XXX-XXX-XXXX',
    contact_staff: 'ติดต่อเจ้าหน้าที่สหกรณ์ได้ที่ โทร. XXX-XXX-XXXX',
    office_loc: 'ที่ตั้งสำนักงาน: (ยังไม่มีข้อมูล)',
    faq: 'คำถามที่พบบ่อย: (ยังไม่มีข้อมูล)',
    feedback: 'แจ้งปัญหา/ร้องเรียน: กรุณาระบุรายละเอียด...'
  };

  // =====================================================
  // ชื่อเมนูภาษาไทย (caption) — key ต้องตรงกับ item id ใน MenuData
  // =====================================================
  const CAPTIONS = {
    // Tab 1
    saving_acct: 'บัญชีเงินฝาก',
    chk_balance: 'เช็คยอดเงิน',
    dividends: 'เงินปันผล',
    share_capital: 'ทุนเรือนหุ้น',
    profile: 'ข้อมูลส่วนตัว',
    chg_password: 'เปลี่ยนรหัสผ่าน',
    // Tab 2
    loan_apply: 'ยื่นคำขอกู้',
    loan_balance: 'ยอดเงินกู้คงเหลือ',
    loan_calc: 'เครื่องคำนวณเงินกู้',
    calc_install: 'คำนวณเงินผ่อนชำระ',
    welfare: 'สวัสดิการสมาชิก',
    emergency: 'กองทุนฉุกเฉิน',
    // Tab 3
    news_pr: 'ข่าวประชาสัมพันธ์',
    activities: 'ข่าวกิจกรรม',
    announce: 'ประกาศสหกรณ์',
    about_coop: 'เกี่ยวกับสหกรณ์',
    perf_report: 'ผลการดำเนินงาน',
    // Tab 4
    manual: 'คู่มือสมาชิก',
    dl_forms: 'ดาวน์โหลดแบบฟอร์ม',
    rules: 'ระเบียบและข้อบังคับ',
    annual_report: 'รายงานประจำปี',
    // Tab 5
    contact_coop: 'ติดต่อสหกรณ์',
    contact_staff: 'ติดต่อเจ้าหน้าที่',
    office_loc: 'ที่ตั้งสำนักงาน',
    faq: 'คำถามที่พบบ่อย',
    feedback: 'แจ้งปัญหา/ร้องเรียน'
  };

  const ALL = { ...TAB_1, ...TAB_2, ...TAB_3, ...TAB_4, ...TAB_5 };

  /**
   * ดึงข้อความตอบกลับจากรหัสเมนู
   * @param {string} item
   * @returns {string}
   */
  function get(item) {
    return ALL[item] || 'ไม่พบข้อมูลสำหรับรายการนี้';
  }

  /**
   * ดึง caption ที่อ่านง่ายของเมนู
   * @param {string} item
   * @returns {string}
   */
  function getCaption(item) {
    return CAPTIONS[item] || item;
  }

  /**
   * เพิ่มหรือแก้ไขข้อความตอบกลับ
   * @param {string} item
   * @param {string} text
   */
  function set(item, text) {
    ALL[item] = text;
  }

  return {
    get,
    getCaption,
    set,
    TAB_1,
    TAB_2,
    TAB_3,
    TAB_4,
    TAB_5,
    CAPTIONS
  };
})();
