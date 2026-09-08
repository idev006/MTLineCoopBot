/**
 * @fileoverview Application.Scheduled.NoticeBroadcastUseCase
 */
var Application = Application || {};
Application.Scheduled = Application.Scheduled || {};

Application.Scheduled.NoticeBroadcastUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const clock = Ports.ClockPort.assertImplemented(d.clock);
    const messaging = Ports.MessagingPort.assertImplemented(d.messaging);

    function execute() {
      const now = clock.now();
      const notices = repo.listNotices() || [];
      const pending = Core.NoticeRules.getPendingNotices(notices, now);
      const members = repo.listMembers() || [];
      const targets = Core.NoticeRules.getBroadcastTargets(members);

      const summary = {
        notices: notices.length,
        pending: pending.length,
        sent: 0,
        targets: targets.length,
        pushed: 0
      };

      for (const notice of pending) {
        for (const member of targets) {
          messaging.send({
            type: 'notice',
            recipient: member.line_user_id,
            payload: { notice }
          });
          summary.pushed++;
        }
        repo.markNoticeSent(notice.notice_id, now);
        summary.sent++;
      }

      return summary;
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
