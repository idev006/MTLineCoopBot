/**
 * @fileoverview Application.Member.ActivateMemberUseCase
 * Headless activation orchestration.
 */
var Application = Application || {};
Application.Member = Application.Member || {};

Application.Member.ActivateMemberUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const clock = Ports.ClockPort.assertImplemented(d.clock);
    const activationEngine = d.activationEngine || Engine.MemberActivationEngine;

    if (!activationEngine || typeof activationEngine.plan !== 'function') {
      throw new Error('activationEngine dependency is required');
    }

    function execute(input) {
      const x = input || {};
      const activateCode = String(x.activateCode || '').trim();
      const lineUserId = String(x.lineUserId || '').trim();

      if (!activateCode || !lineUserId) {
        return { ok:false, error:{code:'VALIDATION'} };
      }

      const member = repo.findByActivateCode(activateCode);
      if (!member) {
        return { ok:false, error:{code:'MEMBER_NOT_FOUND'} };
      }

      const planned = activationEngine.plan(member, lineUserId, clock.now());
      if (!planned.ok) return planned;

      const persisted = repo.saveActivation(member._rowIndex, planned.activation);

      repo.logActivation({
        memCode: member.mem_code,
        lineUserId,
        activateCode,
        status: 'success',
        activatedDt: planned.activation.memEffDt
      });

      return {
        ok:true,
        data:{
          mem_code: member.mem_code,
          mem_title: member.mem_title,
          mem_fname: member.mem_fname,
          mem_lname: member.mem_lname,
          mem_status: persisted.memStatus,
          mem_eff_dt: persisted.memEffDt,
          mem_exp_dt: persisted.memExpDt,
          line_user_id: lineUserId
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
