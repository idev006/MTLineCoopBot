/**
 * @fileoverview Application.Web.AssignStaffRoleUseCase
 * Admin-only audited staff role assignment.
 */
var Application = Application || {};
Application.Web = Application.Web || {};

Application.Web.AssignStaffRoleUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const memberRepository = Ports.MemberRepositoryPort.assertImplemented(d.memberRepository);
    const staffAdminRepository = Ports.StaffAdminRepositoryPort.assertImplemented(d.staffAdminRepository);
    const clock = Ports.ClockPort.assertImplemented(d.clock);
    const authorization = d.authorization;
    const audit = Ports.AuditPort.assertImplemented(d.audit);
    const roleCatalog = d.roleCatalog || Security.RoleCatalog;

    if (!authorization || typeof authorization.requireRole !== 'function') {
      throw new Error('AssignStaffRoleUseCase requires authorization.requireRole');
    }
    if (!roleCatalog || typeof roleCatalog.staffRoleIds !== 'function') {
      throw new Error('AssignStaffRoleUseCase requires roleCatalog.staffRoleIds');
    }

    function auditEvent(principal, memberCode, oldRole, newRole, status) {
      return audit.record({
        type:'admin.role.change',
        actorSubject:principal.subject,
        actorMemberCode:principal.memberCode || '',
        memberCode,
        oldRole,
        newRole,
        status,
        createdDt:clock.now()
      });
    }

    function execute(input) {
      const x = input || {};
      const principal = x.principal;
      const allowed = authorization.requireRole(principal, 'admin');
      if (!allowed.allowed) {
        return { ok:false, error:{ code:allowed.reason === 'unauthenticated' ? 'UNAUTHENTICATED' : 'FORBIDDEN' } };
      }

      const memberCode = String(x.memberCode || '').trim();
      const newRole = String(x.role || '').trim();
      if (!memberCode || !roleCatalog.staffRoleIds().includes(newRole)) {
        return { ok:false, error:{ code:'VALIDATION' } };
      }
      if (principal.memberCode && principal.memberCode === memberCode) {
        return { ok:false, error:{ code:'SELF_ROLE_CHANGE_FORBIDDEN' } };
      }

      const target = memberRepository.findByMemberCode(memberCode);
      if (!target) return { ok:false, error:{ code:'MEMBER_NOT_FOUND' } };
      if (!target._rowIndex) return { ok:false, error:{ code:'PERSISTENCE_IDENTITY_MISSING' } };

      const oldRole = String(target.mem_role || 'member');
      if (oldRole === newRole) {
        auditEvent(principal, memberCode, oldRole, newRole, 'noop');
        return { ok:true, data:{ memberCode, oldRole, newRole, changed:false, auditConfirmed:true } };
      }

      try {
        auditEvent(principal, memberCode, oldRole, newRole, 'attempt');
      } catch (_) {
        return { ok:false, error:{ code:'AUDIT_UNAVAILABLE' } };
      }

      try {
        staffAdminRepository.saveRole(target._rowIndex, newRole);
      } catch (_) {
        try { auditEvent(principal, memberCode, oldRole, newRole, 'failure'); } catch (_) {}
        return { ok:false, error:{ code:'PERSISTENCE_ERROR' } };
      }

      let auditConfirmed = true;
      try {
        auditEvent(principal, memberCode, oldRole, newRole, 'success');
      } catch (_) {
        auditConfirmed = false;
      }

      return {
        ok:true,
        data:{ memberCode, oldRole, newRole, changed:true, auditConfirmed }
      };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
