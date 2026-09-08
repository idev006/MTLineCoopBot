/**
 * @fileoverview Application.Member.SelfActivateMemberUseCase
 * Secure self-activation using verified LINE Principal + activation entitlement code.
 *
 * ADR-0004:
 * - activation code proves entitlement only
 * - LINE identity comes only from verified Principal claims
 * - same target + same subject is idempotent
 * - takeover/conflicting bindings fail closed
 * - no raw activation code is written to secure audit records
 */
var Application = Application || {};
Application.Member = Application.Member || {};

Application.Member.SelfActivateMemberUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const repo = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const clock = Ports.ClockPort.assertImplemented(d.clock);
    const audit = Ports.AuditPort.assertImplemented(d.audit);
    const activationEngine = d.activationEngine || Engine.MemberActivationEngine;

    if (!activationEngine || typeof activationEngine.plan !== 'function') {
      throw new Error('SelfActivateMemberUseCase requires activationEngine.plan');
    }

    function auditOutcome(memberCode, lineUserId, status) {
      audit.record({
        type:'member.activation',
        memberCode:memberCode || '',
        lineUserId:lineUserId || '',
        activateCode:'',
        status,
        occurredAt:clock.now()
      });
    }

    function execute(input) {
      const x = input || {};
      const principal = x.principal;
      const activateCode = String(x.activateCode || '').trim();

      if (!Security.Principal.isAuthenticated(principal) || principal.channel !== 'line') {
        return { ok:false, error:{ code:'UNAUTHENTICATED' } };
      }

      const lineUserId = principal.claims && principal.claims.lineUserId
        ? String(principal.claims.lineUserId).trim()
        : '';
      if (!lineUserId) {
        return { ok:false, error:{ code:'UNAUTHENTICATED' } };
      }
      if (!activateCode) {
        return { ok:false, error:{ code:'VALIDATION' } };
      }

      const target = repo.findByActivateCode(activateCode);
      if (!target) {
        auditOutcome('', lineUserId, 'secure_code_not_found');
        return { ok:false, error:{ code:'MEMBER_NOT_FOUND' } };
      }

      const targetBoundSubject = String(target.line_user_id || '').trim();
      const subjectMember = repo.findByLineUserId(lineUserId);

      if (targetBoundSubject) {
        if (targetBoundSubject === lineUserId) {
          auditOutcome(target.mem_code, lineUserId, 'secure_idempotent');
          return {
            ok:true,
            data:{
              mem_code:target.mem_code,
              mem_status:target.mem_status || 'active',
              mem_eff_dt:target.mem_eff_dt || null,
              mem_exp_dt:target.mem_exp_dt || null,
              changed:false,
              already_bound:true
            }
          };
        }

        auditOutcome(target.mem_code, lineUserId, 'secure_binding_conflict');
        return { ok:false, error:{ code:'BINDING_CONFLICT' } };
      }

      if (subjectMember && String(subjectMember.mem_code || '') !== String(target.mem_code || '')) {
        auditOutcome(target.mem_code, lineUserId, 'secure_subject_already_bound');
        return { ok:false, error:{ code:'SUBJECT_ALREADY_BOUND' } };
      }

      // A previously activated target without a binding is not silently rebound.
      // This avoids turning a reused/legacy activation code into identity authority.
      if (target.mem_eff_dt && String(target.mem_eff_dt).trim() !== '') {
        auditOutcome(target.mem_code, lineUserId, 'secure_already_activated_unbound');
        return { ok:false, error:{ code:'ALREADY_ACTIVATED' } };
      }

      const planned = activationEngine.plan(target, lineUserId, clock.now());
      if (!planned.ok) {
        auditOutcome(target.mem_code, lineUserId, 'secure_' + String(planned.error && planned.error.code || 'failed').toLowerCase());
        return planned;
      }

      const persisted = repo.saveActivation(target._rowIndex, planned.activation);
      auditOutcome(target.mem_code, lineUserId, 'secure_success');

      return {
        ok:true,
        data:{
          mem_code:target.mem_code,
          mem_title:target.mem_title,
          mem_fname:target.mem_fname,
          mem_lname:target.mem_lname,
          mem_status:persisted.memStatus,
          mem_eff_dt:persisted.memEffDt,
          mem_exp_dt:persisted.memExpDt,
          changed:true,
          already_bound:false
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
