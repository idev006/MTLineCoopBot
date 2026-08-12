/**
 * @fileoverview DataDict
 * Single Source of Truth (SSOT) สำหรับโครงสร้างข้อมูลทั้งหมดในระบบ
 * รองรับหลายตาราง (sheets) พร้อม metadata และ index mapping
 */

const DataDict = (() => {
  'use strict';

  /**
   * ============================================
   * TABLE DEFINITIONS
   * ============================================
   */

  const TABLES = {
    /**
     * ตารางหลักสมาชิก
     * Sheet: t_member_mast
     */
    MEMBER_MASTER: {
      name: 't_member_mast',
      description: 'ตารางหลักข้อมูลสมาชิก',
      primaryKey: 'mem_code',
      columns: [
        { name: 'mem_code', type: 'string', required: true, label: 'รหัสสมาชิก' },
        { name: 'mem_title', type: 'string', required: false, label: 'คำนำหน้า' },
        { name: 'mem_fname', type: 'string', required: true, label: 'ชื่อ' },
        { name: 'mem_lname', type: 'string', required: true, label: 'นามสกุล' },
        { name: 'mem_rank_score', type: 'number', required: false, label: 'คะแนนตำแหน่ง' },
        { name: 'mem_position', type: 'string', required: false, label: 'ตำแหน่ง' },
        { name: 'mem_position_score', type: 'number', required: false, label: 'คะแนนตำแหน่ง' },
        { name: 'mem_eff_dt', type: 'date', required: false, label: 'วันที่มีผล' },
        { name: 'mem_exp_dt', type: 'date', required: false, label: 'วันที่หมดอายุ' },
        { name: 'mem_status', type: 'string', required: false, label: 'สถานะ', default: 'inactive' },
        { name: 'activate_code', type: 'string', required: false, label: 'รหัส Activate', unique: true },
        { name: 'line_user_id', type: 'string', required: false, label: 'LINE User ID' },
        { name: 'mem_role', type: 'string', required: false, label: 'บทบาท', default: 'member' },
        // ฟิลด์เพิ่มเติม 3 รายการ (อัปเดต 2026-08-12 — การ์ด MT-30)
        // ลำดับคอลัมน์ 14–16 ต้องตรงกับชีทจริง ดู data-dictionary.md
        { name: 'mem_kk', type: 'number', required: false, label: 'คะแนนความดี' },
        { name: 'mem_bk', type: 'number', required: false, label: 'เงินกู้คงค้าง' },
        { name: 'mem_bh', type: 'number', required: false, label: 'เงินหุ้น' }
      ]
    },

    /**
     * บัญชีเงินฝากสมาชิก (เมนู saving_acct / chk_balance)
     * Sheet: t_savings_acct
     * การ์ด MT-27 — dummy data
     */
    SAVINGS_ACCT: {
      name: 't_savings_acct',
      description: 'บัญชีเงินฝากสมาชิก',
      primaryKey: 'acct_no',
      columns: [
        { name: 'mem_code', type: 'string', required: true, label: 'รหัสสมาชิก (FK → t_member_mast)' },
        { name: 'acct_no', type: 'string', required: true, label: 'เลขบัญชี', unique: true },
        { name: 'acct_type', type: 'string', required: false, label: 'ประเภทบัญชี', default: 'ออมทรัพย์' },
        { name: 'balance', type: 'number', required: true, label: 'ยอดเงินฝากคงเหลือ' },
        { name: 'updated_dt', type: 'date', required: false, label: 'วันที่อัปเดตล่าสุด' }
      ]
    },

    /**
     * ยอดหนี้เงินกู้สมาชิก (เมนู loan_balance)
     * Sheet: t_loan_acct
     * การ์ด MT-27 — dummy data
     */
    LOAN_ACCT: {
      name: 't_loan_acct',
      description: 'บัญชีหนี้เงินกู้สมาชิก',
      primaryKey: 'loan_no',
      columns: [
        { name: 'mem_code', type: 'string', required: true, label: 'รหัสสมาชิก (FK → t_member_mast)' },
        { name: 'loan_no', type: 'string', required: true, label: 'เลขสัญญา', unique: true },
        { name: 'principal', type: 'number', required: true, label: 'วงเงินกู้' },
        { name: 'outstanding', type: 'number', required: true, label: 'ยอดหนี้คงค้าง' },
        { name: 'due_dt', type: 'date', required: false, label: 'วันครบกำหนด' }
      ]
    },

    /**
     * เงินปันผลและหุ้น (เมนู dividends / share_capital)
     * Sheet: t_dividend
     * การ์ด MT-27 — dummy data
     */
    DIVIDEND: {
      name: 't_dividend',
      description: 'เงินปันผลและหุ้นรายปี',
      primaryKey: 'mem_code',
      columns: [
        { name: 'mem_code', type: 'string', required: true, label: 'รหัสสมาชิก (FK → t_member_mast)' },
        { name: 'year', type: 'number', required: true, label: 'ปีบัญชี (พ.ศ.)' },
        { name: 'dividend_amt', type: 'number', required: false, label: 'เงินปันผล' },
        { name: 'share_capital', type: 'number', required: false, label: 'เงินหุ้น/ทุนเรือนหุ้น' }
      ]
    },

    /**
     * บันทึกการ Activate สมาชิก (audit trail — เตรียม Actor staff/admin ในอนาคต)
     * Sheet: t_activation_log
     * การ์ด MT-27 — dummy data
     */
    ACTIVATION_LOG: {
      name: 't_activation_log',
      description: 'บันทึกการ Activate สมาชิก (audit trail)',
      primaryKey: 'log_id',
      columns: [
        { name: 'log_id', type: 'string', required: true, label: 'รหัสบันทึก', unique: true },
        { name: 'mem_code', type: 'string', required: true, label: 'รหัสสมาชิก' },
        { name: 'line_user_id', type: 'string', required: false, label: 'LINE User ID' },
        { name: 'activate_code', type: 'string', required: false, label: 'รหัส Activate' },
        { name: 'status', type: 'string', required: false, label: 'ผลลัพธ์', default: 'success' },
        { name: 'activated_dt', type: 'datetime', required: false, label: 'เวลาที่บันทึก' }
      ]
    },

    /**
     * บันทึกการตรวจวันหมดอายุแต่ละรอบ (audit trail — การ์ด MT-32)
     * Sheet: t_expiry_log
     * ทุกสมาชิกที่ถูกตรวจ (active + มี line_user_id) จะมี 1 แถวต่อรอบ
     */
    EXPIRY_LOG: {
      name: 't_expiry_log',
      description: 'บันทึกการตรวจวันหมดอายุสมาชิก (audit trail)',
      primaryKey: 'log_id',
      columns: [
        { name: 'log_id', type: 'string', required: true, label: 'รหัสบันทึก', unique: true },
        { name: 'mem_code', type: 'string', required: true, label: 'รหัสสมาชิก' },
        { name: 'line_user_id', type: 'string', required: false, label: 'LINE User ID' },
        { name: 'status', type: 'string', required: false, label: 'สถานะตรวจ', default: 'valid' },
        { name: 'days_left', type: 'number', required: false, label: 'วันเหลือ (ปัดขึ้น)' },
        { name: 'mem_exp_dt', type: 'date', required: false, label: 'วันหมดอายุ' },
        { name: 'checked_dt', type: 'datetime', required: false, label: 'เวลาที่ตรวจ' }
      ]
    },

    /**
     * บันทึกการเตือนชำระแต่ละรอบ (audit trail — การ์ด MT-13b)
     * Sheet: t_reminder_log
     * 1 แถวต่อสัญญากู้ที่ถึงรอบเตือน (due_dt ในหน้าต่าง PAYMENT_REMINDER_DAYS)
     * status: 'reminded' (push แล้ว) / 'skipped' (สมาชิกไม่มี line_user_id หรือไม่ active)
     */
    REMINDER_LOG: {
      name: 't_reminder_log',
      description: 'บันทึกการเตือนชำระหนี้ (audit trail)',
      primaryKey: 'log_id',
      columns: [
        { name: 'log_id', type: 'string', required: true, label: 'รหัสบันทึก', unique: true },
        { name: 'mem_code', type: 'string', required: true, label: 'รหัสสมาชิก' },
        { name: 'loan_no', type: 'string', required: true, label: 'เลขสัญญากู้' },
        { name: 'due_dt', type: 'date', required: false, label: 'วันครบกำหนดชำระ' },
        { name: 'days_left', type: 'number', required: false, label: 'วันเหลือถึงกำหนด (ปัดขึ้น)' },
        { name: 'status', type: 'string', required: false, label: 'ผลลัพธ์', default: 'reminded' },
        { name: 'reminded_dt', type: 'datetime', required: false, label: 'เวลาที่เตือน' }
      ]
    },

    /**
     * ประกาศ/ข่าวสารสำหรับ broadcast (การ์ด MT-13)
     * Sheet: t_notice
     * แถวที่พร้อมส่ง: status='published' + ยังไม่มี sent_dt + published_dt <= ตอน broadcast
     * หลังส่งครบทุกสมาชิก → เขียน sent_dt + status='sent' (กันส่งซ้ำรอบถัดไป)
     */
    NOTICE: {
      name: 't_notice',
      description: 'ประกาศ/ข่าวสารสำหรับ broadcast ถึงสมาชิก',
      primaryKey: 'notice_id',
      columns: [
        { name: 'notice_id', type: 'string', required: true, label: 'รหัสประกาศ', unique: true },
        { name: 'title', type: 'string', required: true, label: 'หัวข้อประกาศ' },
        { name: 'message', type: 'string', required: true, label: 'เนื้อหาประกาศ' },
        { name: 'published_dt', type: 'datetime', required: false, label: 'วันเวลาที่ประกาศ (เริ่มส่งได้)' },
        { name: 'sent_dt', type: 'datetime', required: false, label: 'วันเวลาที่ broadcast เสร็จ (ว่าง = ยังไม่ส่ง)' },
        { name: 'status', type: 'string', required: false, label: 'สถานะ', default: 'published' }
      ]
    }
  };

  /**
   * ============================================
   * DATE/TIME FORMATTING
   * ============================================
   */

  /**
   * แปลง Date เป็น string รูปแบบ yyyy-mm-dd
   * @param {Date} date
   * @returns {string}
   */
  function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * แปลง Date เป็น string รูปแบบ yyyy-mm-dd HH:mm:ss
   * @param {Date} date
   * @returns {string}
   */
  function formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const dateStr = formatDate(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * ============================================
   * HELPER FUNCTIONS
   * ============================================
   */

  /**
   * ดึง definition ของตาราง
   * @param {string} tableKey - เช่น 'MEMBER_MASTER'
   * @returns {Object|null}
   */
  function getTable(tableKey) {
    return TABLES[tableKey] || null;
  }

  /**
   * ดึงชื่อคอลัมน์ทั้งหมดของตาราง
   * @param {string} tableKey
   * @returns {Array<string>}
   */
  function getColumns(tableKey) {
    const table = getTable(tableKey);
    if (!table) return [];
    return table.columns.map(col => col.name);
  }

  /**
   * ดึง index ของคอลัมน์ (0-based)
   * @param {string} tableKey
   * @param {string} columnName
   * @returns {number} -1 ถ้าไม่พบ
   */
  function getColumnIndex(tableKey, columnName) {
    const table = getTable(tableKey);
    if (!table) return -1;
    return table.columns.findIndex(col => col.name === columnName);
  }

  /**
   * ดึง metadata ของคอลัมน์
   * @param {string} tableKey
   * @param {string} columnName
   * @returns {Object|null}
   */
  function getColumnMeta(tableKey, columnName) {
    const table = getTable(tableKey);
    if (!table) return null;
    return table.columns.find(col => col.name === columnName) || null;
  }

  /**
   * แปลงแถวข้อมูล (array) เป็น object ตามชื่อคอลัมน์
   * @param {string} tableKey
   * @param {Array} row - ข้อมูลจาก sheet
   * @returns {Object}
   */
  function rowToObject(tableKey, row) {
    const table = getTable(tableKey);
    if (!table) return {};
    
    const obj = {};
    table.columns.forEach((col, index) => {
      let value = row[index];
      
      // Type conversion
      if (col.type === 'number' && typeof value === 'string') {
        value = parseFloat(value) || 0;
      } else if (col.type === 'boolean') {
        value = value === true || value === 'true' || value === 1 || value === '1';
      }
      // date และ datetime เก็บเป็น string ตามที่มีใน sheet
      
      obj[col.name] = value;
    });
    
    return obj;
  }

  /**
   * แปลงแถวข้อมูลเป็น object โดย map จาก header row จริงของชีท
   * (รองรับการสลับตำแหน่งฟิลด์ในตาราง — ไม่พึ่งลำดับคอลัมน์ใน DataDict)
   * คอลัมน์ที่ไม่มีใน DataDict จะถูกเก็บตามชื่อนั้น ๆ (forward-compatible)
   * @param {string} tableKey
   * @param {Array<string>} headers - header row จากชีท (แถวแรก)
   * @param {Array} row - แถวข้อมูล
   * @returns {Object}
   */
  function rowToObjectByHeaders(tableKey, headers, row) {
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
      const name = String(headers[i]).trim();
      if (!name) continue;
      let value = row[i];
      const col = getColumnMeta(tableKey, name);
      if (col && col.type === 'number' && typeof value === 'string') {
        value = parseFloat(value) || 0;
      } else if (col && col.type === 'boolean') {
        value = value === true || value === 'true' || value === 1 || value === '1';
      }
      obj[name] = value;
    }
    return obj;
  }

  /**
   * สร้างแถว (array) จาก object ตามลำดับ header จริงของชีท
   * (รองรับการสลับตำแหน่ง — เขียนตรงคอลัมน์ตามชื่อ ไม่ใช่ตำแหน่งคงที่)
   * @param {string} tableKey
   * @param {Array<string>} headers - header row จากชีท
   * @param {Object} obj
   * @returns {Array}
   */
  function objectToRowByHeaders(tableKey, headers, obj) {
    return headers.map(header => {
      const name = String(header).trim();
      if (!name) return undefined;
      const meta = getColumnMeta(tableKey, name);
      let value = obj[name];
      if (value === undefined || value === null) {
        value = meta && meta.default !== undefined ? meta.default : undefined;
      }
      if (value instanceof Date) {
        if (meta && meta.type === 'date') {
          value = formatDate(value);
        } else if (meta && meta.type === 'datetime') {
          value = formatDateTime(value);
        }
      }
      // ตรวจรูปแบบก่อนเขียน (มาตรฐานการเก็บวันที่ — data-dictionary.md)
      if (meta && (meta.type === 'date' || meta.type === 'datetime') && typeof value === 'string' && value !== '') {
        const tableDef = getTable(tableKey);
        assertValidDateString(value, meta.type, tableDef ? tableDef.name : name, name);
      }
      return value;
    });
  }

  /**
   * ตรวจว่ารูปแบบวันที่/เวลาถูกต้องตามมาตรฐานหรือไม่
   * - date     → yyyy-mm-dd
   * - datetime → yyyy-mm-dd HH:mm:ss
   * ค่าว่าง (''), null, undefined, และ Date object ผ่านเสมอ (แปลง/ข้ามที่อื่น)
   * @param {*} value
   * @param {string} type - 'date' | 'datetime'
   * @returns {boolean}
   */
  function isValidDateString(value, type) {
    if (value === null || value === undefined || value === '') return true;
    if (value instanceof Date) return true;
    if (typeof value !== 'string') return false;
    if (type === 'date') {
      return /^\d{4}-\d{2}-\d{2}$/.test(value);
    }
    if (type === 'datetime') {
      return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value);
    }
    return true;
  }

  /**
   * ตรวจรูปแบบวันที่และ throw error ชัดเจนถ้าไม่ถูกต้อง (ใช้ก่อนเขียนลงชีท)
   * @param {*} value
   * @param {string} type
   * @param {string} tableName - ชื่อตาราง (สำหรับ error message)
   * @param {string} columnName - ชื่อคอลัมน์ (สำหรับ error message)
   */
  function assertValidDateString(value, type, tableName, columnName) {
    if (!isValidDateString(value, type)) {
      const expected = type === 'date' ? 'yyyy-mm-dd' : 'yyyy-mm-dd HH:mm:ss';
      throw new Error(`รูปแบบวันที่ไม่ถูกต้อง: ${tableName}.${columnName} = "${value}" (ต้องเป็น ${expected} — ดู data-dictionary.md)`);
    }
  }

  /**
   * แปลง object เป็นแถวข้อมูล (array) ตามลำดับคอลัมน์
   * (ตรวจรูปแบบวันที่/เวลาก่อนคืนค่า — ปฏิเสธ dd-mm-yyyy / T / Z / mixed)
   * @param {string} tableKey
   * @param {Object} obj
   * @returns {Array}
   */
  function objectToRow(tableKey, obj) {
    const table = getTable(tableKey);
    if (!table) return [];
    
    return table.columns.map(col => {
      let value = obj[col.name];
      
      // Apply default if undefined
      if (value === undefined || value === null) {
        value = col.default;
      }
      
      // Convert Date to string format for date/datetime types
      if (value instanceof Date) {
        if (col.type === 'date') {
          value = formatDate(value);
        } else if (col.type === 'datetime') {
          value = formatDateTime(value);
        }
      }
      
      // ตรวจรูปแบบก่อนเขียน (มาตรฐานการเก็บวันที่ — data-dictionary.md)
      if ((col.type === 'date' || col.type === 'datetime') && typeof value === 'string' && value !== '') {
        assertValidDateString(value, col.type, table.name, col.name);
      }
      
      return value;
    });
  }

  /**
   * สร้าง headers สำหรับ sheet ใหม่
   * @param {string} tableKey
   * @returns {Array<string>}
   */
  function getHeaders(tableKey) {
    return getColumns(tableKey);
  }

  /**
   * ดึงรายการตารางทั้งหมด
   * @returns {Array<{key: string, name: string, description: string}>}
   */
  function listTables() {
    return Object.keys(TABLES).map(key => ({
      key: key,
      name: TABLES[key].name,
      description: TABLES[key].description
    }));
  }

  /**
   * ตรวจสอบว่าคอลัมน์มีค่าตามที่ required หรือไม่
   * @param {string} tableKey
   * @param {Object} data
   * @returns {Object} { valid: boolean, errors: Array<string> }
   */
  function validate(tableKey, data) {
    const table = getTable(tableKey);
    if (!table) return { valid: false, errors: ['Table not found'] };
    
    const errors = [];
    
    table.columns.forEach(col => {
      if (col.required && (data[col.name] === undefined || data[col.name] === null || data[col.name] === '')) {
        errors.push(`${col.name} (${col.label}) is required`);
      }
      
      // Type checking
      if (data[col.name] !== undefined && data[col.name] !== null) {
        if (col.type === 'number' && typeof data[col.name] !== 'number') {
          errors.push(`${col.name} must be a number`);
        }
        if (col.type === 'boolean' && typeof data[col.name] !== 'boolean') {
          errors.push(`${col.name} must be a boolean`);
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * สร้าง query object สำหรับค้นหา
   * @param {string} tableKey
   * @returns {Object} { where: Function, findBy: Function }
   */
  function query(tableKey) {
    const table = getTable(tableKey);
    if (!table) return null;
    
    return {
      /**
       * กรองข้อมูลตามเงื่อนไข
       * @param {Array<Array>} rows - ข้อมูลจาก sheet
       * @param {Function} predicate - (obj) => boolean
       * @returns {Array<Object>}
       */
      where: (rows, predicate) => {
        return rows
          .slice(1) // Skip header
          .map(row => rowToObject(tableKey, row))
          .filter(predicate);
      },
      
      /**
       * ค้นหาตามคอลัมน์เดียว
       * @param {Array<Array>} rows
       * @param {string} columnName
       * @param {*} value
       * @returns {Object|null}
       */
      findBy: (rows, columnName, value) => {
        const colIndex = getColumnIndex(tableKey, columnName);
        if (colIndex === -1) return null;
        
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][colIndex] === value) {
            return {
              ...rowToObject(tableKey, rows[i]),
              _rowIndex: i + 1 // 1-based for Sheet operations
            };
          }
        }
        return null;
      }
    };
  }

  /**
   * สร้างข้อมูลเริ่มต้นสำหรับตาราง
   * @param {string} tableKey
   * @returns {Object}
   */
  function createDefault(tableKey) {
    const table = getTable(tableKey);
    if (!table) return {};
    
    const obj = {};
    table.columns.forEach(col => {
      if (col.default !== undefined) {
        obj[col.name] = col.default;
      } else {
        // Set default based on type
        switch (col.type) {
          case 'string': obj[col.name] = ''; break;
          case 'number': obj[col.name] = 0; break;
          case 'boolean': obj[col.name] = false; break;
          case 'date': obj[col.name] = ''; break;
          case 'datetime': obj[col.name] = ''; break;
          default: obj[col.name] = '';
        }
      }
    });
    
    return obj;
  }

  /**
   * สร้างเอกสาร Data Dictionary
   * @returns {string} Markdown format
   */
  function generateDocumentation() {
    let md = '# Data Dictionary\n\n';
    md += 'Generated: ' + new Date().toISOString() + '\n\n';
    
    Object.keys(TABLES).forEach(key => {
      const table = TABLES[key];
      md += `## ${table.name} (${key})\n\n`;
      md += `${table.description}\n\n`;
      md += '| Column | Type | Required | Default | Label |\n';
      md += '|--------|------|----------|---------|-------|\n';
      
      table.columns.forEach(col => {
        const req = col.required ? 'Yes' : 'No';
        const def = col.default !== undefined ? String(col.default) : '-';
        md += `| ${col.name} | ${col.type} | ${req} | ${def} | ${col.label} |\n`;
      });
      
      md += '\n';
    });
    
    return md;
  }

  return {
    TABLES,
    getTable,
    getColumns,
    getColumnIndex,
    getColumnMeta,
    rowToObject,
    rowToObjectByHeaders,
    objectToRow,
    objectToRowByHeaders,
    isValidDateString,
    assertValidDateString,
    getHeaders,
    listTables,
    validate,
    query,
    createDefault,
    generateDocumentation,
    formatDate,
    formatDateTime
  };
})();
