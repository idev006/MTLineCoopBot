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
 * - handleRenew(...) — ขั้น 1: ส่ง confirmCard ขอ**ยืนยัน**ก่อน (การ์ด MT-35)
 * - handleConfirmRenew(...) — ขั้น 2: หลังกด "ยืนยันต่ออายุ" → performRenew + alertCard (success/error)
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
   * ส่ง alertCard ตามระดับ (fallback: ข้อความ text เดิมถ้าการ์ดส่งไม่ได้)
   * @param {string} replyToken
   * @param {string} token
   * @param {string} level - success | warning | error
   * @param {string} title
   * @param {string} message
   */
  function sendAlertCard(replyToken, token, level, title, message) {
    const card = LineBot.FlexBuilder.alertCard({ level: level, title: title, message: message });
    const res = LineBot.MessageService.replyFlex(replyToken, card, token);
    if (!res.ok) {
      Logger.log(`[Alert] replyFlex failed (${res.statusCode}) — fallback ข้อความเดิม`);
      LineBot.MessageService.reply(replyToken, message, token);
    }
  }

  /**
   * จัดการคำสั่งต่ออายุในแชท (การ์ด MT-35) — ขั้น 1: ขอ**ยืนยัน**ก่อนดำเนินการ
   * (เดิมต่ออายุทันที — ตอนนี้ผู้ใช้ต้องกด "ยืนยันต่ออายุ" ใน confirmCard)
   * @param {string} activateCode - ว่าง = ต่ออายุตัวเอง
   * @param {string} lineUserId
   * @param {string} replyToken
   * @param {string} token - CHANNEL_ACCESS_TOKEN (ใช้สำหรับผูกเมนู)
   * @returns {Object} { confirmRequested: true, activateCode }
   */
  function handleRenew(activateCode, lineUserId, replyToken, token) {
    const codeQuery = activateCode ? `&code=${encodeURIComponent(activateCode)}` : '';
    const card = LineBot.FlexBuilder.confirmCard({
      title: 'ยืนยันการต่ออายุสมาชิก',
      message: 'คุณต้องการต่ออายุสมาชิกหรือไม่?',
      info: 'สิทธิ์ใหม่ = วันที่ปัจจุบัน + 1 ปี (คำนวณจากวันหมดอายุเดิม)' + (activateCode ? `\nรหัสที่ใช้: ${activateCode}` : ''),
      okLabel: 'ยืนยันต่ออายุ',
      okData: `action=confirm_renew${codeQuery}`,
      cancelLabel: 'ยกเลิก',
      cancelData: 'action=cancel_renew'
    });
    const res = LineBot.MessageService.replyFlex(replyToken, card, token);
    if (!res.ok) {
      Logger.log(`[Renewal] confirmCard replyFlex failed (${res.statusCode}) — fallback ข้อความเดิม`);
      LineBot.MessageService.reply(replyToken,
        'คุณต้องการต่ออายุสมาชิกหรือไม่? ส่ง renew อีกครั้งเพื่อยืนยัน (สิทธิ์ใหม่ = วันที่ปัจจุบัน + 1 ปี)', token);
    }
    Logger.log(`[Renewal] Confirm requested for code: '${activateCode}' (user ${lineUserId})`);
    return { confirmRequested: true, activateCode: activateCode };
  }

  /**
   * ขั้น 2: หลังผู้ใช้กด "ยืนยันต่ออายุ" (postback action=confirm_renew) — ต่ออายุจริง + ตอบกลับ
   * @param {string} activateCode - จาก postback (ว่าง = ต่ออายุตัวเอง)
   * @param {string} lineUserId
   * @param {string} replyToken
   * @param {string} token
   * @returns {Object} ผลลัพธ์จาก performRenew
   */
  function handleConfirmRenew(activateCode, lineUserId, replyToken, token) {
    const result = performRenew(activateCode, lineUserId, { gater: function (userId) { return RichMenu.Gating.linkMemberMenu(userId, token); } });
    if (!result.success) {
      const msg = result.reason === 'code_not_found'
        ? 'ไม่พบรหัสต่ออายุนี้ในระบบ กรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง'
        : 'ไม่พบข้อมูลสมาชิกของคุณ กรุณา activate ก่อนใช้งาน (activate:CODE)';
      sendAlertCard(replyToken, token, 'error', 'ไม่สามารถต่ออายุได้', msg);
      return result;
    }
    sendAlertCard(replyToken, token, 'success', 'ต่ออายุสำเร็จ',
      `ต่ออายุสมาชิกสำเร็จ (รหัส ${result.memCode})\nสิทธิ์ใหม่ถึงวันที่: ${result.newExpDt}\nขอบคุณที่ใช้บริการสหกรณ์ครับ`);
    Logger.log(`[Renewal] ${result.memCode} renewed — new exp ${result.newExpDt}`);
    return result;
  }

  return {
    performRenew,
    handleRenew,
    handleConfirmRenew
  };
})();
