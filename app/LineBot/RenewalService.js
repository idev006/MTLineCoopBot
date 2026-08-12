/**
 * @fileoverview LineBot.RenewalService
 * ต่ออายุสมาชิก (การ์ด MT-12 — บทที่ 7 ระยะ 2)
 *
 * คำสั่งในแชท: `renew` (ต่ออายุตัวเองผ่าน line_user_id) หรือ `renew:CODE`
 * กฎ: วันหมดอายุใหม่ = max(now, mem_exp_dt เดิม) + 1 ปี (Core.MemberRules.computeRenewal)
 *
 * การ์ด MT-17: ตรรกะการต่ออายุ (find/check/คำนวณ/เขียนชีท) อยู่ที่ POST /api/member/renew
 * — service นี้ (Bot layer) เรียก API เดียวกันกับ UI อื่น แล้วทำ UI work (audit log + ผูกเมนู)
 *
 * - performRenew(activateCode, lineUserId, opts?) — เรียก API (DI: api/gater/logger/now)
 *   → ทดสอบใน node ได้โดยไม่ต้องแตะ LINE API
 * - handleRenew(activateCode, lineUserId, replyToken, token) — เรียก performRenew + ตอบกลับ
 */

var LineBot = LineBot || {};

LineBot.RenewalService = (() => {
  'use strict';

  /**
   * ต่ออายุสมาชิก (ตรรกะ — ไม่ส่งข้อความเอง)
   *
   * การ์ด MT-17 (Bot = UI Adapter): find/check/คำนวณ/เขียนชีท อยู่ที่
   * POST /api/member/renew (Api.ApiHandlers) — Bot เรียก endpoint เดียวกันกับ UI อื่น
   * บทบาทของ service นี้เหลือ: เรียก API + audit log + ผูกเมนูกลับ (UI work)
   *
   * @param {string} activateCode - รหัสต่ออายุ (ว่าง = ต่ออายุตัวเองด้วย lineUserId)
   * @param {string} lineUserId - LINE User ID ของผู้ขอ
   * @param {Object} [opts] - { now, gater, logger, api }
   *   now → ส่งต่อผ่าน ctx.internal ให้ API handler คำนวณ deterministic (test)
   * @returns {Object} { success, reason, newExpDt?, memCode?, memStatus? }
   */
  function performRenew(activateCode, lineUserId, opts) {
    const o = opts || {};
    const api = o.api || function (m, p, opt) { return Api.ApiService.handleRequest(m, p, opt); };
    const now = o.now || new Date();
    const gater = o.gater || function (userId, tk) {
      try { return RichMenu.Gating.linkMemberMenu(userId, tk); } catch (e) { return { ok: false }; }
    };
    const logger = o.logger || function (entry) {
      return Data.MemberRepository.getRepository().logActivation(entry);
    };

    // ตรรกะการต่ออายุทั้งหมดอยู่ใน API handler (find → computeRenewal → renewMember)
    const env = api('POST', '/api/member/renew', {
      body: { activateCode: activateCode || '', lineUserId },
      internal: { now }
    });
    if (!env.ok) {
      const detail = env.error && env.error.detail;
      return {
        success: false,
        reason: detail === 'code_not_found' ? 'code_not_found' : 'member_not_found',
        error: env.error
      };
    }

    // audit trail: บันทึกลง t_activation_log (status='renewed')
    logger({
      memCode: env.data.mem_code,
      lineUserId: lineUserId,
      activateCode: activateCode || '',
      status: 'renewed'
    });

    // สมาชิกกลับมา valid แล้ว → ผูกเมนูสมาชิกกลับ (ถ้าเคยถูก unlink ตอนหมดอายุ)
    gater(lineUserId);

    return {
      success: true,
      reason: 'renewed',
      memCode: env.data.mem_code,
      newExpDt: env.data.mem_exp_dt,
      fromDt: env.data.renewed_from,
      memStatus: env.data.mem_status
    };
  }

  /**
   * จัดการคำสั่งต่ออายุในแชท (ส่งข้อความตอบกลับ)
   * @param {string} activateCode - ว่าง = ต่ออายุตัวเอง
   * @param {string} lineUserId
   * @param {string} replyToken
   * @param {string} token - CHANNEL_ACCESS_TOKEN (ใช้สำหรับผูกเมนู)
   * @returns {Object} ผลลัพธ์
   */
  function handleRenew(activateCode, lineUserId, replyToken, token) {
    const result = performRenew(activateCode, lineUserId, { gater: function (userId) { return RichMenu.Gating.linkMemberMenu(userId, token); } });
    if (!result.success) {
      const msg = result.reason === 'code_not_found'
        ? 'ไม่พบรหัสต่ออายุนี้ในระบบ กรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง'
        : 'ไม่พบข้อมูลสมาชิกของคุณ กรุณา activate ก่อนใช้งาน (activate:CODE)';
      LineBot.MessageService.reply(replyToken, msg, token);
      return result;
    }
    LineBot.MessageService.reply(replyToken,
      `✅ ต่ออายุสมาชิกสำเร็จ (รหัส ${result.memCode})\n━━━━━━━━━━━━━━━━━\nสิทธิ์ใหม่ถึงวันที่: ${result.newExpDt}\nขอบคุณที่ใช้บริการสหกรณ์ครับ`,
      token);
    Logger.log(`[Renewal] ${result.memCode} renewed — new exp ${result.newExpDt}`);
    return result;
  }

  return {
    performRenew,
    handleRenew
  };
})();
