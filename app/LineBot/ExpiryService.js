/**
 * @fileoverview LineBot.ExpiryService
 * ตรวจสอบวันหมดอายุสมาชิกอัตโนมัติ (การ์ด MT-11 — บทที่ 7 ระยะ 2)
 *
 * - runExpiryCheck()  — scan สมาชิกทั้งหมด → push คำเตือนก่อนหมดอายุ (expiring)
 *                       / แจ้งหมดอายุ + unlink เมนูสมาชิก (expired)
 * - setupExpiryTrigger() — สร้าง Time-driven Trigger รายวัน (รันครั้งเดียวใน Editor)
 *
 * DI สำหรับทดสอบ (node): opts.sender / opts.unlinker / opts.now / opts.warningDays / opts.repo
 * ค่า default = MessageService.push / Gating.unlinkMemberMenu / เวลาจริง / Config / repository จริง
 *
 * ⚠️ ใช้ Push API (ต่างจาก Reply) — ต้องใช้ userId ไม่ใช่ replyToken และไม่มีข้อจำกัด 60 วินาที
 */

var LineBot = LineBot || {};

LineBot.ExpiryService = (() => {
  'use strict';

  /**
   * รันรอบตรวจวันหมดอายุ (entry point ของ scheduled trigger)
   * @param {string} token - CHANNEL_ACCESS_TOKEN
   * @param {Object} [opts] - { warningDays, now, sender, unlinker, repo }
   * @returns {{checked: number, expiring: number, expired: number, pushed: number}}
   */
  function runExpiryCheck(token, opts) {
    const o = opts || {};
    const repo = o.repo || Data.MemberRepository.getRepository();
    const warningDays = o.warningDays !== undefined ? o.warningDays : Config.get().EXPIRY_WARNING_DAYS;
    const now = o.now || new Date();
    const sender = o.sender || function (to, text, tk) { return LineBot.MessageService.push(to, text, tk); };
    const unlinker = o.unlinker || function (lineUserId, tk) {
      try { return RichMenu.Gating.unlinkMemberMenu(lineUserId, tk); } catch (e) { return { ok: false }; }
    };

    const members = repo.listMembers();
    const summary = { checked: members.length, expiring: 0, expired: 0, pushed: 0 };

    for (const member of members) {
      // ตรวจเฉพาะสมาชิก active และมี LINE userId (activated)
      if (member.mem_status !== 'active') continue;
      if (!member.line_user_id) continue;

      const expiry = Core.MemberRules.getExpiryStatus(member, now, warningDays);
      if (expiry.status === 'expired') {
        summary.expired++;
        const text = LineBot.MemberDataService.buildExpiryWarning(member, expiry);
        sender(member.line_user_id, text, token);
        unlinker(member.line_user_id, token); // หมดอายุ → ยกเลิกเมนูสมาชิก (กลับไป Welcome)
        summary.pushed++;
      } else if (expiry.status === 'expiring') {
        summary.expiring++;
        const text = LineBot.MemberDataService.buildExpiryWarning(member, expiry);
        sender(member.line_user_id, text, token);
        summary.pushed++;
      }
    }

    Logger.log(`[ExpiryCheck] checked=${summary.checked} expiring=${summary.expiring} expired=${summary.expired} pushed=${summary.pushed}`);
    return summary;
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
