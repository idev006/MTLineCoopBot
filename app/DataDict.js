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
        { name: 'mem_role', type: 'string', required: false, label: 'บทบาท', default: 'member' }
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
   * แปลง object เป็นแถวข้อมูล (array) ตามลำดับคอลัมน์
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
    objectToRow,
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
