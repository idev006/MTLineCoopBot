/**
 * @fileoverview Util
 * ฟังก์ชันอรรถประโยชน์ทั่วไป
 */

const Util = (() => {
  'use strict';

  /**
   * แปลง query string เป็น object
   * @param {string} str
   * @returns {Object}
   */
  function parseQueryString(str) {
    const result = {};
    if (!str) return result;
    str.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key) {
        result[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });
    return result;
  }

  /**
   * ตรวจสอบ webhook_secret จาก query parameter ของ Web App URL
   *
   * หมายเหตุสำคัญ: Google Apps Script Web App ไม่ expose request headers
   * (ดู issuetracker.google.com/issues/67764685) ดังนั้นจึงไม่สามารถอ่าน
   * X-Line-Signature ได้โดยตรง — แนวทางที่ใช้ได้คือผูก secret ไว้ท้าย Webhook URL
   * เช่น https://script.google.com/macros/s/.../exec?webhook_secret=XXX
   * และ LINE จะส่ง query string นี้มาด้วยทุกครั้ง
   *
   * @param {Object} e - event object จาก doPost(e)
   * @param {string} expectedSecret - ค่า WEBHOOK_SECRET จาก Script Properties
   * @returns {boolean}
   */
  function verifyWebhookSecret(e, expectedSecret) {
    if (!expectedSecret) return false;
    const actual = (e && e.parameter && e.parameter.webhook_secret) || '';
    return actual === expectedSecret;
  }

  /**
   * ตรวจสอบลายเซ็น X-Line-Signature: Base64(HMAC-SHA256(body, channelSecret))
   *
   * หมายเหตุ: ปัจจุบัน Apps Script Web App อ่าน header ไม่ได้ ฟังก์ชันนี้พร้อมใช้
   * เมื่อมี proxy (เช่น Cloudflare Worker) ตรวจ signature แทน แล้วส่งผลผ่าน query param
   * หรือเมื่อแพลตฟอร์มรองรับ headers ในอนาคต
   *
   * @param {string} body - raw request body (e.postData.contents)
   * @param {string} signature - ค่า X-Line-Signature
   * @param {string} channelSecret - Channel Secret จาก LINE Console
   * @returns {boolean}
   */
  function verifyLineSignature(body, signature, channelSecret) {
    if (!body || !signature || !channelSecret) return false;
    const digest = Utilities.computeHmacSha256Signature(body, channelSecret);
    const expected = Utilities.base64Encode(digest);
    return expected === signature;
  }

  return {
    parseQueryString,
    verifyWebhookSecret,
    verifyLineSignature
  };
})();
