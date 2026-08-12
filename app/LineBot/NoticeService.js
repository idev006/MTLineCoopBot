/**
 * @fileoverview LineBot.NoticeService
 * Broadcast ประกาศ/ข่าวสารถึงสมาชิก (การ์ด MT-13 — บทที่ 7 ระยะ 2)
 *
 * - runNoticeBroadcast()  — scan ประกาศที่พร้อมส่งจาก t_notice → push ถึงสมาชิก
 *                           active ทุกคนที่มี line_user_id → mark sent (กันส่งซ้ำ)
 * - setupNoticeTrigger()  — สร้าง Time-driven Trigger รายวัน (รันครั้งเดียวใน Editor)
 *
 * DI สำหรับทดสอบ (node): opts.repo / opts.sender / opts.now / opts.builder
 * ค่า default = repository จริง / MessageService.push / เวลาจริง / Core.NoticeRules
 *
 * ⚠️ ใช้ Push API (ต่างจาก Reply) — ต้องใช้ userId ไม่ใช่ replyToken
 * สมาชิกที่ไม่มี line_user_id (ยังไม่ activate) จะถูกข้าม — เป็นกลุ่มเป้าหมายที่
 * ระบบรู้จักได้จริง (LINE ไม่อนุญาต broadcast ไปยังผู้ที่ไม่เป็นเพื่อน)
 */

var LineBot = LineBot || {};

LineBot.NoticeService = (() => {
  'use strict';

  /**
   * รันรอบ broadcast ประกาศ (entry point ของ scheduled trigger)
   * @param {string} token - CHANNEL_ACCESS_TOKEN
   * @param {Object} [opts] - { repo, sender, now, builder }
   * @returns {{notices: number, pending: number, sent: number, targets: number, pushed: number}}
   */
  function runNoticeBroadcast(token, opts) {
    const o = opts || {};
    const repo = o.repo || Data.MemberRepository.getRepository();
    const now = o.now || new Date();
    const sender = o.sender || function (to, text, tk) { return LineBot.MessageService.push(to, text, tk); };
    const builder = o.builder || Core.NoticeRules.buildNoticeText;

    const notices = repo.listNotices();
    const pending = Core.NoticeRules.getPendingNotices(notices, now);
    const members = repo.listMembers();
    const targets = Core.NoticeRules.getBroadcastTargets(members);

    const summary = {
      notices: notices.length,
      pending: pending.length,
      sent: 0,
      targets: targets.length,
      pushed: 0
    };

    for (const notice of pending) {
      const text = builder(notice);
      for (const member of targets) {
        sender(member.line_user_id, text, token);
        summary.pushed++;
      }
      // กันส่งซ้ำรอบถัดไป: mark sent (แม้ targets = 0 ก็ mark — ประกาศนั้นจบรอบแล้ว)
      repo.markNoticeSent(notice.notice_id, now);
      summary.sent++;
    }

    Logger.log(`[NoticeBroadcast] notices=${summary.notices} pending=${summary.pending} sent=${summary.sent} targets=${summary.targets} pushed=${summary.pushed}`);
    return summary;
  }

  /**
   * สร้าง Time-driven Trigger รายวัน (รันครั้งเดียวใน Apps Script Editor)
   * @param {number} [hourOfDay] - เวลารัน (ค่า default 9 = 09:00)
   * @returns {Object} trigger ที่สร้าง
   */
  function setupNoticeTrigger(hourOfDay) {
    const h = typeof hourOfDay === 'number' ? hourOfDay : 9;
    const trigger = ScriptApp.newTrigger('runNoticeBroadcast')
      .timeBased()
      .atHour(h)
      .everyDays(1)
      .create();
    Logger.log(`สร้าง trigger รายวันเวลา ${h}:00 — broadcast ประกาศ (${trigger.getUniqueId()})`);
    return trigger;
  }

  return {
    runNoticeBroadcast,
    setupNoticeTrigger
  };
})();

/**
 * Entry point สำหรับ Time-driven Trigger — เลือกฟังก์ชันนี้ใน Apps Script Editor
 * (Apps Script เรียก function ระดับบนสุดได้เท่านั้น — ตัวนี้เป็นตัวส่งต่อให้ NoticeService)
 */
function runNoticeBroadcast() {
  const cfg = Config.validate();
  return LineBot.NoticeService.runNoticeBroadcast(cfg.CHANNEL_ACCESS_TOKEN);
}
