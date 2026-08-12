/**
 * @fileoverview LineBot.SheetService
 * จัดการการติดต่อกับ Google Sheets สำหรับข้อมูลสมาชิก
 */

var LineBot = LineBot || {};

LineBot.SheetService = (() => {
  'use strict';

  /**
   * ดึงชื่อ sheet จาก DataDict
   * @param {string} tableKey - เช่น 'MEMBER_MASTER'
   * @returns {string}
   */
  function getSheetName(tableKey) {
    const table = DataDict.getTable(tableKey);
    if (!table) {
      throw new Error(`Table ${tableKey} not found in DataDict`);
    }
    return table.name;
  }

  /**
   * เปิด Spreadsheet ปัจจุบัน
   * @returns {Spreadsheet}
   */
  function getSpreadsheet() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error('ไม่พบ Active Spreadsheet กรุณาเปิดไฟล์ Google Sheets ก่อน');
    }
    return ss;
  }

  /**
   * เปิด Spreadsheet ปัจจุบันและคืน sheet ที่ต้องการ
   * @param {string} tableKey - เช่น 'MEMBER_MASTER'
   * @returns {Sheet}
   */
  function getSheet(tableKey) {
    const ss = getSpreadsheet();
    const sheetName = getSheetName(tableKey);
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const headers = DataDict.getHeaders(tableKey);
      sheet.appendRow(headers);
      Logger.log(`สร้าง sheet ${sheetName} และ header เรียบร้อย`);
    }
    return sheet;
  }

  /**
   * อ่าน header row ของชีท (แถวแรก) — ใช้ map คอลัมน์ตามชื่อ
   * (หลักการ Header-driven: รองรับการสลับตำแหน่งฟิลด์ในตารางได้)
   * @param {Sheet} sheet
   * @returns {Array<string>}
   */
  function getHeaderRow(sheet) {
    const values = sheet.getDataRange().getValues();
    if (values.length === 0) return [];
    return values[0].map(h => String(h).trim());
  }

  /**
   * สร้าง map { columnName: 0-basedIndex } จาก header จริงของชีท
   * @param {Sheet} sheet
   * @returns {Object}
   */
  function getHeaderMap(sheet) {
    const map = {};
    getHeaderRow(sheet).forEach((name, i) => {
      if (name) map[name] = i;
    });
    return map;
  }

  /**
   * อ่านทุกแถว (หลัง header) เป็น object โดย map ตามชื่อคอลัมน์จริง
   * (ไม่พึ่งลำดับคอลัมน์ใน DataDict — ใช้ rowToObjectByHeaders)
   * @param {string} tableKey
   * @param {Sheet} sheet
   * @returns {Array<Object>}
   */
  function readRowsAsObjects(tableKey, sheet) {
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];
    const headers = data[0].map(h => String(h).trim());
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      rows.push(DataDict.rowToObjectByHeaders(tableKey, headers, data[i]));
    }
    return rows;
  }

  /**
   * ดึงสมาชิกทั้งหมด (สำหรับ scan วันหมดอายุ — การ์ด MT-11)
   * @returns {Array<Object>} รายการสมาชิก (ไม่มี _rowIndex)
   */
  function findAllMembers() {
    return readRowsAsObjects('MEMBER_MASTER', getSheet('MEMBER_MASTER'));
  }

  /**
   * ค้นหาสมาชิกโดย activate_code
   * @param {string} activateCode
   * @returns {Object|null} ข้อมูลสมาชิกหรือ null ถ้าไม่พบ
   */
  function findByActivateCode(activateCode) {
    try {
      const tableKey = 'MEMBER_MASTER';
      Logger.log('Finding member by activate_code: ' + activateCode);
      
      const sheet = getSheet(tableKey);
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) {
        Logger.log('Sheet has only header or is empty');
        return null;
      }
      
      // หา column index จาก header จริงของชีท (รองรับการสลับตำแหน่งฟิลด์)
      const headers = data[0].map(h => String(h).trim());
      const activateCodeIndex = headers.indexOf('activate_code');
      if (activateCodeIndex === -1) {
        throw new Error(`ไม่พบคอลัมน์ activate_code ในชีท ${DataDict.getTable(tableKey).name} — ตรวจสอบ header`);
      }
      
      for (let i = 1; i < data.length; i++) {
        const rowValue = data[i][activateCodeIndex];
        if (String(rowValue).trim() === String(activateCode).trim()) {
          Logger.log('Found match at row ' + (i + 1));
          const member = DataDict.rowToObjectByHeaders(tableKey, headers, data[i]);
          member._rowIndex = i + 1; // 1-based
          return member;
        }
      }
      
      Logger.log('activate_code not found after searching all rows');
      return null;
    } catch (error) {
      Logger.log('Error in findByActivateCode: ' + error);
      throw error;
    }
  }

  /**
   * ค้นหาสมาชิกโดย LINE User ID
   * @param {string} lineUserId
   * @returns {Object|null} ข้อมูลสมาชิกหรือ null ถ้าไม่พบ
   */
  function findByLineUserId(lineUserId) {
    const tableKey = 'MEMBER_MASTER';
    if (!lineUserId) return null;
    try {
      const sheet = getSheet(tableKey);
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return null;

      // หา column index จาก header จริงของชีท (รองรับการสลับตำแหน่งฟิลด์)
      const headers = data[0].map(h => String(h).trim());
      const colIndex = headers.indexOf('line_user_id');
      if (colIndex === -1) {
        throw new Error(`ไม่พบคอลัมน์ line_user_id ในชีท ${DataDict.getTable(tableKey).name} — ตรวจสอบ header`);
      }

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][colIndex]).trim() === String(lineUserId).trim()) {
          Logger.log('findByLineUserId: found member at row ' + (i + 1));
          return {
            ...DataDict.rowToObjectByHeaders(tableKey, headers, data[i]),
            _rowIndex: i + 1 // 1-based
          };
        }
      }
      return null;
    } catch (error) {
      Logger.log('Error in findByLineUserId: ' + error);
      throw error;
    }
  }

  /**
   * ค้นหาทุกแถวที่ columnName ตรงกับ value (ใช้กับตารางการเงิน — MT-27)
   * @param {string} tableKey - key ใน DataDict เช่น 'SAVINGS_ACCT'
   * @param {string} columnName - ชื่อคอลัมน์ เช่น 'mem_code'
   * @param {*} value
   * @returns {Array<Object>} รายการ object — ว่างถ้าไม่พบ
   */
  function findAllByColumn(tableKey, columnName, value) {
    if (!value) return [];
    const sheet = getSheet(tableKey);
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    // หา column index จาก header จริงของชีท (รองรับการสลับตำแหน่งฟิลด์)
    const headers = data[0].map(h => String(h).trim());
    const colIndex = headers.indexOf(columnName);
    if (colIndex === -1) {
      throw new Error(`ไม่พบคอลัมน์ ${columnName} ในชีท ${DataDict.getTable(tableKey).name} — ตรวจสอบ header`);
    }

    const results = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][colIndex]).trim() === String(value).trim()) {
        results.push(DataDict.rowToObjectByHeaders(tableKey, headers, data[i]));
      }
    }
    return results;
  }

  /**
   * ดึงบัญชีเงินฝากของสมาชิก (เมนู saving_acct / chk_balance — MT-27)
   * @param {string} memCode
   * @returns {Array<Object>}
   */
  function findSavingsByMember(memCode) {
    return findAllByColumn('SAVINGS_ACCT', 'mem_code', memCode);
  }

  /**
   * ดึงบัญชีหนี้เงินกู้ของสมาชิก (เมนู loan_balance — MT-27)
   * @param {string} memCode
   * @returns {Array<Object>}
   */
  function findLoansByMember(memCode) {
    return findAllByColumn('LOAN_ACCT', 'mem_code', memCode);
  }

  /**
   * ดึงเงินปันผล/หุ้นของสมาชิก (เมนู dividends / share_capital — MT-27)
   * @param {string} memCode
   * @returns {Array<Object>}
   */
  function findDividendsByMember(memCode) {
    return findAllByColumn('DIVIDEND', 'mem_code', memCode);
  }

  /**
   * บันทึกเหตุการณ์ Activate ลง t_activation_log (audit trail — MT-27)
   * @param {Object} entry - { memCode, lineUserId, activateCode, status }
   * @returns {Object} ข้อมูลที่บันทึก
   */
  function logActivation(entry) {
    const tableKey = 'ACTIVATION_LOG';
    const sheet = getSheet(tableKey);
    const logId = 'LOG-' + String(Date.now());
    // เขียนตามลำดับ header จริงของชีท (รองรับการสลับตำแหน่งฟิลด์)
    const headers = getHeaderRow(sheet);
    const row = DataDict.objectToRowByHeaders(tableKey, headers, {
      log_id: logId,
      mem_code: entry.memCode || '',
      line_user_id: entry.lineUserId || '',
      activate_code: entry.activateCode || '',
      status: entry.status || 'success',
      activated_dt: DataDict.formatDateTime(new Date())
    });
    sheet.appendRow(row);
    Logger.log(`[ActivationLog] ${logId} — ${entry.status} (${entry.memCode})`);
    return { log_id: logId, status: entry.status || 'success' };
  }

  /**
   * บันทึกผลการตรวจวันหมดอายุลง t_expiry_log (audit trail — การ์ด MT-32)
   * @param {Object} entry - { memCode, lineUserId, status, daysLeft, memExpDt }
   * @returns {Object} ข้อมูลที่บันทึก
   */
  function appendExpiryLog(entry) {
    const tableKey = 'EXPIRY_LOG';
    const sheet = getSheet(tableKey);
    const logId = 'ELOG-' + String(Date.now());
    const headers = getHeaderRow(sheet);
    const row = DataDict.objectToRowByHeaders(tableKey, headers, {
      log_id: logId,
      mem_code: entry.memCode || '',
      line_user_id: entry.lineUserId || '',
      status: entry.status || 'valid',
      days_left: entry.daysLeft,
      mem_exp_dt: entry.memExpDt || '',
      checked_dt: DataDict.formatDateTime(entry.checkedDt || new Date())
    });
    sheet.appendRow(row);
    Logger.log(`[ExpiryLog] ${logId} — ${entry.memCode} (${entry.status}, ${entry.daysLeft} วัน)`);
    return { log_id: logId, status: entry.status || 'valid' };
  }

  /**
   * อัปเดตข้อมูลการ activate สมาชิก
   * @param {number} rowIndex - 1-based row index
   * @param {string} lineUserId
   * @returns {Object} ข้อมูลที่อัปเดต
   */
  function activateMember(rowIndex, lineUserId) {
    const tableKey = 'MEMBER_MASTER';
    const sheet = getSheet(tableKey);
    const now = new Date();
    const expDate = new Date(now);
    expDate.setDate(expDate.getDate() + 365);

    // ใช้ header จริงของชีท (รองรับการสลับตำแหน่งฟิลด์ — ไม่พึ่ง DataDict order)
    const headerMap = getHeaderMap(sheet);
    const col = (name) => {
      const idx = headerMap[name];
      if (idx === undefined) {
        throw new Error(`ไม่พบคอลัมน์ ${name} ในชีท ${DataDict.getTable(tableKey).name} — ตรวจสอบ header`);
      }
      return idx + 1; // 1-based
    };
    const effDtIndex = col('mem_eff_dt');
    const expDtIndex = col('mem_exp_dt');
    const statusIndex = col('mem_status');
    const lineIdIndex = col('line_user_id');

    // แปลง Date เป็น string รูปแบบ yyyy-mm-dd HH:mm:ss ตามที่ต้องการ
    const effDtStr = DataDict.formatDateTime(now);
    const expDtStr = DataDict.formatDateTime(expDate);

    sheet.getRange(rowIndex, effDtIndex).setValue(effDtStr);
    sheet.getRange(rowIndex, expDtIndex).setValue(expDtStr);
    sheet.getRange(rowIndex, statusIndex).setValue('active');
    sheet.getRange(rowIndex, lineIdIndex).setValue(lineUserId);

    Logger.log('Activated member at row ' + rowIndex + ' for LINE user ' + lineUserId);

    return {
      memEffDt: effDtStr,
      memExpDt: expDtStr,
      memStatus: 'active',
      lineUserId: lineUserId
    };
  }

  /**
   * แปลงวันที่รูปแบบ yyyy-mm-dd[ HH:mm:ss] เป็น Date
   * (parse แบบ manual เพื่อกันปัญหา timezone ของ new Date(string))
   * @param {string|Date} value
   * @returns {Date|null}
   */
  function parseDate(value) {
    // delegate ไป Core.MemberRules (pure — บทที่ 3.1.1, การ์ด MT-15)
    return Core.MemberRules.parseDate(value);
  }

  /**
   * ตรวจว่าสมาชิกมีสถานะ active และวันเวลาปัจจุบันอยู่ในช่วง [mem_eff_dt, mem_exp_dt]
   * (ขอบเขตรวม: now >= mem_eff_dt และ now <= mem_exp_dt)
   * @param {Object} member - ข้อมูลสมาชิกจาก DataDict.rowToObject
   * @returns {boolean}
   */
  function isActiveMember(member) {
    // delegate ไป Core.MemberRules (pure — บทที่ 3.1.1, การ์ด MT-15)
    return Core.MemberRules.isActiveMember(member);
  }

  /**
   * ตรวจว่าสมาชิก valid และมีบทบาทตรงตามที่กำหนด
   * นิยาม "member valid": อยู่ในช่วง [mem_eff_dt, mem_exp_dt] + mem_status='active' + mem_role='member'
   * @param {Object} member
   * @param {string} role - 'member' | 'staff' | 'admin'
   * @returns {boolean}
   */
  function hasRole(member, role) {
    // delegate ไป Core.MemberRules (pure — บทที่ 3.1.1, การ์ด MT-15)
    return Core.MemberRules.hasRole(member, role);
  }

  /**
   * ตรวจสอบว่าสมาชิกถูก activate แล้วหรือไม่
   * @param {Object} member
   * @returns {boolean}
   */
  function isActivated(member) {
    return member.mem_eff_dt && member.mem_eff_dt !== '';
  }

  return {
    findByActivateCode,
    findByLineUserId,
    findAllMembers,
    findAllByColumn,
    findSavingsByMember,
    findLoansByMember,
    findDividendsByMember,
    logActivation,
    appendExpiryLog,
    activateMember,
    isActiveMember,
    hasRole,
    isActivated,
    getSheet,
    getSpreadsheet,
    getHeaderRow,
    getHeaderMap,
    readRowsAsObjects
  };
})();