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
   * ค้นหาสมาชิกโดย activate_code
   * @param {string} activateCode
   * @returns {Object|null} ข้อมูลสมาชิกหรือ null ถ้าไม่พบ
   */
  function findByActivateCode(activateCode) {
    try {
      const tableKey = 'MEMBER_MASTER';
      Logger.log('Finding member by activate_code: ' + activateCode);
      
      const sheet = getSheet(tableKey);
      Logger.log('Sheet found: ' + sheet.getName());
      
      const data = sheet.getDataRange().getValues();
      Logger.log('Data rows: ' + data.length);
      
      if (data.length <= 1) {
        Logger.log('Sheet has only header or is empty');
        return null;
      }
      
      // หา column index ของ activate_code
      const activateCodeIndex = DataDict.getColumnIndex(tableKey, 'activate_code');
      Logger.log('activate_code column index: ' + activateCodeIndex);
      
      if (activateCodeIndex === -1) {
        Logger.log('activate_code column not found in DataDict');
        return null;
      }
      
      // ค้นหาแบบ manual เพื่อ debug
      Logger.log('Searching for activate_code: ' + activateCode + ' in column ' + activateCodeIndex);
      for (let i = 1; i < data.length; i++) {
        const rowValue = data[i][activateCodeIndex];
        Logger.log('Row ' + (i + 1) + ', col ' + activateCodeIndex + ' value: ' + rowValue + ' (type: ' + typeof rowValue + ')');
        if (String(rowValue).trim() === String(activateCode).trim()) {
          Logger.log('Found match at row ' + (i + 1));
          const member = DataDict.rowToObject(tableKey, data[i]);
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

      const colIndex = DataDict.getColumnIndex(tableKey, 'line_user_id');
      if (colIndex === -1) return null;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][colIndex]).trim() === String(lineUserId).trim()) {
          Logger.log('findByLineUserId: found member at row ' + (i + 1));
          return {
            ...DataDict.rowToObject(tableKey, data[i]),
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

    // ใช้ DataDict เพื่อหา index ที่ถูกต้อง
    const effDtIndex = DataDict.getColumnIndex(tableKey, 'mem_eff_dt') + 1; // 1-based
    const expDtIndex = DataDict.getColumnIndex(tableKey, 'mem_exp_dt') + 1;
    const statusIndex = DataDict.getColumnIndex(tableKey, 'mem_status') + 1;
    const lineIdIndex = DataDict.getColumnIndex(tableKey, 'line_user_id') + 1;

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
    activateMember,
    isActiveMember,
    hasRole,
    isActivated,
    getSheet,
    getSpreadsheet
  };
})();