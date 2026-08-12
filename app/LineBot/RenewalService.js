/**
 * @fileoverview LineBot.RenewalService
 * ต่ออายุสมาชิก (การ์ด MT-12 — บทที่ 7 ระยะ 2)
 *
 * คำสั่งในแชท: `renew` (ต่ออายุตัวเองผ่าน line_user_id) หรือ `renew:CODE`
 * กฎ: วันหมดอายุใหม่ = max(now, mem_exp_dt เดิม) + 1 ปี (Core.MemberRules.computeRenewal)
 *
 * - performRenew(activateCode, lineUserId, opts?) — ตรรกะล้วน (DI: repo/gater/logger/now)
 *   → ทดสอบใน node ได้โดยไม่ต้องแตะ LINE API
 * - handleRenew(activateCode, lineUserId, replyToken, token) — เรียก performRenew + ตอบกลับ
 */

var LineBot = LineBot || {};

LineBot.RenewalService = (() => {
  'use strict';

  /**
   * ต่ออายุสมาชิก (ตรรกะ — ไม่ส่งข้อความเอง)
   * @param {string} activateCode - รหัสต่ออายุ (ว่าง = ต่ออายุตัวเองด้วย lineUserId)
   * @param {string} lineUserId - LINE User ID ของผู้ขอ
   * @param {Object} [opts] - { now, repo, gater, logger }
   * @returns {Object} { success, reason, newExpDt?, memCode?, member? }
   */
  function performRenew(activateCode, lineUserId, opts) {
    const o = opts || {};
    const repo = o.repo || Data.MemberRepository.getRepository();
    const now = o.now || new Date();
    const gater = o.gater || function (userId, tk) {
      try { return RichMenu.Gating.linkMemberMenu(userId, tk); } catch (e) { return { ok: false }; }
    };
    const logger = o.logger || function (entry) { return repo.logActivation(entry); };

    // หาสมาชิก: มีรหัส → ค้นตาม activate_code · ไม่มี → ค้นตัวเองตาม line_user_id
    const member = activateCode
      ? repo.findByActivateCode(activateCode)
      : repo.findByLineUserId(lineUserId);
    if (!member) {
      return { success: false, reason: activateCode ? 'code_not_found' : 'member_not_found' };
    }

    const renewal = Core.MemberRules.computeRenewal(member, now);
    const result = repo.renewMember(member._rowIndex, renewal.newExpDt, lineUserId);

    // audit trail: บันทึกลง t_activation_log (status='renewed')
    logger({
      memCode: member.mem_code,
      lineUserId: lineUserId,
      activateCode: activateCode || '',
      status: 'renewed'
    });

    // สมาชิกกลับมา valid แล้ว → ผูกเมนูสมาชิกกลับ (ถ้าเคยถูก unlink ตอนหมดอายุ)
    gater(lineUserId);

    return {
      success: true,
      reason: 'renewed',
      memCode: member.mem_code,
      newExpDt: renewal.newExpDt,
      fromDt: renewal.fromDt,
      memStatus: result.memStatus
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
