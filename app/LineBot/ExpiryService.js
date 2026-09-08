/**
 * @fileoverview LineBot.ExpiryService
 * Thin scheduled delivery adapter over Application.Scheduled.ExpiryScanUseCase.
 *
 * Business scan/policy is headless. This adapter owns LINE message formatting,
 * push delivery, Rich Menu unlinking, trigger setup and compatibility DI.
 */

var LineBot = LineBot || {};

LineBot.ExpiryService = (() => {
  'use strict';

  function makeExecution(o) {
    const system = Composition.SystemFactory.createSystem();
    const hasOverrides = o.repo || o.now || o.warningDays !== undefined || o.logger;

    if (!hasOverrides) return system.expiryScan;

    const repo = o.repo || system.memberRepository;
    const fixedNow = o.now || system.clock.now();
    const clock = { now: function () { return fixedNow; } };
    const baseCfg = system.config.get();
    const config = {
      get: function () {
        return Object.assign({}, baseCfg, {
          EXPIRY_WARNING_DAYS: o.warningDays !== undefined
            ? o.warningDays
            : baseCfg.EXPIRY_WARNING_DAYS
        });
      }
    };

    let audit;
    if (o.logger) {
      audit = {
        record: function (event) {
          return o.logger(
            {
              mem_code: event.memberCode,
              line_user_id: event.lineUserId,
              mem_exp_dt: event.memExpDt
            },
            {
              status: event.status,
              daysLeft: event.daysLeft
            }
          );
        }
      };
    } else if (o.repo) {
      audit = Adapters.Audit.MemberRepositoryAuditAdapter.create({
        memberRepository: repo
      });
    } else {
      audit = system.audit;
    }

    return Application.Scheduled.ExpiryScanUseCase.create({
      memberRepository: repo,
      clock,
      config,
      audit
    });
  }

  /**
   * Scheduled delivery entry.
   * @param {string} token
   * @param {Object} [opts] compatibility DI: repo/now/warningDays/logger/sender/unlinker
   * @returns {{checked:number,logged:number,expiring:number,expired:number,pushed:number}}
   */
  function runExpiryCheck(token, opts) {
    const o = opts || {};
    const sender = o.sender || function (to, text, tk) {
      return LineBot.MessageService.push(to, text, tk);
    };
    const unlinker = o.unlinker || function (lineUserId, tk) {
      try {
        return RichMenu.Gating.unlinkMemberMenu(lineUserId, tk);
      } catch (e) {
        return { ok: false };
      }
    };

    const result = makeExecution(o).execute();
    if (!result || !result.ok) {
      throw new Error('ExpiryScanUseCase failed');
    }

    const data = result.data;
    let pushed = 0;

    for (const action of data.actions) {
      const member = action.member;
      const expiry = action.expiry;
      const text = LineBot.MemberDataService.buildExpiryWarning(member, expiry);
      sender(member.line_user_id, text, token);
      pushed++;

      if (action.type === 'member.expired') {
        unlinker(member.line_user_id, token);
      }
    }

    const summary = {
      checked: data.summary.checked,
      logged: data.summary.logged,
      expiring: data.summary.expiring,
      expired: data.summary.expired,
      pushed
    };

    Logger.log(
      '[ExpiryCheck] checked=' + summary.checked +
      ' logged=' + summary.logged +
      ' expiring=' + summary.expiring +
      ' expired=' + summary.expired +
      ' pushed=' + summary.pushed
    );
    return summary;
  }

  function setupExpiryTrigger(hourOfDay) {
    const h = typeof hourOfDay === 'number' ? hourOfDay : 9;
    const trigger = ScriptApp.newTrigger('runExpiryCheck')
      .timeBased()
      .atHour(h)
      .everyDays(1)
      .create();
    Logger.log('สร้าง trigger รายวันเวลา ' + h + ':00 — ตรวจวันหมดอายุอัตโนมัติ (' +
      trigger.getUniqueId() + ')');
    return trigger;
  }

  return {
    runExpiryCheck,
    setupExpiryTrigger
  };
})();

function runExpiryCheck() {
  const cfg = Config.validate();
  return LineBot.ExpiryService.runExpiryCheck(cfg.CHANNEL_ACCESS_TOKEN);
}
