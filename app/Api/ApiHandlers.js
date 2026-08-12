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

  function getRepo() {
    return Data.MemberRepository.getRepository();
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
    const repo = getRepo();
    const member = repo.findByLineUserId(lineUserId);
    if (!member) throw Api.ApiError.create('MEMBER_NOT_FOUND', 'ไม่พบสมาชิกสำหรับ lineUserId นี้', 404);
    return { member, repo, lineUserId };
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
    const { member, repo } = requireMember(ctx);
    const valid = repo.isActiveMember(member);
    const expiry = Core.MemberRules.getExpiryStatus(member, undefined, Config.get().EXPIRY_WARNING_DAYS);
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
      throw Api.ApiError.create('MEMBER_NOT_FOUND', activateCode ? 'ไม่พบรหัสต่ออายุนี้ในระบบ' : 'ไม่พบสมาชิกสำหรับ lineUserId นี้', 404);
    }
    const renewal = Core.MemberRules.computeRenewal(member);
    const result = repo.renewMember(member._rowIndex, renewal.newExpDt, lineUserId);
    return {
      mem_code: member.mem_code,
      mem_exp_dt: result.memExpDt,
      mem_status: result.memStatus,
      renewed_from: renewal.fromDt
    };
  }

  /** POST /api/member/activate { activateCode, lineUserId } — ตรรกะเดียวกับ Bot (ActivationService) */
  function activate(ctx) {
    const activateCode = (ctx.body && ctx.body.activateCode) || (ctx.query && ctx.query.activateCode);
    const lineUserId = (ctx.body && ctx.body.lineUserId) || (ctx.query && ctx.query.lineUserId);
    if (!activateCode || !lineUserId) {
      throw Api.ApiError.create('VALIDATION', 'ต้องระบุ activateCode และ lineUserId');
    }
    const repo = getRepo();
    const found = repo.findByActivateCode(activateCode);
    if (!found) throw Api.ApiError.create('MEMBER_NOT_FOUND', 'ไม่พบรหัส activate นี้ในระบบ', 404);
    if (found.mem_eff_dt && found.mem_eff_dt !== '') {
      throw Api.ApiError.create('ALREADY_ACTIVATED', 'รหัสนี้ถูกใช้ไปแล้ว ไม่สามารถ activate ซ้ำได้', 409);
    }
    const result = repo.activateMember(found._rowIndex, lineUserId);
    return {
      mem_code: found.mem_code,
      mem_status: result.memStatus,
      mem_eff_dt: result.memEffDt,
      mem_exp_dt: result.memExpDt
    };
  }

  return {
    health,
    getProfile,
    getSavings,
    getLoans,
    getDividends,
    getValidity,
    activate,
    renew
  };
})();
