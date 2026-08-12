/**
 * @fileoverview Api.ApiError
 * สร้าง error ที่มี code (machine-readable) สำหรับ throw ใน handler
 * ApiRegistry จับได้แล้วแปลงเป็น envelope { ok:false, error:{code,message} }
 *
 * การ์ด MT-16 — API Layer (เฟส 3)
 */

var Api = Api || {};

Api.ApiError = (() => {
  'use strict';

  /**
   * @param {string} code - เช่น 'MEMBER_NOT_FOUND' / 'ALREADY_ACTIVATED'
   * @param {string} [message]
   * @param {number} [statusCode]
   * @param {Object} [extra] - ฟิลด์เพิ่มเติม เช่น { detail: 'code_not_found' }
   *   (การ์ด MT-17: ช่วยให้ UI adapter แยกสาเหตุ error ย่อยของ code เดียวกันได้)
   * @returns {Error} error ที่มี .code และ .statusCode
   */
  function create(code, message, statusCode, extra) {
    const e = new Error(message || code);
    e.code = code;
    e.statusCode = statusCode || 400;
    if (extra) Object.assign(e, extra);
    return e;
  }

  return { create };
})();
