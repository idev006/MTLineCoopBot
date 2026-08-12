/**
 * @fileoverview SeedData
 * สร้างตาราง (ตาม use case) + ข้อมูลตัวอย่าง (dummy data) สำหรับการพัฒนา/ทดสอบ
 *
 * หลักการตั้งชื่อตาราง: lower case + ขึ้นต้นด้วย t_ (เช่น t_member_mast)
 * โครงสร้างตาราง (SSOT) อยู่ใน DataDict.js — ไฟล์นี้มีแค่ข้อมูลตัวอย่าง
 *
 * วิธีใช้ (รันใน Apps Script Editor หรือ clasp):
 *   createDummyTables()       — สร้างชีท 8 ตาราง + dummy data (ไม่ลบข้อมูลเดิม)
 *   createDummyMemberMaster() — สร้าง t_member_mast ข้อมูลทดสอบ (dev/test เท่านั้น —
 *                               ชีทมีข้อมูลอยู่แล้วจะข้าม ไม่ทับของจริง)
 *   seedAllForTesting()       — รันทั้ง 2 อย่าง (เตรียมข้อมูลสำหรับทดสอบ use case สมาชิก)
 *   resetDummyTables()        — ล้างข้อมูลในตารางทั้ง 6 แล้วใส่ dummy ใหม่ (dev เท่านั้น)
 *
 * หมายเหตุ:
 * - createDummyTables() ไม่แตะ t_member_mast (เป็นข้อมูลจริงของสมาชิก) — ถ้าต้องการ
 *   ข้อมูลทดสอบสมาชิก ให้รัน createDummyMemberMaster() แยก (dev/test เท่านั้น)
 * - dummy การเงินใช้รหัส MEM001–MEM003 — ต้องมีใน t_member_mast ถึงจะเห็นข้อมูล
 *   (createDummyMemberMaster() เตรียมให้แล้ว: MEM001–003 activate ได้เองด้วย ACT001–003)
 * - ตารางที่สร้าง: t_savings_acct · t_loan_acct · t_dividend · t_activation_log
 *   · t_expiry_log · t_notice (MT-13) · t_reminder_log (MT-13b) · t_content (MT-14)
 */

const SeedData = (() => {
  'use strict';

  /** ตารางที่ SeedData จัดการ (key ใน DataDict) — ไม่รวม MEMBER_MASTER (ข้อมูลจริง) */
  const SEED_TABLE_KEYS = ['SAVINGS_ACCT', 'LOAN_ACCT', 'DIVIDEND', 'ACTIVATION_LOG', 'EXPIRY_LOG', 'NOTICE', 'REMINDER_LOG', 'CONTENT'];

  /**
   * ข้อมูลทดสอบ t_member_mast (dev/test เท่านั้น — 16 คอลัมน์ตรง DataDict)
   * - MEM001–003: ยังไม่ activate (mem_eff_dt ว่าง) — activate เองได้ใน LINE ด้วย ACT001–003
   *   → ผูก line_user_id ของผู้ทดสอบเอง แล้วทดสอบเมนูได้ทันที (MEM001 มีข้อมูลครบทุกเมนูการเงิน)
   * - MEM004: หมดอายุแล้ว (active + มี userId placeholder) — ทดสอบ ExpiryService push/unlink
   * - MEM005: staff (ยังไม่ activate) — เตรียมสำหรับทดสอบบทบาท staff/admin ในอนาคต
   */
  const MEMBER_MASTER_ROWS = [
    ['MEM001', 'นาย', 'สมชาย', 'ใจดี', 25, 'กรรมการ', 10, '', '', 'inactive', 'ACT001', '', 'member', 85, 50000, 10000],
    ['MEM002', 'นาง', 'สมหญิง', 'รักดี', 20, 'สมาชิก', 5, '', '', 'inactive', 'ACT002', '', 'member', 80, 8000, 5000],
    ['MEM003', 'นาย', 'ทดสอบ', 'ระบบ', 15, 'สมาชิก', 3, '', '', 'inactive', 'ACT003', '', 'member', 70, 0, 2000],
    ['MEM004', 'นาย', 'หมดอายุ', 'ทดสอบ', 10, 'สมาชิก', 2, '2026-01-01', '2026-08-01', 'active', 'ACT004', 'U44444444444444444444444444444444', 'member', 60, 45000, 1500],
    ['MEM005', 'นาง', 'เจ้าหน้าที่', 'ระบบ', 30, 'เจ้าหน้าที่', 8, '2026-01-01', '2026-12-31', 'active', 'STAFF001', '', 'staff', 90, 0, 0]
  ];

  /**
   * แถวทดสอบ t_member_mast (pure — ทดสอบโครงสร้างใน CI ได้)
   * @returns {Array<Array>}
   */
  function getDummyMemberRows() {
    return MEMBER_MASTER_ROWS.map(r => [...r]);
  }

  /**
   * ข้อมูลตัวอย่างต่อตาราง (pure — ทดสอบใน node ได้โดยไม่ต้องพึ่ง Sheets)
   * คอลัมน์ต้องตรงลำดับกับ DataDict.getColumns(tableKey)
   * @returns {Object} { [tableKey]: Array<Array> }
   */
  function getDummyRows() {
    return {
      SAVINGS_ACCT: [
        ['MEM001', 'SAV-0001', 'ออมทรัพย์', 25000, '2026-08-01'],
        ['MEM001', 'SAV-0011', 'ออมทรัพย์พิเศษ', 100000, '2026-08-01'],
        ['MEM002', 'SAV-0002', 'ออมทรัพย์', 12500, '2026-08-02'],
        ['MEM003', 'SAV-0003', 'ออมทรัพย์', 5000, '2026-08-03'],
        ['MEM003', 'SAV-0033', 'ออมทรัพย์พิเศษ', 30000, '2026-08-03']
      ],
      LOAN_ACCT: [
        ['MEM001', 'LN-2024-001', 100000, 45000, '2026-12-31'],
        ['MEM002', 'LN-2023-002', 50000, 8000, '2026-09-30'],
        // ใกล้ครบกำหนด (due 2026-08-20) — เตือนชำระได้ทันทีหลัง seed (MT-13b)
        ['MEM003', 'LN-2026-003', 20000, 5000, '2026-08-20']
      ],
      DIVIDEND: [
        ['MEM001', 2566, 1250, 10000],
        ['MEM001', 2565, 1000, 10000],
        ['MEM002', 2566, 625, 5000]
      ],
      ACTIVATION_LOG: [
        ['LOG-0001', 'MEM001', 'U11111111111111111111111111111111', 'ACT001', 'success', '2026-08-01 09:00:00'],
        ['LOG-0002', 'MEM002', 'U22222222222222222222222222222222', 'ACT002', 'success', '2026-08-02 10:30:00'],
        ['LOG-0003', 'MEM999', '', 'BADCODE', 'failed', '2026-08-03 14:00:00']
      ],
      EXPIRY_LOG: [
        ['ELOG-0001', 'MEM001', 'U11111111111111111111111111111111', 'expiring', 14, '2026-08-20', '2026-08-06 09:00:00'],
        ['ELOG-0002', 'MEM002', 'U22222222222222222222222222222222', 'expired', -5, '2026-08-01', '2026-08-06 09:00:00'],
        ['ELOG-0003', 'MEM003', 'U33333333333333333333333333333333', 'valid', 147, '2026-12-31', '2026-08-06 09:00:00']
      ],
      NOTICE: [
        // ส่งแล้วแล้ว (มี sent_dt) — จะไม่ถูก broadcast ซ้ำ
        ['NTC-0001', 'ประกาศปิดทำการ', 'สหกรณ์ปิดทำการวันที่ 12 ส.ค. 2569 เนื่องจากงานประชุมใหญ่', '2026-08-01 09:00:00', '2026-08-01 09:00:05', 'published'],
        // พร้อมส่ง (published + ยังไม่มี sent_dt) — จะถูก broadcast ในรอบถัดไป
        ['NTC-0002', 'ประชุมใหญ่สามัญประจำปี', 'กำหนดประชุมวันที่ 20 ส.ค. 2569 เวลา 09:00 น. ณ ห้องประชุมสหกรณ์ ขอเชิญสมาชิกทุกท่านเข้าร่วมโดยพร้อมเพรียงกัน', '2026-08-06 09:00:00', '', 'published'],
        // ร่าง (draft) — ไม่ถูก broadcast
        ['NTC-0003', 'แบบร่างประกาศ', 'ยังไม่เผยแพร่', '2026-08-10 09:00:00', '', 'draft']
      ],
      REMINDER_LOG: [
        ['RLOG-0001', 'MEM003', 'LN-2026-003', '2026-08-20', 8, 'reminded', '2026-08-12 09:00:00'],
        ['RLOG-0002', 'MEM002', 'LN-2023-002', '2026-09-30', 49, 'skipped', '2026-08-12 09:00:00']
      ],
      CONTENT: [
        // เนื้อหาเมนูข้อมูล/เอกสาร/ติดต่อ (MT-14) — แก้ไขในชีทได้โดยไม่ต้องแก้โค้ด
        ['chg_password', '🔑 เปลี่ยนรหัสผ่าน: ขณะนี้ระบบยังไม่มีบริการเปลี่ยนรหัสผ่านผ่าน LINE — กรุณาติดต่อสหกรณ์ผ่านเมนู "ติดต่อสหกรณ์"', '2026-08-12 09:00:00'],
        ['loan_apply', '📋 ยื่นคำขอกู้: ขั้นตอน\n1. เตรียมเอกสาร (บัตรประชาชน + ทะเบียนบ้าน + หลักฐานรายได้)\n2. ติดต่อเจ้าหน้าที่สหกรณ์เพื่อตรวจสอบวงเงิน\n3. ยื่นแบบฟอร์มคำขอกู้ที่สำนักงาน\n\nวงเงิน/เงื่อนไขปัจจุบัน: ดูประกาศสหกรณ์ หรือติดต่อเจ้าหน้าที่', '2026-08-12 09:00:00'],
        ['calc_install', '🧮 วิธีคำนวณเงินผ่อน: พิมพ์ "คำนวณ <จำนวนเงิน>" เช่น "คำนวณ 100000" ระบบจะแสดงตารางผ่อนชำระรายเดือน (อัตราดอกเบี้ยตามประกาศสหกรณ์)', '2026-08-12 09:00:00'],
        ['welfare', '🎁 สวัสดิการสมาชิก: ค่ารักษาพยาบาล (ตามจริง 80% สูงสุดตามประกาศ) · ทุนการศึกษาบุตร · เงินสงเคราะห์ครอบครัว · เงินฌาปนกิจสงเคราะห์\n\nรายละเอียดเต็ม: ติดต่อเจ้าหน้าที่สหกรณ์', '2026-08-12 09:00:00'],
        ['emergency', '🚨 กองทุนฉุกเฉิน: วงเงินกู้ฉุกเฉินสูงสุด 50,000 บาท (ตามวงเงินที่ประกาศ) ผ่อนชำระระยะสั้นสูงสุด 12 เดือน\n\nยื่นขอได้ที่สำนักงานสหกรณ์ (เอกสาร: บัตรประชาชน)', '2026-08-12 09:00:00'],
        ['news_pr', '📰 ข่าวประชาสัมพันธ์: ข่าวสารล่าสุดของสหกรณ์ถูกส่งถึงสมาชิกผ่านระบบแจ้งเตือน — ติดตามได้ในแชทนี้และเมนู "ประกาศสหกรณ์"', '2026-08-12 09:00:00'],
        ['activities', '🎉 ข่าวกิจกรรม: กิจกรรมสหกรณ์ (ประชุมใหญ่/อบรมสมาชิก/กิจกรรมประจำปี) — ประกาศล่วงหน้าในเมนู "ประกาศสหกรณ์"', '2026-08-12 09:00:00'],
        ['announce', '📢 ประกาศสหกรณ์: ประกาศล่าสุดถูกส่งถึงสมาชิกทุกคนโดยอัตโนมัติ — หากต้องการย้อนดูประกาศเก่า ติดต่อสหกรณ์', '2026-08-12 09:00:00'],
        ['about_coop', '🏢 เกี่ยวกับสหกรณ์: สหกรณ์จัดตั้งเพื่อส่งเสริมการออมและการกู้ยืมแก่สมาชิกโดยไม่แสวงหากำไร — ข้อมูลที่ตั้ง/เวลาทำการดูได้ที่เมนู "ติดต่อสหกรณ์"', '2026-08-12 09:00:00'],
        ['perf_report', '📊 ผลการดำเนินงาน: รายงานผลประกอบการประจำปี (งบดุล/งบรายได้) ดูได้ที่ "รายงานประจำปี" หรือติดต่อเจ้าหน้าที่สหกรณ์', '2026-08-12 09:00:00'],
        ['manual', '📖 คู่มือสมาชิก: แนะนำการใช้บริการ LINE Bot + บริการสหกรณ์ — เอกสารเพิ่มเติม: https://github.com/idev006/MTLineCoopBot (โฟลเดอร์ docs) หรือติดต่อสหกรณ์', '2026-08-12 09:00:00'],
        ['dl_forms', '📄 แบบฟอร์มดาวน์โหลด: แบบฟอร์มคำขอกู้/คำขอสมัครสมาชิก/คำขอสวัสดิการ — ขอรับได้ที่สำนักงานสหกรณ์ (กำลังจัดทำเวอร์ชันดาวน์โหลด)', '2026-08-12 09:00:00'],
        ['rules', '📜 ระเบียบและข้อบังคับ: ระเบียบว่าด้วยการรับสมาชิก/การกู้ยืม/การถือหุ้น — ดูได้ที่สำนักงานสหกรณ์หรือติดต่อเจ้าหน้าที่', '2026-08-12 09:00:00'],
        ['annual_report', '📑 รายงานประจำปี: รายงานผลการดำเนินงานประจำปีบัญชี — ขอรับได้ที่สำนักงานสหกรณ์ (กำลังจัดทำเวอร์ชันออนไลน์)', '2026-08-12 09:00:00'],
        ['contact_coop', '📞 ติดต่อสหกรณ์\n\nโทรศัพท์: 0-2123-4567\nเวลาทำการ: จันทร์–ศุกร์ 08:30–16:30 (หยุดเสาร์-อาทิตย์/วันหยุดราชการ)\nอีเมล: contact@coop.example.com', '2026-08-12 09:00:00'],
        ['contact_staff', '👩‍💼 ติดต่อเจ้าหน้าที่: เจ้าหน้าที่การเงิน/สมาชิก ให้บริการ จันทร์–ศุกร์ 08:30–16:30 — โทร. 0-2123-4567 หรือติดต่อที่สำนักงานสหกรณ์', '2026-08-12 09:00:00'],
        ['office_loc', '📍 ที่ตั้งสำนักงาน: เลขที่ 123 หมู่ 4 ถนนตัวอย่าง ต.ตำบล อ.อำเภอ จ.จังหวัด 10110 — (แก้ไขที่อยู่จริงได้ที่ชีท t_content)', '2026-08-12 09:00:00'],
        ['faq', '❓ คำถามที่พบบ่อย\n\n1. เปิดใช้งานอย่างไร? พิมพ์ activate:รหัส (ดูเมนู "เปิดใช้งานสมาชิก")\n2. ลืมรหัส activate? ติดต่อสหกรณ์เพื่อออกให้ใหม่\n3. ดูยอดเงินฝาก? คลิก "บัญชีเงินฝาก"\n4. ต่ออายุสมาชิก? พิมพ์ renew', '2026-08-12 09:00:00'],
        ['feedback', '💬 แจ้งปัญหา/ร้องเรียน: กรุณาระบุรายละเอียด (ชื่อ-นามสกุล, รหัสสมาชิก, เรื่องที่แจ้ง) แล้วส่งข้อความในแชทนี้ หรือติดต่อเจ้าหน้าที่โดยตรง — ทีมงานจะติดต่อกลับภายใน 2 วันทำการ', '2026-08-12 09:00:00']
      ]
    };
  }

  /**
   * ตรวจว่าชีทมีข้อมูล (นอกจาก header) หรือไม่
   * @param {Sheet} sheet
   * @returns {boolean}
   */
  function sheetHasData(sheet) {
    try {
      return sheet.getDataRange().getValues().length > 1;
    } catch (e) {
      return false;
    }
  }

  /**
   * สร้างตาราง 4 ตาราง + dummy data
   * Non-destructive: ถ้าชีทมีข้อมูลอยู่แล้วจะข้าม (ไม่ทับ)
   * ใช้ LineBot.SheetService.getSheet() — สร้างชีท + header อัตโนมัติจาก DataDict
   * @returns {Array<string>} รายการตารางที่สร้าง/เติมข้อมูล
   */
  function createDummyTables() {
    const rowsByTable = getDummyRows();
    const created = [];
    for (const tableKey of SEED_TABLE_KEYS) {
      const sheet = LineBot.SheetService.getSheet(tableKey);
      if (sheetHasData(sheet)) {
        Logger.log(`[SeedData] ${DataDict.getTable(tableKey).name} มีข้อมูลแล้ว — ข้าม (ไม่ทับข้อมูลเดิม)`);
        continue;
      }
      const rows = rowsByTable[tableKey] || [];
      for (const row of rows) {
        sheet.appendRow(row);
      }
      Logger.log(`[SeedData] ${DataDict.getTable(tableKey).name} เติม dummy ${rows.length} แถว`);
      created.push(DataDict.getTable(tableKey).name);
    }
    return created;
  }

  /**
   * สร้าง t_member_mast ข้อมูลทดสอบ (dev/test เท่านั้น — แยกจาก createDummyTables)
   * Non-destructive: ถ้าชีทมีข้อมูลอยู่แล้ว (เช่น ข้อมูลสมาชิกจริง) จะข้าม ไม่ทับ
   * @returns {Array<string>} รายการ mem_code ที่เติม (ว่าง = ข้ามเพราะมีข้อมูลแล้ว)
   */
  function createDummyMemberMaster() {
    const tableKey = 'MEMBER_MASTER';
    const sheet = LineBot.SheetService.getSheet(tableKey);
    if (sheetHasData(sheet)) {
      Logger.log('[SeedData] t_member_mast มีข้อมูลอยู่แล้ว — ข้าม (ไม่ทับข้อมูลจริง — ใช้เฉพาะชีททดสอบ/ใหม่)');
      return [];
    }
    const rows = getDummyMemberRows();
    for (const row of rows) {
      sheet.appendRow(row);
    }
    Logger.log(`[SeedData] t_member_mast เติมข้อมูลทดสอบ ${rows.length} แถว (dev/test — activate ด้วย ACT001–003)`);
    return rows.map(r => r[0]);
  }

  /**
   * รันทั้งหมดสำหรับทดสอบ use case สมาชิก: ตาราง + dummy + t_member_mast ข้อมูลทดสอบ
   * @returns {Object} { tables: Array<string>, members: Array<string> }
   */
  function seedAllForTesting() {
    return {
      tables: createDummyTables(),
      members: createDummyMemberMaster()
    };
  }

  /**
   * ล้างข้อมูล (หลัง header) แล้วใส่ dummy ใหม่ — ใช้ใน dev/test เท่านั้น
   * @returns {Array<string>} รายการตารางที่ reset
   */
  function resetDummyTables() {
    const rowsByTable = getDummyRows();
    const reset = [];
    for (const tableKey of SEED_TABLE_KEYS) {
      const sheet = LineBot.SheetService.getSheet(tableKey);
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.deleteRows(2, lastRow - 1); // ลบข้อมูลทั้งหมดหลัง header
      }
      const rows = rowsByTable[tableKey] || [];
      for (const row of rows) {
        sheet.appendRow(row);
      }
      Logger.log(`[SeedData] ${DataDict.getTable(tableKey).name} reset แล้ว (${rows.length} แถว)`);
      reset.push(DataDict.getTable(tableKey).name);
    }
    return reset;
  }

  return {
    SEED_TABLE_KEYS,
    getDummyRows,
    getDummyMemberRows,
    createDummyTables,
    createDummyMemberMaster,
    seedAllForTesting,
    resetDummyTables
  };
})();

/**
 * ============================================================
 * Top-level wrappers — ให้เห็นฟังก์ชันใน Apps Script Editor
 * (Apps Script เรียก function ระดับบนสุดได้เท่านั้น)
 * ============================================================
 */

/** สร้างชีท 6 ตาราง + dummy data (ไม่แตะ t_member_mast) */
function createDummyTables() {
  return SeedData.createDummyTables();
}

/** สร้าง t_member_mast ข้อมูลทดสอบ (dev/test เท่านั้น — มีข้อมูลแล้วข้าม) */
function createDummyMemberMaster() {
  return SeedData.createDummyMemberMaster();
}

/** เตรียมข้อมูลทั้งหมดสำหรับทดสอบ use case สมาชิก */
function seedAllForTesting() {
  return SeedData.seedAllForTesting();
}

/** ล้างข้อมูล (หลัง header) แล้วใส่ dummy ใหม่ — dev/test เท่านั้น */
function resetDummyTables() {
  return SeedData.resetDummyTables();
}
