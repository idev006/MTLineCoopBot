/**
 * @fileoverview LineBot.ActivationService
 * จัดการ logic การ activate สมาชิกผ่าน LINE Bot
 */

var LineBot = LineBot || {};

LineBot.ActivationService = (() => {
  'use strict';

  /**
   * ดึง dependencies แบบ runtime
+   * @returns {{SheetService: Object, FlexBuilder: Object, MessageService: Object}}
   */
  function getDependencies() {
    return {
      SheetService: LineBot.SheetService,
      FlexBuilder: LineBot.FlexBuilder,
      MessageService: LineBot.MessageService
    };
  }

  /**
   * จัดการคำสั่ง activate
   * @param {string} activateCode
   * @param {string} lineUserId
   * @param {string} replyToken
   * @param {string} token
   * @returns {Object} ผลลัพธ์การ activate
   */
  function handleActivate(activateCode, lineUserId, replyToken, token) {
    try {
      const deps = getDependencies();

      Logger.log('[Activation] Processing activation for code: ' + activateCode + ', LINE user: ' + lineUserId);

      // ค้นหาสมาชิกโดย activate_code — ผ่าน MemberRepository (Data layer, บทที่ 3.2.4)
      Logger.log('[Activation] Calling repo.findByActivateCode...');
      const repo = Data.MemberRepository.getRepository();
      const member = repo.findByActivateCode(activateCode);
      Logger.log('[Activation] findByActivateCode returned: ' + (member ? 'found' : 'not found'));

      if (!member) {
        Logger.log('[Activation] Activate code not found: ' + activateCode);
        deps.MessageService.reply(replyToken, 'ไม่พบรหัส activate นี้ในระบบ กรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง', token);
        return { success: false, reason: 'code_not_found' };
      }

      Logger.log('[Activation] Member found: ' + JSON.stringify(member));

      // ตรวจสอบว่าถูก activate ไปแล้วหรือไม่
      Logger.log('[Activation] Checking if already activated. mem_eff_dt: ' + member.mem_eff_dt);
      if (member.mem_eff_dt && member.mem_eff_dt !== '') {
        Logger.log('[Activation] Activate code already used: ' + activateCode);
        deps.MessageService.reply(replyToken, 'รหัสนี้ถูกใช้ไปแล้ว ไม่สามารถ activate ซ้ำได้', token);
        return { success: false, reason: 'already_activated' };
      }

      // Activate สมาชิก — ผ่าน MemberRepository
      Logger.log('[Activation] Activating member at row ' + member._rowIndex);
      const activationResult = repo.activateMember(member._rowIndex, lineUserId);
      Logger.log('[Activation] Activation result: ' + JSON.stringify(activationResult));

      // สร้าง Flex Message ต้อนรับ
      Logger.log('[Activation] Creating welcome flex message...');
      const flexMessage = deps.FlexBuilder.welcomeMember({
        memTitle: member.mem_title,
        memFname: member.mem_fname,
        memLname: member.mem_lname,
        memCode: member.mem_code,
        memEffDt: activationResult.memEffDt,
        memExpDt: activationResult.memExpDt
      });

      // ส่ง Flex Message
      Logger.log('[Activation] Sending flex message...');
      const result = deps.MessageService.replyFlex(replyToken, flexMessage, token);
      Logger.log('[Activation] replyFlex result: ' + JSON.stringify(result));

      if (!result.ok) {
        Logger.log('[Activation] Failed to send welcome flex message: ' + result.statusCode + ' ' + result.body);
        // Fallback ถ้า Flex ไม่สำเร็จ
        deps.MessageService.reply(replyToken, 'ยินดีต้อนรับ ' + member.mem_title + member.mem_fname + ' ' + member.mem_lname + ' คุณได้ activate เรียบร้อยแล้ว', token);
      } else {
        Logger.log('[Activation] Welcome flex message sent successfully for member: ' + member.mem_code);
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
        memberCode: member.mem_code,
        activationResult
      };
    } catch (error) {
      Logger.log('[Activation] ERROR: ' + error);
      Logger.log('[Activation] ERROR type: ' + typeof error);
      Logger.log('[Activation] ERROR message: ' + (error.message || 'no message'));
      Logger.log('[Activation] ERROR stack: ' + (error.stack || 'no stack'));
      Logger.log('[Activation] ERROR toString: ' + String(error));
      
      // ตอบกลับ error ให้ผู้ใช้ทราบ พร้อมรายละเอียดเพื่อ debug
      try {
        const deps = getDependencies();
        const errorDetail = String(error).substring(0, 100); // จำกัดความยาว
        deps.MessageService.reply(replyToken, 'เกิดข้อผิดพลาด: ' + errorDetail, token);
      } catch (replyError) {
        Logger.log('[Activation] Failed to send error reply: ' + replyError);
      }
      return { success: false, reason: 'error', error: String(error) };
    }
  }

  return {
    handleActivate
  };
})();