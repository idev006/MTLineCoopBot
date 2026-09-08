/**
 * @fileoverview Application.Scheduled.ExpiryScanUseCase
 */
var Application = Application || {};
Application.Scheduled = Application.Scheduled || {};

Application.Scheduled.ExpiryScanUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const clock = Ports.ClockPort.assertImplemented(d.clock);
    const config = Ports.ConfigPort.assertImplemented(d.config);
    const messaging = Ports.MessagingPort.assertImplemented(d.messaging);
    const memberMenu = Ports.MemberMenuPort.assertImplemented(d.memberMenu);
    const audit = Ports.AuditPort.assertImplemented(d.audit);

    function execute() {
      const now = clock.now();
      const cfg = config.get();
      const warningDays = cfg.EXPIRY_WARNING_DAYS;
      const members = repo.listMembers() || [];
      const summary = { checked: members.length, logged: 0, expiring: 0, expired: 0, pushed: 0 };

      for (const member of members) {
        if (!member || member.mem_status !== 'active' || !member.line_user_id) continue;

        const expiry = Core.MemberRules.getExpiryStatus(member, now, warningDays);
        audit.record({
          type: 'member.expiry.checked',
          memberCode: member.mem_code,
          lineUserId: member.line_user_id,
          status: expiry.status,
          daysLeft: expiry.daysLeft,
          memExpDt: member.mem_exp_dt,
          checkedDt: now
        });
        summary.logged++;

        if (expiry.status === 'expired' || expiry.status === 'expiring') {
          messaging.send({
            type: 'expiry-warning',
            recipient: member.line_user_id,
            payload: { member, expiry }
          });
          summary.pushed++;
        }

        if (expiry.status === 'expired') {
          summary.expired++;
          memberMenu.revokeMemberMenu(member.line_user_id);
        } else if (expiry.status === 'expiring') {
          summary.expiring++;
        }
      }

      return summary;
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
