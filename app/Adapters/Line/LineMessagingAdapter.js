/**
 * @fileoverview Adapters.Line.LineMessagingAdapter
 * Maps semantic application messages to LINE presentation/sending.
 */
var Adapters = Adapters || {};
Adapters.Line = Adapters.Line || {};

Adapters.Line.LineMessagingAdapter = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const tokenProvider = d.tokenProvider;
    if (typeof tokenProvider !== 'function') {
      throw new Error('LineMessagingAdapter requires tokenProvider()');
    }

    function send(message) {
      const m = message || {};
      const token = tokenProvider();
      if (!m.recipient) return { ok:false, statusCode:0, body:'missing recipient' };

      if (m.type === 'expiry-warning') {
        const text = LineBot.MemberDataService.buildExpiryWarning(m.payload.member, m.payload.expiry);
        return LineBot.MessageService.push(m.recipient, text, token);
      }

      if (m.type === 'notice') {
        const card = LineBot.FlexBuilder.noticeCard(m.payload.notice);
        return LineBot.MessageService.pushFlex(m.recipient, card, token);
      }

      if (m.type === 'loan-reminder') {
        const p = m.payload;
        const card = LineBot.FlexBuilder.loanReminderCard(p.loan, p.member, p.daysLeft);
        return LineBot.MessageService.pushFlex(m.recipient, card, token);
      }

      throw new Error('Unsupported message type: ' + String(m.type || ''));
    }

    return Object.freeze({ send });
  }

  return { create };
})();
