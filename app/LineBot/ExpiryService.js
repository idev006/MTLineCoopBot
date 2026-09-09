/**
 * @fileoverview LineBot.ExpiryService
 * ตรวจสอบวันหมดอายุสมาชิกอัตโนมัติ (การ์ด MT-11 — บทที่ 7 ระยะ 2)
 *
 * - runExpiryCheck()  — scan สมาชิกทั้งหมด → push คำเตือนก่อนหมดอายุ (expiring)
 *                       / แจ้งหมดอายุ + unlink เมนูสมาชิก (expired)
 * - setupExpiryTrigger() — สร้าง Time-driven Trigger รายวัน (รันครั้งเดียวใน Editor)
 *
 * ⚠️ ใช้ Push API (ต่างจาก Reply) — ต้องใช้ userId ไม่ใช่ replyToken และไม่มีข้อจำกัด 60 วินาที
 */

var LineBot = LineBot || {};

LineBot.ExpiryService = (() => {
  'use strict';

  /**
   * รันรอบตรวจวันหมดอายุ (entry point ของ scheduled trigger)
   * @returns {{checked: number, logged: number, expiring: number, expired: number, pushed: number}}
   */
  function runExpiryCheck() {
    return Composition.SystemFactory.createSystem().expiryScan.execute();
  }

  /**
   * สร้าง Time-driven Trigger รายวัน (รันครั้งเดียวใน Apps Script Editor)
   * @param {number} [hourOfDay] - เวลารัน (ค่า default 9 = 09:00)
   * @returns {Object} trigger ที่สร้าง
   */
  function setupExpiryTrigger(hourOfDay) {
    const h = typeof hourOfDay === 'number' ? hourOfDay : 9;
    const trigger = ScriptApp.newTrigger('runExpiryCheck')
      .timeBased()
      .atHour(h)
      .everyDays(1)
      .create();
    Logger.log(`สร้าง trigger รายวันเวลา ${h}:00 — ตรวจวันหมดอายุอัตโนมัติ (${trigger.getUniqueId()})`);
    return trigger;
  }

  return {
    runExpiryCheck,
    setupExpiryTrigger
  };
})();

/**
 * Entry point สำหรับ Time-driven Trigger — เลือกฟังก์ชันนี้ใน Apps Script Editor
 * (Apps Script เรียก function ระดับบนสุดได้เท่านั้น — ตัวนี้เป็นตัวส่งต่อให้ ExpiryService)
 */
function runExpiryCheck() {
  const cfg = Config.validate();
  return LineBot.ExpiryService.runExpiryCheck(cfg.CHANNEL_ACCESS_TOKEN);
}
