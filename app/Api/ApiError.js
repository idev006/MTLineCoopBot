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
   * @returns {Error} error ที่มี .code และ .statusCode
   */
  function create(code, message, statusCode) {
    const e = new Error(message || code);
    e.code = code;
    e.statusCode = statusCode || 400;
    return e;
  }

  return { create };
})();
