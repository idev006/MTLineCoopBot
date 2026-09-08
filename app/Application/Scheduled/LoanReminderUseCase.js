/**
 * @fileoverview Application.Scheduled.LoanReminderUseCase
 */
var Application = Application || {};
Application.Scheduled = Application.Scheduled || {};

Application.Scheduled.LoanReminderUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const clock = Ports.ClockPort.assertImplemented(d.clock);
    const config = Ports.ConfigPort.assertImplemented(d.config);
    const messaging = Ports.MessagingPort.assertImplemented(d.messaging);
    const audit = Ports.AuditPort.assertImplemented(d.audit);

    function execute() {
      const now = clock.now();
      const reminderDays = config.get().PAYMENT_REMINDER_DAYS;
      const loans = repo.listLoans() || [];
      const members = repo.listMembers() || [];
      const due = Core.LoanRules.getDueLoans(loans, now, reminderDays);
      const summary = { loans: loans.length, due: due.length, reminded: 0, skipped: 0, pushed: 0 };

      for (const item of due) {
        const loan = item.loan;
        const daysLeft = item.daysLeft;
        const member = members.find(m => m && m.mem_code === loan.mem_code) || null;

        if (!Core.LoanRules.isReminderTarget(member)) {
          audit.record({
            type: 'loan.reminder',
            memberCode: loan.mem_code,
            loanNo: loan.loan_no,
            dueDt: loan.due_dt,
            daysLeft,
            status: 'skipped',
            remindedDt: now
          });
          summary.skipped++;
          continue;
        }

        messaging.send({
          type: 'loan-reminder',
          recipient: member.line_user_id,
          payload: { loan, member, daysLeft }
        });
        summary.pushed++;

        audit.record({
          type: 'loan.reminder',
          memberCode: loan.mem_code,
          loanNo: loan.loan_no,
          dueDt: loan.due_dt,
          daysLeft,
          status: 'reminded',
          remindedDt: now
        });
        summary.reminded++;
      }

      return summary;
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
