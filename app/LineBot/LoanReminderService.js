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
 * DI: opts.repo / opts.sender / opts.now / opts.reminderDays / opts.builder / opts.logger
 * ค่า default builder = FlexBuilder.loanReminderCard (Flex Card รายบุคคล — การ์ด MT-36)
 * ต่างจาก broadcast ประกาศ: ข้อความเป็นรายบุคคล (ไม่ใช่ข้อความเดียวถึงทุกคน) และ
 * audit trail ทุกสัญญาที่ถึงรอบเตือน (reminded / skipped — ไม่มี userId หรือไม่ active)
 */

var LineBot = LineBot || {};

LineBot.LoanReminderService = (() => {
  'use strict';

  /**
   * รันรอบเตือนชำระ (entry point ของ scheduled trigger)
   * @param {string} token - CHANNEL_ACCESS_TOKEN
   * @param {Object} [opts] - { repo, sender, now, reminderDays, builder, logger }
   * @returns {{loans: number, due: number, reminded: number, skipped: number, pushed: number}}
   */
  function runLoanReminders(token, opts) {
    const o = opts || {};
    const repo = o.repo || Data.MemberRepository.getRepository();
    const now = o.now || new Date();
    const reminderDays = o.reminderDays !== undefined ? o.reminderDays : Config.get().PAYMENT_REMINDER_DAYS;
    const sender = o.sender || function (to, msg, tk) { return LineBot.MessageService.pushFlex(to, msg, tk); };
    const builder = o.builder || LineBot.FlexBuilder.loanReminderCard;
    const logger = o.logger || function (entry) { return repo.logReminder(entry); };

    const loans = repo.listLoans();
    const members = repo.listMembers();
    const due = Core.LoanRules.getDueLoans(loans, now, reminderDays);

    const summary = { loans: loans.length, due: due.length, reminded: 0, skipped: 0, pushed: 0 };

    for (const { loan, daysLeft } of due) {
      // หาสมาชิกของสัญญา เพื่อจัดข้อความรายบุคคล + ตรวจว่า push ได้หรือไม่
      const member = (members || []).find(m => m && m.mem_code === loan.mem_code) || null;
      if (!Core.LoanRules.isReminderTarget(member)) {
        logger({
          memCode: loan.mem_code,
          loanNo: loan.loan_no,
          dueDt: loan.due_dt,
          daysLeft: daysLeft,
          status: 'skipped',
          remindedDt: now
        });
        summary.skipped++;
        continue;
      }
      const text = builder(loan, member, daysLeft);
      sender(member.line_user_id, text, token);
      summary.pushed++;
      logger({
        memCode: loan.mem_code,
        loanNo: loan.loan_no,
        dueDt: loan.due_dt,
        daysLeft: daysLeft,
        status: 'reminded',
        remindedDt: now
      });
      summary.reminded++;
    }

    Logger.log(`[LoanReminder] loans=${summary.loans} due=${summary.due} reminded=${summary.reminded} skipped=${summary.skipped} pushed=${summary.pushed}`);
    return summary;
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
  return LineBot.LoanReminderService.runLoanReminders(cfg.CHANNEL_ACCESS_TOKEN);
}
