/**
 * @fileoverview LineBot.EventHandler
 * จัดการ webhook events จาก LINE
 */

var LineBot = LineBot || {};

LineBot.EventHandler = (() => {
  'use strict';

  /**
   * Apps Script may evaluate files in an order that is not the same as the
   * logical dependency order. Resolve LineBot modules at runtime so this
   * handler does not capture undefined services during initialization.
   * @returns {{MessageService: Object, ReplyStore: Object, FlexBuilder: Object}}
   */
  function getDependencies() {
    return {
      MessageService: LineBot.MessageService,
      ReplyStore: LineBot.ReplyStore,
      FlexBuilder: LineBot.FlexBuilder,
      SheetService: LineBot.SheetService
    };
  }

  /**
   * Gate ตรวจสิทธิ์ (บทที่ 3.7):
   * ตรวจว่าผู้ใช้ LINE เป็นสมาชิกที่ valid — ถูกผูกกับ t_member_mast ผ่าน line_user_id,
   * สถานะ active, อยู่ในช่วง [mem_eff_dt, mem_exp_dt], และมีบทบาทที่รู้จัก (member/staff/admin)
   * @param {string} lineUserId
   * @returns {Object|null} member ถ้าผ่าน / null ถ้าไม่ผ่าน
   */
  function getAuthorizedMember(lineUserId) {
    const member = LineBot.SheetService.findByLineUserId(lineUserId);
    if (!member) return null;
    if (!LineBot.SheetService.isActiveMember(member)) return null;
    const knownRoles = ['member', 'staff', 'admin'];
    if (!knownRoles.includes(member.mem_role)) return null;
    return member;
  }

  /**
   * ตอบข้อความปฏิเสธเมื่อผู้ใช้ไม่มีสิทธิ์ใช้งานเมนู/คำสั่งของสมาชิก
   * @param {string} replyToken
   * @param {string} token
   */
  function replyUnauthorized(replyToken, token) {
    const deps = getDependencies();
    deps.MessageService.reply(replyToken,
      'คุณยังไม่ได้รับสิทธิ์ใช้งานเมนูนี้ กรุณาลงทะเบียนเปิดสิทธิ์ด้วยรหัส activate ก่อน เช่น activate:ABC123',
      token);
  }

  /**
   * จัดการ postback event
   * @param {Object} event
   * @param {string} token
   */
  function handlePostback(event, token) {
    const deps = getDependencies();
    const data = event.postback && event.postback.data ? event.postback.data : '';
    const params = Util.parseQueryString(data);
    const replyToken = event.replyToken;

    Logger.log(`postback received: ${data}`);
    Logger.log(`postback params: ${JSON.stringify(params)}`);

    if (params.action === 'switch_tab') {
      Logger.log(`User switched to: ${params.to}`);
      return;
    }

    if (params.action === 'stay_tab') {
      return;
    }

    if (params.action === 'menu_item') {
      // Gate: ต้องเป็นสมาชิกที่ valid ก่อนจึงจะใช้เมนูสมาชิกได้
      if (!getAuthorizedMember(event.source.userId)) {
        replyUnauthorized(replyToken, token);
        return;
      }
      const caption = deps.ReplyStore.getCaption(params.item);
      const flexMessage = deps.FlexBuilder.menuClicked(caption);
      Logger.log(`Replying flex message for menu: ${caption}`);
      const result = deps.MessageService.replyFlex(replyToken, flexMessage, token);
      if (!result.ok) {
        Logger.log(`Flex reply failed for ${params.item}: ${result.statusCode} ${result.body}`);
      }
      return;
    }

    // บางกรณี Rich Menu เดิมอาจถูก deploy เป็น postback ที่ไม่มี action=menu_item
    // เช่น data เป็นแค่รหัสเมนูโดยตรง จึงรองรับ fallback ให้ตอบ Flex ได้เช่นกัน
    const fallbackItem = params.item || params.menu || params.action || data;
    if (fallbackItem && deps.ReplyStore.CAPTIONS[fallbackItem]) {
      // Gate เช่นเดียวกับ menu_item — fallback ก็ต้องเป็นสมาชิกที่ valid
      if (!getAuthorizedMember(event.source.userId)) {
        replyUnauthorized(replyToken, token);
        return;
      }
      const caption = deps.ReplyStore.getCaption(fallbackItem);
      const flexMessage = deps.FlexBuilder.menuClicked(caption);
      Logger.log(`Replying flex message from fallback postback item: ${fallbackItem}`);
      const result = deps.MessageService.replyFlex(replyToken, flexMessage, token);
      if (!result.ok) {
        Logger.log(`Fallback flex reply failed for ${fallbackItem}: ${result.statusCode} ${result.body}`);
      }
      return;
    }

    // ถ้า action ไม่ใช่ menu_item ให้ log ไว้เพื่อ debug และตอบกลับเพื่อยืนยันว่า webhook ทำงาน
    Logger.log(`Unhandled postback action: ${params.action || '(empty)'}`);
    deps.MessageService.reply(replyToken, `ได้รับ postback แล้ว แต่ยังไม่รู้จักเมนู: ${data || '(ไม่มี data)'}`, token);
  }

  /**
   * จัดการ text message event
   * @param {Object} event
   * @param {string} token
   */
  function handleTextMessage(event, token) {
    const deps = getDependencies();
    const text = event.message.text;

    Logger.log('[EventHandler] Received text: ' + text);

    // จัดการคำสั่ง activate
    // หมายเหตุ: คำสั่ง activate: ไม่ต้องผ่าน Gate (เป็นขั้นตอนลงทะเบียนเปิดสิทธิ์)
    if (text.startsWith('activate:')) {
      Logger.log('[EventHandler] Processing activate command');
      const activateCode = text.substring('activate:'.length).trim();
      Logger.log('[EventHandler] Activate code: ' + activateCode);
      if (!activateCode) {
        deps.MessageService.reply(event.replyToken, 'กรุณาระบุรหัส activate เช่น activate:ABC123', token);
        return;
      }
      try {
        Logger.log('[EventHandler] Calling ActivationService.handleActivate...');
        LineBot.ActivationService.handleActivate(activateCode, event.source.userId, event.replyToken, token);
        Logger.log('[EventHandler] ActivationService.handleActivate called successfully');
      } catch (e) {
        Logger.log('[EventHandler] Error calling ActivationService: ' + e);
        deps.MessageService.reply(event.replyToken, 'เกิดข้อผิดพลาดในการเรียก ActivationService', token);
      }
      return;
    }

    if (text.startsWith('คำนวณ')) {
      // Gate: คำสั่งคำนวณเป็นบริการของสมาชิก ต้องเป็นสมาชิกที่ valid
      if (!getAuthorizedMember(event.source.userId)) {
        replyUnauthorized(event.replyToken, token);
        return;
      }
      deps.MessageService.reply(event.replyToken, 'ระบบกำลังคำนวณผลลัพธ์ให้...', token);
    }
  }

  return {
    handlePostback,
    handleTextMessage
  };
})();
