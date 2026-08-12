/**
 * @fileoverview Api.ApiService
 * จุดเข้าหลักของ API Layer (บทที่ 3.1.1) — UI Adapter ใด ๆ เรียกผ่านนี้
 * (LINE Bot / LIFF / Admin Dashboard — เฟส 3)
 *
 * ตัวอย่างเรียกจาก Bot (UI Adapter):
 *   const envelope = Api.ApiService.handleRequest('GET', '/api/member/profile',
 *     { query: { lineUserId }, auth: { lineUserId } });
 *   // → { ok: true, data: {...} } หรือ { ok: false, error: { code, message } }
 *
 * การ์ด MT-16 — API Layer (เฟส 3)
 */

var Api = Api || {};

Api.ApiService = (() => {
  'use strict';

  /**
   * @param {string} method - GET / POST
   * @param {string} path - เช่น '/api/member/profile'
   * @param {Object} [options]
   * @param {Object} [options.query] - query parameters
   * @param {Object} [options.body] - request body (POST)
   * @param {Object} [options.headers]
   * @param {Object} [options.auth] - ข้อมูลผู้ยืนยันตัวตน (เฟส 3: ID Token JWT / API Key)
   * @param {Object} [options.internal] - seam ภายใน (การ์ด MT-17): ใช้สำหรับ DI เช่น `now`
   *   ให้ handler คำนวณด้วยเวลาที่กำหนด (deterministic ในเทสต์) — WebApp/HTTP mount ไม่ส่งค่านี้
   * @returns {Object} envelope { ok, data } | { ok, error }
   */
  function handleRequest(method, path, options) {
    const o = options || {};
    const ctx = {
      query: o.query || {},
      body: o.body || {},
      headers: o.headers || {},
      auth: o.auth || {},
      internal: o.internal || {}
    };
    return Api.ApiRegistry.dispatch(method, path, ctx);
  }

  return { handleRequest };
})();
