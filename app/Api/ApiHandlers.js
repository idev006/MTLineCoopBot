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

  function getRepo() {
    return getSystem().memberRepository;
  }

  /**
   * ดึง lineUserId จาก ctx (query/body/auth) และตรวจว่าเป็นสมาชิกที่รู้จัก
   * @param {Object} ctx
   * @returns {{member: Object, repo: Object, lineUserId: string}}
   */
  function requireMember(ctx) {
    const lineUserId = (ctx.query && ctx.query.lineUserId) ||
      (ctx.body && ctx.body.lineUserId) ||
      (ctx.auth && ctx.auth.lineUserId);
    if (!lineUserId) throw Api.ApiError.create('VALIDATION', 'ต้องระบุ lineUserId');
    const system = getSystem();
    const repo = system.memberRepository;
    const member = repo.findByLineUserId(lineUserId);
    if (!member) throw Api.ApiError.create('MEMBER_NOT_FOUND', 'ไม่พบสมาชิกสำหรับ lineUserId นี้', 404);
    return { member, repo, system, lineUserId };
  }

  /** GET /api/health — ตรวจว่า API ทำงาน */
  function health() {
    return {
      status: 'ok',
      service: 'MTLineCoopBot API',
      time: DataDict.formatDateTime(new Date()),
      routes: Api.ApiRegistry.listRoutes().length
    };
  }

  /** GET /api/member/profile?lineUserId= — ข้อมูลสมาชิกจริง */
  function getProfile(ctx) {
    const { member } = requireMember(ctx);
    return {
      mem_code: member.mem_code,
      mem_title: member.mem_title,
      mem_fname: member.mem_fname,
      mem_lname: member.mem_lname,
      mem_role: member.mem_role,
      mem_position: member.mem_position,
      mem_position_score: member.mem_position_score,
      mem_rank_score: member.mem_rank_score,
      mem_kk: member.mem_kk,
      mem_bk: member.mem_bk,
      mem_bh: member.mem_bh,
      mem_eff_dt: member.mem_eff_dt,
      mem_exp_dt: member.mem_exp_dt,
      mem_status: member.mem_status
    };
  }

  /** GET /api/member/savings?lineUserId= — บัญชีเงินฝาก (t_savings_acct) */
  function getSavings(ctx) {
    const { member } = requireMember(ctx);
    return { savings: getRepo().findSavingsByMember(member.mem_code) };
  }

  /** GET /api/member/loans?lineUserId= — ยอดหนี้ (t_loan_acct) */
  function getLoans(ctx) {
    const { member } = requireMember(ctx);
    return { loans: getRepo().findLoansByMember(member.mem_code) };
  }

  /** GET /api/member/dividends?lineUserId= — ปันผล/หุ้น (t_dividend) */
  function getDividends(ctx) {
    const { member } = requireMember(ctx);
    return { dividends: getRepo().findDividendsByMember(member.mem_code) };
  }

  /** GET /api/member/validity?lineUserId= — สถานะสิทธิ์ (Gate logic — Core.MemberRules) */
  function getValidity(ctx) {
    const { member, system } = requireMember(ctx);
    const valid = system.memberAccess.isActive(member);
    const expiry = system.memberAccess.expiryStatus(member, system.config.get().EXPIRY_WARNING_DAYS);
    return {
      valid,
      role: member.mem_role,
      status: member.mem_status,
      expiry: {
        status: expiry.status,
        daysLeft: expiry.daysLeft,
        mem_exp_dt: member.mem_exp_dt
      }
    };
  }

  /** POST /api/member/renew { activateCode?, lineUserId } — ต่ออายุ (การ์ด MT-12) */
  function renew(ctx) {
    const activateCode = (ctx.body && ctx.body.activateCode) || (ctx.query && ctx.query.activateCode) || '';
    const lineUserId = (ctx.body && ctx.body.lineUserId) || (ctx.query && ctx.query.lineUserId);
    if (!lineUserId) throw Api.ApiError.create('VALIDATION', 'ต้องระบุ lineUserId');
    const repo = getRepo();
    const member = activateCode
      ? repo.findByActivateCode(activateCode)
      : repo.findByLineUserId(lineUserId);
    if (!member) {
      // detail ช่วย UI adapter แยก "ไม่พบรหัส" vs "ไม่พบสมาชิก" (การ์ด MT-17)
      throw Api.ApiError.create('MEMBER_NOT_FOUND',
        activateCode ? 'ไม่พบรหัสต่ออายุนี้ในระบบ' : 'ไม่พบสมาชิกสำหรับ lineUserId นี้',
        404, { detail: activateCode ? 'code_not_found' : 'member_not_found' });
    }
    // internal.now = seam สำหรับทดสอบ deterministic (WebApp/HTTP ไม่ส่งค่านี้)
    const now = (ctx.internal && ctx.internal.now) || new Date();
    const renewal = Core.MemberRules.computeRenewal(member, now);
    const result = repo.renewMember(member._rowIndex, renewal.newExpDt, lineUserId);
    return {
      mem_code: member.mem_code,
      mem_exp_dt: result.memExpDt,
      mem_status: result.memStatus,
      renewed_from: renewal.fromDt
    };
  }

  /** POST /api/member/activate { activateCode, lineUserId } — thin delivery adapter */
  function activate(ctx) {
    const activateCode = (ctx.body && ctx.body.activateCode) || (ctx.query && ctx.query.activateCode);
    const lineUserId = (ctx.body && ctx.body.lineUserId) || (ctx.query && ctx.query.lineUserId);
    const system = getSystem();
    const result = system.activateMember.execute({ activateCode, lineUserId });

    if (!result.ok) {
      const code = result.error && result.error.code ? result.error.code : 'INTERNAL';
      if (code === 'VALIDATION') {
        throw Api.ApiError.create('VALIDATION', 'ต้องระบุ activateCode และ lineUserId');
      }
      if (code === 'MEMBER_NOT_FOUND') {
        throw Api.ApiError.create('MEMBER_NOT_FOUND', 'ไม่พบรหัส activate นี้ในระบบ', 404);
      }
      if (code === 'ALREADY_ACTIVATED') {
        throw Api.ApiError.create('ALREADY_ACTIVATED', 'รหัสนี้ถูกใช้ไปแล้ว ไม่สามารถ activate ซ้ำได้', 409);
      }
      throw Api.ApiError.create(code, 'ไม่สามารถ activate สมาชิกได้', 500);
    }

    return result.data;
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

  return {
    health,
    getCurrentProfile,
    getCurrentSavings,
    getCurrentLoans,
    getCurrentDividends,
    getProfile,
    getSavings,
    getLoans,
    getDividends,
    getValidity,
    activate,
    renew
  };
})();
