/**
 * @fileoverview Api.ApiRegistry
 * Registry Routing (บทที่ 3.1.1) — ตาราง route แทน if/else ยาว
 *
 * เพิ่ม endpoint = เพิ่ม 1 รายการใน ROUTES (พร้อม handler ใน Api.ApiHandlers)
 * ลำดับ: Router (registry) → Handler → Responder (envelope)
 *
 * การ์ด MT-16 — API Layer (เฟส 3)
 */

var Api = Api || {};

Api.ApiRegistry = (() => {
  'use strict';

  let ROUTES = null;

  /**
   * สร้างตาราง route (lazy — resolve Api.ApiHandlers ตอนเรียกครั้งแรก
   * เพื่อกันปัญหา Apps Script load order)
   * @returns {Array<{method: string, path: string, handler: Function, auth: string}>}
   */
  function ensureRoutes() {
    if (ROUTES) return ROUTES;
    const h = Api.ApiHandlers;
    ROUTES = [
      { method: 'GET', path: '/api/health', handler: h.health, auth: 'none' },
      { method: 'GET', path: '/api/member/profile', handler: h.getProfile, auth: 'line' },
      { method: 'GET', path: '/api/member/savings', handler: h.getSavings, auth: 'line' },
      { method: 'GET', path: '/api/member/loans', handler: h.getLoans, auth: 'line' },
      { method: 'GET', path: '/api/member/dividends', handler: h.getDividends, auth: 'line' },
      { method: 'GET', path: '/api/member/validity', handler: h.getValidity, auth: 'line' },
      { method: 'POST', path: '/api/member/activate', handler: h.activate, auth: 'line' }
    ];
    return ROUTES;
  }

  /**
   * หา route ที่ตรง method + path (exact match)
   * @param {string} method - GET/POST
   * @param {string} path
   * @returns {Object|null}
   */
  function matchRoute(method, path) {
    const routes = ensureRoutes();
    for (const r of routes) {
      if (r.method !== method) continue;
      if (r.path === path) return r;
    }
    return null;
  }

  /**
   * dispatch: ค้น route → เรียก handler → ตอบ envelope
   * (Router → Handler → Responder — บทที่ 3.1.1)
   * @param {string} method
   * @param {string} path
   * @param {Object} [ctx] - { query, body, headers, auth }
   * @returns {Object} envelope { ok, data } | { ok, error }
   */
  function dispatch(method, path, ctx) {
    const m = String(method || '').toUpperCase();
    const route = matchRoute(m, path);
    if (!route) {
      const exists = ensureRoutes().some(r => r.path === path);
      return exists
        ? Api.ApiResponse.methodNotAllowed(m, path)
        : Api.ApiResponse.notFound(path);
    }
    try {
      const result = route.handler(ctx || {});
      return Api.ApiResponse.ok(result);
    } catch (e) {
      if (e && e.code) {
        // Api.ApiError ที่ handler throw — ส่ง code/message ไปที่ client
        return Api.ApiResponse.error(e.code, e.message);
      }
      Logger.log(`[API] handler error ${m} ${path}: ${e}`);
      return Api.ApiResponse.internal();
    }
  }

  /**
   * รายการ route ทั้งหมด (สำหรับเอกสาร/debug)
   * @returns {Array<{method: string, path: string, auth: string}>}
   */
  function listRoutes() {
    return ensureRoutes().map(r => ({ method: r.method, path: r.path, auth: r.auth }));
  }

  return {
    dispatch,
    matchRoute,
    listRoutes
  };
})();
