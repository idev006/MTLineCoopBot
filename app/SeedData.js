/**
 * @fileoverview SeedData
 * สร้างตาราง (ตาม use case) + ข้อมูลตัวอย่าง (dummy data) สำหรับการพัฒนา/ทดสอบ
 *
 * หลักการตั้งชื่อตาราง: lower case + ขึ้นต้นด้วย t_ (เช่น t_member_mast)
 * โครงสร้างตาราง (SSOT) อยู่ใน DataDict.js — ไฟล์นี้มีแค่ข้อมูลตัวอย่าง
 *
 * วิธีใช้ (รันใน Apps Script Editor หรือ clasp):
 *   createDummyTables()   — สร้างชีท 4 ตาราง + dummy data (ไม่ลบข้อมูลเดิม)
 *   resetDummyTables()    — ล้างข้อมูลในตารางทั้ง 4 แล้วใส่ dummy ใหม่ (dev เท่านั้น)
 *
 * หมายเหตุ:
 * - ไม่แตะ t_member_mast (เป็นข้อมูลจริงของสมาชิก) — dummy การเงินใช้รหัส
 *   MEM001–MEM003 ที่ต้องมีใน t_member_mast ถึงจะเห็นข้อมูล (ดูเอกสาร MT-27)
 * - ตารางที่สร้าง: t_savings_acct · t_loan_acct · t_dividend · t_activation_log
 */

const SeedData = (() => {
  'use strict';

  /** ตารางที่ SeedData จัดการ (key ใน DataDict) */
  const SEED_TABLE_KEYS = ['SAVINGS_ACCT', 'LOAN_ACCT', 'DIVIDEND', 'ACTIVATION_LOG'];

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
        ['MEM002', 'LN-2023-002', 50000, 8000, '2026-09-30']
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
    createDummyTables,
    resetDummyTables
  };
})();
