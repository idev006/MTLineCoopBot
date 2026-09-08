/**
 * @fileoverview Application.Scheduled.ExpiryScanUseCase
 * Headless expiry scanning orchestration.
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
    const audit = Ports.AuditPort.assertImplemented(d.audit);

    function execute() {
      const now = clock.now();
      const cfg = config.get();
      const warningDays = cfg.EXPIRY_WARNING_DAYS;
      const members = repo.listMembers() || [];
      const actions = [];
      const summary = {
        checked: members.length,
        logged: 0,
        expiring: 0,
        expired: 0,
        actionable: 0
      };

      for (const member of members) {
        if (!member || member.mem_status !== 'active' || !member.line_user_id) continue;

        const expiry = Core.MemberRules.getExpiryStatus(member, now, warningDays);

        audit.record({
          type: 'member.expiry_checked',
          memberCode: member.mem_code,
          lineUserId: member.line_user_id,
          status: expiry.status,
          daysLeft: expiry.daysLeft,
          memExpDt: member.mem_exp_dt,
          checkedAt: now
        });
        summary.logged++;

        if (expiry.status === 'expired') {
          summary.expired++;
          summary.actionable++;
          actions.push({
            type: 'member.expired',
            member,
            expiry
          });
        } else if (expiry.status === 'expiring') {
          summary.expiring++;
          summary.actionable++;
          actions.push({
            type: 'member.expiring',
            member,
            expiry
          });
        }
      }

      return {
        ok: true,
        data: {
          summary,
          actions
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
