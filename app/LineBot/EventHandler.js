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
      SheetService: LineBot.SheetService,
      MemberData: LineBot.MemberDataService
    };
  }

  /**
   * เรียก API Layer สำหรับข้อมูลสมาชิก (Bot เป็น UI Adapter — การ์ด MT-17)
   * Bot ใช้ endpoint เดียวกันกับ UI อื่น (LIFF/Admin — เฟส 3):
   *   GET /api/member/profile · /api/member/savings · /api/member/loans · /api/member/dividends
   * ผ่าน Api.ApiService.handleRequest → envelope { ok, data } | { ok, error }
   * (Auth = ฝั่ง Gate: getAuthorizedMember ตรวจสิทธิ์ก่อน — ข้อมูลผ่าน API เดียวกัน)
   * @param {string} path - เส้นทาง API เช่น '/api/member/profile'
   * @param {string} lineUserId
   * @returns {Object} envelope จาก Api.ApiService
   */
  function apiGet(path, lineUserId) {
    return Api.ApiService.handleRequest('GET', path, { auth: { lineUserId } });
  }

  /**
   * map item id ของเมนูการเงิน → คีย์ endpoint API (ตารางที่เกี่ยวข้อง)
   * (saving_acct/chk_balance → savings · loan_balance → loans · dividends/share_capital → dividends)
   */
  const FINANCIAL_API = {
    saving_acct: 'savings',
    chk_balance: 'savings',
    loan_balance: 'loans',
    dividends: 'dividends',
    share_capital: 'dividends'
  };

  /**
   * ตอบข้อความเมื่อ API คืน error (fallback — ควรเกิดขึ้นได้ยากเพราะ Gate ผ่านแล้ว)
   * @param {string} replyToken
   * @param {string} token
   * @param {Object} env - envelope { ok:false, error }
   */
  function replyApiDataError(replyToken, token, env) {
    const detail = (env && env.error && env.error.message) ? (' (' + env.error.message + ')') : '';
    getDependencies().MessageService.reply(replyToken,
      'ขออภัย เกิดข้อผิดพลาดในการดึงข้อมูล' + detail + ' — กรุณาลองใหม่อีกครั้ง', token);
    Logger.log(`[API] data request failed: ${detail}`);
  }

  /**
   * ตอบเนื้อหาเมนูข้อมูล/เอกสาร/ติดต่อ (การ์ด MT-14) — data-driven:
   * 1) อ่านจากตาราง t_content (แก้ไขได้ในชีท ไม่ต้องแก้โค้ด)
   * 2) ถ้าไม่มี → ข้อความ static จริงใน ReplyStore
   * 3) ถ้าเป็น sentinel ('ไม่พบข้อมูลสำหรับรายการนี้') → คืน false (ให้ flex ตอบแทน)
   * @param {string} item
   * @param {string} replyToken
   * @param {string} token
   * @returns {boolean} true ถ้าตอบแล้ว
   */
  function replyContentItem(item, replyToken, token) {
    if (!item) return false;
    // 1) t_content (data-driven)
    try {
      const repo = Data.MemberRepository.getRepository();
      const content = repo.getContent(item);
      if (content) {
        getDependencies().MessageService.reply(replyToken, content, token);
        Logger.log(`Content menu replied from t_content: ${item}`);
        return true;
      }
    } catch (contentErr) {
      Logger.log(`[Content] getContent failed (fallback ไป ReplyStore): ${contentErr}`);
    }
    // 2) ReplyStore static (ข้อความจริง — ไม่ใช่ flex placeholder)
    const text = getDependencies().ReplyStore.get(item);
    if (text && text !== 'ไม่พบข้อมูลสำหรับรายการนี้') {
      getDependencies().MessageService.reply(replyToken, text, token);
      Logger.log(`Content menu replied from ReplyStore: ${item}`);
      return true;
    }
    // 3) ไม่มีเนื้อหา → flex (ทางเลือกสุดท้าย)
    return false;
  }

  /**
   * Gate ตรวจสิทธิ์ (บทที่ 3.7):
   * ตรวจว่าผู้ใช้ LINE เป็นสมาชิกที่ valid — ถูกผูกกับ t_member_mast ผ่าน line_user_id,
   * สถานะ active, อยู่ในช่วง [mem_eff_dt, mem_exp_dt], และมีบทบาทที่รู้จัก (member/staff/admin)
   * ผ่าน MemberRepository (Data layer — บทที่ 3.2.4) เพื่อสลับฐานข้อมูลได้ในอนาคต
   * @param {string} lineUserId
   * @returns {Object|null} member ถ้าผ่าน / null ถ้าไม่ผ่าน
   */
  function getAuthorizedMember(lineUserId) {
    const repo = Data.MemberRepository.getRepository();
    const member = repo.findByLineUserId(lineUserId);
    if (!member) return null;
    if (!repo.isActiveMember(member)) return null;
    const knownRoles = ['member', 'staff', 'admin'];
    if (!knownRoles.includes(member.mem_role)) return null;
    return member;
  }

  /**
   * แนบคำเตือนวันหมดอายุท้ายข้อความตอบกลับ (การ์ด MT-11)
   * สมาชิกที่เหลือเวลาไม่เกิน EXPIRY_WARNING_DAYS วัน จะเห็นคำเตือนในคำตอบ
   * (สมาชิกที่หมดอายุถูก Gate ปฏิเสธอยู่แล้ว — ที่นี่เตือนเฉพาะกรณี "ใกล้หมด")
   * @param {string} text
   * @param {Object} member
   * @returns {string}
   */
  function withExpiryWarning(text, member) {
    const expiry = Core.MemberRules.getExpiryStatus(member, undefined, Config.get().EXPIRY_WARNING_DAYS);
    return LineBot.MemberDataService.appendExpiryWarning(text, member, expiry);
  }

  /**
   * ข้อความเตือนวันหมดอายุ (ถ้ามี) — ใส่เป็นกล่องเตือนใน Flex Card (การ์ด MT-34)
   * @param {Object} member
   * @returns {string} '' ถ้าไม่ควรเตือน
   */
  function getExpiryWarningText(member) {
    if (!member) return '';
    const expiry = Core.MemberRules.getExpiryStatus(member, undefined, Config.get().EXPIRY_WARNING_DAYS);
    return LineBot.MemberDataService.buildExpiryWarning(member, expiry);
  }

  /**
   * ตอบ alertCard ตามระดับ (การ์ด MT-35) — fallback: ข้อความ text ถ้าการ์ดส่งไม่ได้
   * @param {string} replyToken
   * @param {string} token
   * @param {string} level - success | warning | error
   * @param {string} title
   * @param {string} message
   */
  function replyAlert(replyToken, token, level, title, message) {
    const deps = getDependencies();
    const card = deps.FlexBuilder.alertCard({ level: level, title: title, message: message });
    const res = deps.MessageService.replyFlex(replyToken, card, token);
    if (!res.ok) {
      Logger.log(`[Alert] replyFlex failed (${res.statusCode}) — fallback ข้อความเดิม`);
      deps.MessageService.reply(replyToken, message, token);
    }
  }

  /**
   * ตอบข้อความปฏิเสธเมื่อผู้ใช้ไม่มีสิทธิ์ใช้งานเมนู/คำสั่งของสมาชิก
   * ถ้าเคยเป็นสมาชิกแต่ไม่ valid (หมดอายุ/ถูกเพิกถอน) → ยกเลิกเมนูสมาชิก
   * ให้กลับไปเห็น Welcome Menu (Per-User Gating — บทที่ 3.3.6)
   * @param {string} replyToken
   * @param {string} token
   * @param {string} lineUserId
   */
  function replyUnauthorized(replyToken, token, lineUserId) {
    const deps = getDependencies();

    // ถ้าเคยถูกผูกเป็นสมาชิกแล้ว แต่ตอนนี้ไม่ valid → ยกเลิกการผูกเมนู (กลับไป Welcome)
    if (lineUserId) {
      try {
        const repo = Data.MemberRepository.getRepository();
        const member = repo.findByLineUserId(lineUserId);
        if (member && !repo.isActiveMember(member)) {
          if (typeof RichMenu !== 'undefined' && RichMenu.Gating) {
            RichMenu.Gating.unlinkMemberMenu(lineUserId, token);
            Logger.log(`[Gate] Unlinked member menu for expired/revoked user: ${lineUserId}`);
          }
        }
      } catch (unlinkError) {
        Logger.log(`[Gate] unlinkMemberMenu failed (ไม่บล็อก reply): ${unlinkError}`);
      }
    }

    deps.MessageService.reply(replyToken,
      'คุณยังไม่ได้รับสิทธิ์ใช้งานเมนูนี้ กรุณาลงทะเบียนเปิดสิทธิ์ด้วยรหัส activate ก่อน เช่น activate:ABC123',
      token);
  }

  /**
   * รายการ item id ของ Welcome Menu (เมนูสาธารณะ — ไม่ต้องผ่าน Gate)
   */
  const WELCOME_ITEMS = ['welcome_activate', 'welcome_howto', 'welcome_contact', 'welcome_news'];

  /**
   * ตอบกลับเมนูสาธารณะ (Welcome Menu) — ใช้ได้โดยไม่ต้องเป็นสมาชิก
   * @param {string} item
   * @param {string} replyToken
   * @param {string} token
   * @returns {boolean} true ถ้าจัดการแล้ว
   */
  function handleWelcomeItem(item, replyToken, token) {
    if (!WELCOME_ITEMS.includes(item)) return false;
    const deps = getDependencies();
    const text = deps.ReplyStore.get(item);
    deps.MessageService.reply(replyToken, text, token);
    Logger.log(`Welcome menu replied: ${item}`);
    return true;
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

    // การ์ด MT-35: ยืนยัน/ยกเลิกการต่ออายุ (ขั้น 2 ของ flow renew — หลังกดปุ่มใน confirmCard)
    if (params.action === 'cancel_renew') {
      deps.MessageService.reply(replyToken, 'ยกเลิกการต่ออายุสมาชิกแล้ว', token);
      return;
    }
    if (params.action === 'confirm_renew') {
      try {
        LineBot.RenewalService.handleConfirmRenew(params.code || '', event.source.userId, replyToken, token);
      } catch (e) {
        Logger.log('[EventHandler] Error calling RenewalService.handleConfirmRenew: ' + e);
        deps.MessageService.reply(replyToken, 'เกิดข้อผิดพลาดในการต่ออายุสมาชิก', token);
      }
      return;
    }

    if (params.action === 'menu_item') {
      // Welcome Menu (เมนูสาธารณะ) — ไม่ต้องผ่าน Gate
      if (handleWelcomeItem(params.item, replyToken, token)) {
        return;
      }
      // Gate: ต้องเป็นสมาชิกที่ valid ก่อนจึงจะใช้เมนูสมาชิกได้
      const member = getAuthorizedMember(event.source.userId);
      if (!member) {
        replyUnauthorized(replyToken, token, event.source.userId);
        return;
      }
      // MT-17 (Bot เป็น UI Adapter): ข้อมูลสมาชิกเรียกผ่าน Api.ApiService —
      // endpoint เดียวกับ UI อื่น ๆ · จัดรูปแบบการ์ดที่ MemberDataService + FlexBuilder (UI layer)
      // MT-34: profile/การเงินตอบเป็น Flex Card (ข้อมูลเหมือนเดิม) — fallback ข้อความเดิมถ้าการ์ดส่งไม่ได้
      if (params.item === 'profile') {
        const env = apiGet('/api/member/profile', event.source.userId);
        if (!env.ok) { replyApiDataError(replyToken, token, env); return; }
        const memberData = env.data;
        const card = deps.FlexBuilder.profileCard(memberData, { warning: getExpiryWarningText(memberData) });
        const result = deps.MessageService.replyFlex(replyToken, card, token);
        if (!result.ok) {
          Logger.log(`Profile card reply failed (${result.statusCode}) — fallback ข้อความเดิม`);
          const profileText = deps.MemberData.buildProfileText(memberData);
          deps.MessageService.reply(replyToken, withExpiryWarning(profileText, member), token);
        }
        Logger.log(`Profile replied via API for ${member.mem_code}`);
        return;
      }
      if (deps.MemberData.isFinancialItem(params.item)) {
        // ดึงเฉพาะตารางของเมนูนั้น ๆ ผ่าน API (savings/loans/dividends)
        const key = FINANCIAL_API[params.item];
        const env = apiGet('/api/member/' + key, event.source.userId);
        if (!env.ok) { replyApiDataError(replyToken, token, env); return; }
        const financeData = { savings: [], loans: [], dividends: [] };
        financeData[key] = (env.data && env.data[key]) || [];
        const card = deps.FlexBuilder.financeCard({
          ...deps.MemberData.buildFinanceCardData(params.item, member, financeData),
          warning: getExpiryWarningText(member)
        });
        const result = deps.MessageService.replyFlex(replyToken, card, token);
        if (!result.ok) {
          Logger.log(`Finance card reply failed (${result.statusCode}) — fallback ข้อความเดิม`);
          const financeText = deps.MemberData.buildFinanceText(params.item, member, financeData);
          deps.MessageService.reply(replyToken, withExpiryWarning(financeText, member), token);
        }
        Logger.log(`Financial menu replied via API: ${params.item}`);
        return;
      }
      // MT-14: เมนูข้อมูล/เอกสาร/ติดต่อ — ตอบเนื้อหาจริง (t_content → ReplyStore) ก่อน flex
      if (replyContentItem(params.item, replyToken, token)) {
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
      // Welcome Menu (เมนูสาธารณะ) — ไม่ต้องผ่าน Gate
      if (handleWelcomeItem(fallbackItem, replyToken, token)) {
        return;
      }
      // Gate เช่นเดียวกับ menu_item — fallback ก็ต้องเป็นสมาชิกที่ valid
      if (!getAuthorizedMember(event.source.userId)) {
        replyUnauthorized(replyToken, token, event.source.userId);
        return;
      }
      // MT-14: fallback path ก็ตอบเนื้อหาจริงเหมือนกัน (t_content → ReplyStore)
      if (replyContentItem(fallbackItem, replyToken, token)) {
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
        replyAlert(event.replyToken, token, 'warning', 'กรุณาระบุรหัส', 'กรุณาระบุรหัส activate เช่น activate:ABC123');
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

    if (text.startsWith('renew') || text.startsWith('ต่ออายุ')) {
      // การ์ด MT-12: ต่ออายุสมาชิก — renew:CODE (ตามรหัส) หรือ renew (ตัวเอง)
      const activateCode = (text.startsWith('renew:') || text.startsWith('ต่ออายุ:'))
        ? text.split(':')[1].trim()
        : '';
      if (text.indexOf(':') !== -1 && !activateCode) {
        replyAlert(event.replyToken, token, 'warning', 'กรุณาระบุรหัสต่ออายุ', 'กรุณาระบุรหัสต่ออายุ เช่น renew:ABC123');
        return;
      }
      try {
        LineBot.RenewalService.handleRenew(activateCode, event.source.userId, event.replyToken, token);
      } catch (e) {
        Logger.log('[EventHandler] Error calling RenewalService: ' + e);
        deps.MessageService.reply(event.replyToken, 'เกิดข้อผิดพลาดในการต่ออายุสมาชิก', token);
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
