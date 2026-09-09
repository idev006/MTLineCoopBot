/**
 * @fileoverview Api.ApiHandlers
 * implementation ของแต่ละ endpoint — ใช้ Core (pure) + Repository เท่านั้น
 * (ไม่แตะ SpreadsheetApp ตรง ๆ — ผ่าน Data layer, บทที่ 3.2.4)
 *
 * Handler throw Api.ApiError → Registry แปลงเป็น envelope { ok:false, error }
 *
 * การ์ด MT-16 — API Layer (เฟส 3)
 */

var Api = Api || {};

Api.ApiHandlers = (() => {
  'use strict';

  function getSystem() {
    return Composition.SystemFactory.createSystem();
  }

  /** GET /api/health — ตรวจว่า API ทำงาน */
  function health() {
    const clock = Composition.SystemFactory.createClock();
    return {
      status: 'ok',
      service: 'MTLineCoopBot API',
      time: DataDict.formatDateTime(clock.now()),
      routes: Api.ApiRegistry.listRoutes().length
    };
  }

  function requireLinePrincipal(ctx) {
    const idToken = ctx && ctx.body ? ctx.body.idToken : null;
    if (!idToken) {
      throw Api.ApiError.create('UNAUTHENTICATED', 'ไม่พบข้อมูลยืนยันตัวตน', 401);
    }
    const system = getSystem();
    const principal = system.lineIdentity.authenticate({ idToken });
    if (!Security.Principal.isAuthenticated(principal)) {
      throw Api.ApiError.create('UNAUTHENTICATED', 'ข้อมูลยืนยันตัวตนไม่ถูกต้อง', 401);
    }
    return { system, principal };
  }

  function throwApplicationError(result) {
    const code = result && result.error && result.error.code ? result.error.code : 'FORBIDDEN';
    const status = code === 'UNAUTHENTICATED' ? 401 : 403;
    throw Api.ApiError.create(code, 'ไม่สามารถเข้าถึงข้อมูลสมาชิกได้', status);
  }

  /**
   * POST /api/member/me/profile { idToken }
   * Protected self-profile endpoint.
   * Identity proof comes only from the verified raw LINE ID token.
   */
  function getCurrentProfile(ctx) {
    const { system, principal } = requireLinePrincipal(ctx);
    const result = system.getCurrentMemberProfile.execute({ principal });
    if (!result.ok) throwApplicationError(result);
    return result.data;
  }

  function getCurrentFinance(ctx, kind) {
    const { system, principal } = requireLinePrincipal(ctx);
    const result = system.getCurrentMemberFinance.execute({ principal, kind });
    if (!result.ok) throwApplicationError(result);
    return { [kind]: result.data.rows };
  }

  function getCurrentSavings(ctx) {
    return getCurrentFinance(ctx, 'savings');
  }

  function getCurrentLoans(ctx) {
    return getCurrentFinance(ctx, 'loans');
  }

  function getCurrentDividends(ctx) {
    return getCurrentFinance(ctx, 'dividends');
  }

  function activateCurrentMember(ctx) {
    const { system, principal } = requireLinePrincipal(ctx);
    const body = (ctx && ctx.body) || {};
    const result = system.selfActivateMember.execute({
      principal,
      activateCode:body.activateCode
    });

    if (!result.ok) {
      const code = result.error && result.error.code ? result.error.code : 'FORBIDDEN';
      const status = code === 'UNAUTHENTICATED' ? 401 :
        code === 'VALIDATION' ? 400 :
        code === 'MEMBER_NOT_FOUND' ? 404 :
        ['BINDING_CONFLICT','SUBJECT_ALREADY_BOUND','ALREADY_ACTIVATED'].includes(code) ? 409 : 403;
      throw Api.ApiError.create(code, 'ไม่สามารถ activate สมาชิกได้', status);
    }

    return result.data;
  }

  function renewCurrentMember(ctx) {
    const { system, principal } = requireLinePrincipal(ctx);
    const result = system.renewMember.execute({ principal });
    if (!result.ok) throwApplicationError(result);
    return result.data;
  }

  function webSessionFromLine(ctx) {
    const system = getSystem();
    const idToken = ctx && ctx.body ? ctx.body.idToken : null;
    const result = system.exchangeLineForWebSession.execute({ idToken });
    if (!result.ok) {
      const code = result.error && result.error.code ? result.error.code : 'UNAUTHENTICATED';
      const status = code === 'FORBIDDEN' ? 403 : 401;
      throw Api.ApiError.create(code, code === 'FORBIDDEN'
        ? 'บัญชีนี้ไม่มีสิทธิ์ใช้งานระบบเจ้าหน้าที่'
        : 'ไม่สามารถยืนยันตัวตนได้', status);
    }
    return result.data;
  }

  function verifyWebSession(ctx) {
    const system = getSystem();
    const token = ctx && ctx.body ? ctx.body.sessionToken : null;
    const result = system.verifyWebSession.execute({ token });
    if (!result.ok) {
      throw Api.ApiError.create('UNAUTHENTICATED', 'session ไม่ถูกต้องหรือหมดอายุ', 401);
    }
    const principal = result.data.principal;
    return {
      valid:true,
      user:{
        subject:principal.subject,
        roles:Array.from(principal.roles || []),
        memberCode:principal.memberCode || null
      },
      expiresAt:principal.claims && principal.claims.sessionExpiresAt
        ? principal.claims.sessionExpiresAt
        : null
    };
  }

  function revokeWebSession(ctx) {
    const system = getSystem();
    const token = ctx && ctx.body ? ctx.body.sessionToken : null;
    const result = system.revokeWebSession.execute({ token });
    if (!result.ok) {
      throw Api.ApiError.create('UNAUTHENTICATED', 'session ไม่ถูกต้อง', 401);
    }
    return result.data;
  }

  function requireWebPrincipal(ctx) {
    const sessionToken = ctx && ctx.body ? ctx.body.sessionToken : null;
    if (!sessionToken) {
      throw Api.ApiError.create('UNAUTHENTICATED', 'ไม่พบ Web session', 401);
    }
    const system = getSystem();
    const principal = system.webIdentity.authenticate({ sessionToken });
    if (!Security.Principal.isAuthenticated(principal)) {
      throw Api.ApiError.create('UNAUTHENTICATED', 'Web session ไม่ถูกต้องหรือหมดอายุ', 401);
    }
    return { system, principal };
  }

  function throwWebApplicationError(result) {
    const code = result && result.error && result.error.code ? result.error.code : 'FORBIDDEN';
    const status = code === 'UNAUTHENTICATED' ? 401 :
      code === 'VALIDATION' ? 400 :
      code === 'MEMBER_NOT_FOUND' ? 404 : 403;
    throw Api.ApiError.create(code, 'ไม่สามารถเข้าถึงข้อมูลเจ้าหน้าที่ได้', status);
  }

  function listWebMembers(ctx) {
    const { system, principal } = requireWebPrincipal(ctx);
    const body = (ctx && ctx.body) || {};
    const result = system.listWebMembers.execute({
      principal,
      search:body.search,
      status:body.status,
      page:body.page,
      limit:body.limit
    });
    if (!result.ok) throwWebApplicationError(result);
    return result.data;
  }

  function getWebMemberDetail(ctx) {
    const { system, principal } = requireWebPrincipal(ctx);
    const body = (ctx && ctx.body) || {};
    const result = system.getWebMemberDetail.execute({
      principal,
      memberCode:body.memberCode
    });
    if (!result.ok) throwWebApplicationError(result);
    return result.data;
  }

  function getWebAdminSettings(ctx) {
    const { system, principal } = requireWebPrincipal(ctx);
    const result = system.getAdminSettings.execute({ principal });
    if (!result.ok) throwWebApplicationError(result);
    return result.data;
  }

  function getWebAuditLog(ctx) {
    const { system, principal } = requireWebPrincipal(ctx);
    const body = (ctx && ctx.body) || {};
    const result = system.getAuditLog.execute({
      principal,
      type:body.type,
      limit:body.limit
    });
    if (!result.ok) throwWebApplicationError(result);
    return result.data;
  }

  function getWebSummaryReport(ctx) {
    const { system, principal } = requireWebPrincipal(ctx);
    const result = system.getSummaryReport.execute({ principal });
    if (!result.ok) throwWebApplicationError(result);
    return result.data;
  }

  function renewWebMember(ctx) {
    const { system, principal } = requireWebPrincipal(ctx);
    const body = (ctx && ctx.body) || {};
    const result = system.renewWebMember.execute({
      principal,
      memberCode:body.memberCode
    });
    if (!result.ok) throwWebApplicationError(result);
    return result.data;
  }

  function listWebStaffAccounts(ctx) {
    const { system, principal } = requireWebPrincipal(ctx);
    const result = system.listStaffAccounts.execute({ principal });
    if (!result.ok) throwWebApplicationError(result);
    return result.data;
  }

  function getWebRoleCatalog(ctx) {
    const { system, principal } = requireWebPrincipal(ctx);
    const result = system.getRoleCatalog.execute({ principal });
    if (!result.ok) throwWebApplicationError(result);
    return result.data;
  }

  function assignWebStaffRole(ctx) {
    const { system, principal } = requireWebPrincipal(ctx);
    const body = (ctx && ctx.body) || {};
    const result = system.assignStaffRole.execute({
      principal,
      memberCode:body.memberCode,
      role:body.role
    });
    if (!result.ok) {
      const code = result.error && result.error.code ? result.error.code : 'FORBIDDEN';
      const status = code === 'UNAUTHENTICATED' ? 401 :
        code === 'VALIDATION' ? 400 :
        code === 'MEMBER_NOT_FOUND' ? 404 :
        code === 'SELF_ROLE_CHANGE_FORBIDDEN' ? 409 :
        code === 'AUDIT_UNAVAILABLE' ? 503 :
        code === 'PERSISTENCE_ERROR' ? 500 : 403;
      throw Api.ApiError.create(code, 'ไม่สามารถเปลี่ยนบทบาทเจ้าหน้าที่ได้', status);
    }
    return result.data;
  }

  /**
   * POST /api/loan/calculate
   * Public/read-only canonical loan calculation.
   */
  function calculateLoan(ctx) {
    const system = getSystem();
    const result = system.calculateLoan.execute({ params: (ctx && ctx.body) || {} });
    if (!result.ok) {
      throw Api.ApiError.create(
        result.error.code || 'VALIDATION',
        result.error.message || 'ข้อมูลคำนวณสินเชื่อไม่ถูกต้อง',
        400,
        result.error.period ? { period: result.error.period } : undefined
      );
    }
    return result.data;
  }

  return {
    health,
    webSessionFromLine,
    verifyWebSession,
    revokeWebSession,
    listWebMembers,
    getWebMemberDetail,
    getWebAdminSettings,
    getWebAuditLog,
    getWebSummaryReport,
    renewWebMember,
    listWebStaffAccounts,
    getWebRoleCatalog,
    assignWebStaffRole,
    calculateLoan,
    getCurrentProfile,
    getCurrentSavings,
    getCurrentLoans,
    getCurrentDividends,
    activateCurrentMember,
    renewCurrentMember
  };
})();
