/**
 * @fileoverview Api.ApiResponse
 * มาตรฐานคำตอบของ API (JSON Envelope — บทที่ 3.1.1)
 *
 * ทุก endpoint ตอบในรูปแบบเดียวกันเสมอ:
 *   สำเร็จ: { ok: true,  data: {...} }
 *   ผิดพลาด: { ok: false, error: { code: '...', message: '...' } }
 *
 * การ์ด MT-16 — API Layer (เฟส 3)
 */

var Api = Api || {};

Api.ApiResponse = (() => {
  'use strict';

  /**
   * คำตอบสำเร็จ
   * @param {*} [data]
   * @returns {{ok: boolean, data: *}}
   */
  function ok(data) {
    return { ok: true, data: (data === undefined ? null : data) };
  }

  /**
   * คำตอบผิดพลาด — error มี code (machine-readable) + message (อ่านง่าย)
   * @param {string} code - เช่น 'MEMBER_NOT_FOUND' / 'VALIDATION' / 'INTERNAL'
   * @param {string} [message]
   * @param {Object} [extra] - ข้อมูลเพิ่มใน error object
   * @returns {{ok: boolean, error: {code: string, message: string}}}
   */
  function error(code, message, extra) {
    const err = { code: code || 'INTERNAL', message: message || 'เกิดข้อผิดพลาดภายใน' };
    if (extra) Object.assign(err, extra);
    return { ok: false, error: err };
  }

  /** endpoint ไม่มีใน registry */
  function notFound(path) {
    return error('NOT_FOUND', 'ไม่พบ endpoint: ' + path);
  }

  /** method ไม่ถูกต้อง (เช่น POST ไปที่ route GET) */
  function methodNotAllowed(method, path) {
    return error('METHOD_NOT_ALLOWED', method + ' ' + path + ' ไม่อนุญาต');
  }

  /** พารามิเตอร์/ข้อมูลไม่ถูกต้อง */
  function validation(message) {
    return error('VALIDATION', message || 'ข้อมูลที่ส่งมาไม่ถูกต้อง');
  }

  /** ข้อผิดพลาดภายใน (ไม่รั่วรายละเอียด) */
  function internal() {
    return error('INTERNAL', 'เกิดข้อผิดพลาดภายในระบบ');
  }

  /**
   * แปลง envelope เป็น HTTP response
   * @param {Object} envelope
   * @param {number} [statusCode] - 200 ถ้า ok / 400 ถ้า error (บังคับเองได้)
   * @returns {{statusCode: number, body: string}}
   */
  function toHttp(envelope, statusCode) {
    const code = statusCode || (envelope.ok ? 200 : 400);
    return {
      statusCode: code,
      body: JSON.stringify(envelope)
    };
  }

  return {
    ok,
    error,
    notFound,
    methodNotAllowed,
    validation,
    internal,
    toHttp
  };
})();
