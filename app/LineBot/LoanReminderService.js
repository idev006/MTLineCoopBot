/**
 * @fileoverview LineBot.LoanReminderService
 * เตือนชำระหนี้ (payment reminders — การ์ด MT-13b, บทที่ 7 ระยะ 2)
 * ใช้ pattern เดียวกับ ExpiryService/NoticeService (DI สำหรับทดสอบใน node)
 *
 * - runLoanReminders() — scan t_loan_acct → สัญญาที่ due_dt ในหน้าต่าง
 *                        PAYMENT_REMINDER_DAYS (default 14 วัน) → push ข้อความ
 *                        เตือน**รายบุคคล** (ชื่อสมาชิกจริง) → บันทึก t_reminder_log
 * - setupReminderTrigger() — สร้าง Time-driven Trigger รายวัน
 *
 * ต่างจาก broadcast ประกาศ: ข้อความเป็นรายบุคคล (ไม่ใช่ข้อความเดียวถึงทุกคน) และ
 * audit trail ทุกสัญญาที่ถึงรอบเตือน (reminded / skipped — ไม่มี userId หรือไม่ active)
 */

var LineBot = LineBot || {};

LineBot.LoanReminderService = (() => {
  'use strict';

  /**
   * รันรอบเตือนชำระ (entry point ของ scheduled trigger)
   * @returns {{loans: number, due: number, reminded: number, skipped: number, pushed: number}}
   */
  function runLoanReminders() {
    return Composition.SystemFactory.createSystem().loanReminder.execute();
  }

  /**
   * สร้าง Time-driven Trigger รายวัน (รันครั้งเดียวใน Apps Script Editor)
   * @param {number} [hourOfDay] - เวลารัน (ค่า default 9 = 09:00)
   * @returns {Object} trigger ที่สร้าง
   */
  function setupReminderTrigger(hourOfDay) {
    const h = typeof hourOfDay === 'number' ? hourOfDay : 9;
    const trigger = ScriptApp.newTrigger('runLoanReminders')
      .timeBased()
      .atHour(h)
      .everyDays(1)
      .create();
    Logger.log(`สร้าง trigger รายวันเวลา ${h}:00 — เตือนชำระหนี้ (${trigger.getUniqueId()})`);
    return trigger;
  }

  return {
    runLoanReminders,
    setupReminderTrigger
  };
})();

/**
 * Entry point สำหรับ Time-driven Trigger — เลือกฟังก์ชันนี้ใน Apps Script Editor
 */
function runLoanReminders() {
  const cfg = Config.validate();
  return LineBot.LoanReminderService.runLoanReminders();
}
