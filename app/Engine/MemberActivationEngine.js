/**
 * @fileoverview Engine.MemberActivationEngine
 * Pure deterministic activation policy.
 */
var Engine = Engine || {};

Engine.MemberActivationEngine = (() => {
  'use strict';

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function formatDateTime(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function plan(member, lineUserId, now) {
    if (!member) return { ok:false, error:{code:'MEMBER_NOT_FOUND'} };
    if (!lineUserId) return { ok:false, error:{code:'VALIDATION'} };
    if (member.mem_eff_dt && String(member.mem_eff_dt).trim() !== '') {
      return { ok:false, error:{code:'ALREADY_ACTIVATED'} };
    }

    const eff = new Date(now);
    const exp = new Date(eff);
    exp.setDate(exp.getDate() + 365);

    return {
      ok:true,
      activation:{
        memEffDt: formatDateTime(eff),
        memExpDt: formatDateTime(exp),
        memStatus:'active',
        lineUserId
      }
    };
  }

  return Object.freeze({ plan, formatDateTime });
})();
