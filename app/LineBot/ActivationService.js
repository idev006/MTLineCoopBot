/**
 * @fileoverview LineBot.ActivationService
 * จัดการการ activate สมาชิกผ่าน LINE Bot
 *
 * การ์ด MT-17 (Bot = UI Adapter): ตรรกะการ activate (find/check/เขียนชีท) อยู่ที่
 * POST /api/member/activate (Api.ApiHandlers) — service นี้เรียก API เดียวกันกับ UI อื่น
 * แล้วทำ UI work: welcome flex + ผูกเมนูสมาชิก (Per-User Gating)
 *
 * - performActivate(activateCode, lineUserId, opts?) — เรียก API (DI: api)
 *   → ทดสอบใน node ได้โดยไม่ต้องแตะ LINE API/SpreadsheetApp ตรง ๆ
 * - handleActivate(...) — เรียก performActivate + ตอบกลับ (flex/text) + ผูกเมนู
 */

var LineBot = LineBot || {};

LineBot.ActivationService = (() => {
  'use strict';

  /**
   * ดึง dependencies แบบ runtime
   * @returns {{FlexBuilder: Object, MessageService: Object}}
   */
  function getDependencies() {
    return {
      FlexBuilder: LineBot.FlexBuilder,
      MessageService: LineBot.MessageService
    };
  }

  /**
   * activate สมาชิก (ตรรกะ — ไม่ส่งข้อความเอง)
   * เรียก POST /api/member/activate — find/check/เขียนชีท อยู่ใน API handler
   * @param {string} activateCode
   * @param {string} lineUserId
   * @param {Object} [opts] - { api } (DI สำหรับทดสอบ)
   * @returns {Object} { success, reason, memberCode?, data? }
   *   reason: 'activated' | 'code_not_found' | 'already_activated' | 'validation'
   */
  function performActivate(activateCode, lineUserId, opts) {
    const o = opts || {};
    const api = o.api || function (m, p, opt) { return Api.ApiService.handleRequest(m, p, opt); };

    const env = api('POST', '/api/member/activate', { body: { activateCode, lineUserId } });
    if (!env.ok) {
      const code = env.error && env.error.code;
      const reason = code === 'ALREADY_ACTIVATED' ? 'already_activated'
        : (code === 'VALIDATION' ? 'validation' : 'code_not_found');
      return { success: false, reason, error: env.error };
    }
    return { success: true, reason: 'activated', memberCode: env.data.mem_code, data: env.data };
  }

  /**
   * ส่ง alertCard ตามระดับ (fallback: ข้อความ text เดิมถ้าการ์ดส่งไม่ได้)
   * @param {Object} deps - dependencies { FlexBuilder, MessageService }
   * @param {string} replyToken
   * @param {string} token
   * @param {string} level - success | warning | error
   * @param {string} title
   * @param {string} message
   */
  function sendAlertCard(deps, replyToken, token, level, title, message) {
    const card = deps.FlexBuilder.alertCard({ level: level, title: title, message: message });
    const res = deps.MessageService.replyFlex(replyToken, card, token);
    if (!res.ok) {
      Logger.log(`[Alert] replyFlex failed (${res.statusCode}) — fallback ข้อความเดิม`);
      deps.MessageService.reply(replyToken, message, token);
    }
  }

  /**
   * จัดการคำสั่ง activate (ส่งข้อความตอบกลับ + ผูกเมนู)
   * @param {string} activateCode
   * @param {string} lineUserId
   * @param {string} replyToken
   * @param {string} token
   * @returns {Object} ผลลัพธ์การ activate
   */
  function handleActivate(activateCode, lineUserId, replyToken, token) {
    const deps = getDependencies();
    Logger.log('[Activation] Processing activation for code: ' + activateCode + ', LINE user: ' + lineUserId);

    // ตรรกะผ่าน API (endpoint เดียวกันกับ UI อื่น — การ์ด MT-17)
    const result = performActivate(activateCode, lineUserId, {});
    if (!result.success) {
      // การ์ด MT-35: error/warning แสดงเป็น alertCard (fallback ข้อความเดิมถ้าการ์ดส่งไม่ได้)
      let level, title, msg;
      if (result.reason === 'already_activated') {
        Logger.log('[Activation] Activate code already used: ' + activateCode);
        level = 'warning'; title = 'รหัสถูกใช้ไปแล้ว';
        msg = 'รหัสนี้ถูกใช้ไปแล้ว ไม่สามารถ activate ซ้ำได้';
      } else if (result.reason === 'validation') {
        level = 'warning'; title = 'กรุณาระบุรหัส';
        msg = 'กรุณาระบุรหัส activate เช่น activate:ABC123';
      } else {
        Logger.log('[Activation] Activate code not found: ' + activateCode);
        level = 'error'; title = 'ไม่พบรหัส activate';
        msg = 'ไม่พบรหัส activate นี้ในระบบ กรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง';
      }
      sendAlertCard(deps, replyToken, token, level, title, msg);
      return result;
    }

    const d = result.data;
    Logger.log('[Activation] Activated member: ' + d.mem_code + ' (via API ' + d.mem_status + ')');

    // สร้าง Flex Message ต้อนรับ (UI work — ข้อมูลชื่อจาก API response)
    Logger.log('[Activation] Creating welcome flex message...');
    const flexMessage = deps.FlexBuilder.welcomeMember({
      memTitle: d.mem_title,
      memFname: d.mem_fname,
      memLname: d.mem_lname,
      memCode: d.mem_code,
      memEffDt: d.mem_eff_dt,
      memExpDt: d.mem_exp_dt
    });

    Logger.log('[Activation] Sending flex message...');
    const reply = deps.MessageService.replyFlex(replyToken, flexMessage, token);
    Logger.log('[Activation] replyFlex result: ' + JSON.stringify(reply));

    if (!reply.ok) {
      Logger.log('[Activation] Failed to send welcome flex message: ' + reply.statusCode + ' ' + reply.body);
      // Fallback ถ้า Flex ไม่สำเร็จ
      deps.MessageService.reply(replyToken,
        'ยินดีต้อนรับ ' + d.mem_title + d.mem_fname + ' ' + d.mem_lname + ' คุณได้ activate เรียบร้อยแล้ว', token);
    } else {
      Logger.log('[Activation] Welcome flex message sent successfully for member: ' + d.mem_code);
    }

    // ผูก Member Menu (Tab 1) ให้สมาชิกรายนี้ (Per-User Gating — บทที่ 3.3.6)
    // ถ้าล้มเหลวไม่ทำให้ activate ล้มเหลว — สมาชิกยังเห็น Welcome อยู่จนกว่าจะผูกสำเร็จ
    try {
      if (typeof RichMenu !== 'undefined' && RichMenu.Gating) {
        RichMenu.Gating.linkMemberMenu(lineUserId, token);
        Logger.log('[Activation] Member menu linked for user: ' + lineUserId);
      } else {
        Logger.log('[Activation] RichMenu.Gating ไม่พร้อม — ข้ามการผูกเมนู');
      }
    } catch (linkError) {
      Logger.log('[Activation] linkMemberMenu failed (ไม่บล็อก activate): ' + linkError);
    }

    return {
      success: true,
      memberCode: d.mem_code,
      activationResult: d
    };
  }

  return {
    performActivate,
    handleActivate
  };
})();