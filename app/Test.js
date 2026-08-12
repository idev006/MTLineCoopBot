/**
 * @fileoverview Test.js
 * ฟังก์ชันทดสอบระบบ — เลือกฟังก์ชันใน Apps Script Editor แล้วกด Run
 *
 * ฟังก์ชันหลัก:
 * - verifyMenuContract() — ตรวจสัญญา Item ID ระหว่าง MenuData.js ↔ ReplyStore.js
 *   ควรใช้ก่อนทุกครั้งที่ Deploy Rich Menu (บทที่ 3.3.7, 5.6.2, TC-12 ในบทที่ 6)
 */

/**
 * ตรวจสัญญา Item ID:
 * ทุก item id ใน RichMenu/MenuData.js ต้องมี key ตรงกันใน LineBot.ReplyStore.CAPTIONS
 * และมีข้อความตอบกลับใน TAB_1..TAB_5 (ไม่คืน "ไม่พบข้อมูลสำหรับรายการนี้")
 * @returns {number} จำนวน item id ที่ตรวจผ่าน
 */
function verifyMenuContract() {
  const ids = RichMenu.MenuData.listItemIds();
  Logger.log('MenuData postback item ids: ' + ids.length);

  // 1. ตรวจ CAPTIONS ครบทุก id
  const missingCaptions = ids.filter(id => !LineBot.ReplyStore.CAPTIONS[id]);
  if (missingCaptions.length > 0) {
    throw new Error('Missing CAPTIONS for: ' + missingCaptions.join(', '));
  }

  // 2. ตรวจข้อความตอบกลับครบ (fallback string บ่งว่าไม่มีข้อความ)
  const missingReplies = ids.filter(id => {
    const text = LineBot.ReplyStore.get(id);
    return !text || text === 'ไม่พบข้อมูลสำหรับรายการนี้';
  });
  if (missingReplies.length > 0) {
    throw new Error('Missing reply text for: ' + missingReplies.join(', '));
  }

  Logger.log('Contract OK — ครบ ' + ids.length + ' เมนู (CAPTIONS + reply text)');
  return ids.length;
}

/**
 * ทดสอบ Util.verifyLineSignature (HMAC-SHA256 + base64) ด้วย test vector
 * ค่าที่ใช้คำนวณด้วย crypto.createHmac('sha256', secret).update(body).digest('base64')
 * @returns {boolean}
 */
function testVerifyLineSignature() {
  const cases = [
    // [body, signature, secret, คาดหวัง]
    ['hello', 'iKqz7ejTrflNJquQ07r9SiCDBww7zOnAFO4EpEOEfAs=', 'secret', true],
    ['{"events":[]}', 'PPa4QqevUGV8UO2apjR9ZWG24X4aYwLsG3KzECKE81c=', 'line-secret', true],
    // ผิด secret / ผิด body / ไม่มีค่า
    ['hello', 'iKqz7ejTrflNJquQ07r9SiCDBww7zOnAFO4EpEOEfAs=', 'wrong-secret', false],
    ['hello-changed', 'iKqz7ejTrflNJquQ07r9SiCDBww7zOnAFO4EpEOEfAs=', 'secret', false],
    ['', 'x', 'secret', false],
    ['hello', '', 'secret', false]
  ];
  const failed = cases.filter(([body, sig, secret, expected]) =>
    Util.verifyLineSignature(body, sig, secret) !== expected
  );
  if (failed.length > 0) {
    throw new Error('testVerifyLineSignature FAILED: ' + JSON.stringify(failed));
  }
  Logger.log('testVerifyLineSignature OK — ' + cases.length + ' กรณี');
  return true;
}

/**
 * ทดสอบ Util.verifyWebhookSecret (token จาก query parameter)
 * @returns {boolean}
 */
function testVerifyWebhookSecret() {
  const ok = Util.verifyWebhookSecret({ parameter: { webhook_secret: 's3cret' } }, 's3cret');
  const bad = Util.verifyWebhookSecret({ parameter: { webhook_secret: 'wrong' } }, 's3cret');
  const missing = Util.verifyWebhookSecret({ parameter: {} }, 's3cret');
  const noConfig = Util.verifyWebhookSecret({ parameter: { webhook_secret: 's3cret' } }, '');
  if (!ok || bad || missing || noConfig) {
    throw new Error('testVerifyWebhookSecret FAILED');
  }
  Logger.log('testVerifyWebhookSecret OK');
  return true;
}

/**
 * ทดสอบ SheetService.isActiveMember / hasRole (กฎความ valid บทที่ 3.7.2)
 * @returns {boolean}
 */
function testMemberValidity() {
  const S = LineBot.SheetService;
  const DAY = 24 * 3600 * 1000;
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} 00:00:00`;
  const past = new Date(Date.now() - 3650 * DAY);   // 10 ปีก่อน
  const future = new Date(Date.now() + 3650 * DAY); // 10 ปีหน้า
  const valid = { mem_status: 'active', mem_role: 'member', mem_eff_dt: fmt(past), mem_exp_dt: fmt(future) };

  const cases = [
    [valid, true, 'valid member'],
    [{ ...valid, mem_status: 'inactive' }, false, 'status ไม่ใช่ active'],
    [{ ...valid, mem_eff_dt: fmt(future) }, false, 'ยังไม่ถึงวันเริ่ม'],
    [{ ...valid, mem_exp_dt: fmt(past) }, false, 'หมดอายุแล้ว'],
    [{ ...valid, mem_eff_dt: '' }, false, 'ไม่มีวันเริ่ม (fail-safe)'],
    [{ ...valid, mem_exp_dt: null }, false, 'ไม่มีวันหมดอายุ (fail-safe)'],
    [null, false, 'ไม่มี member'],
    [valid, true, 'hasRole(member, member) ผ่าน'],
    [{ ...valid, mem_role: 'staff' }, false, 'hasRole(member, member) ไม่ผ่านเมื่อ role เป็น staff'],
    [{ ...valid, mem_role: 'admin' }, true, 'hasRole(member, admin) ผ่าน']
  ];

  // ข้อ 1–7 ใช้ isActiveMember; ข้อ 8–10 ใช้ hasRole
  const failed = [];
  for (let i = 0; i < cases.length; i++) {
    const [member, expected, label] = cases[i];
    let actual;
    if (i < 7) actual = S.isActiveMember(member);
    else actual = S.hasRole(member, i === 8 ? 'member' : (i === 9 ? 'admin' : 'member'));
    if (actual !== expected) failed.push(label + ' (expected ' + expected + ', got ' + actual + ')');
  }
  if (failed.length > 0) {
    throw new Error('testMemberValidity FAILED: ' + failed.join(' | '));
  }
  Logger.log('testMemberValidity OK — ' + cases.length + ' กรณี');
  return true;
}

/**
 * ตรวจสุขภาพ Channel Access Token — เรียก LINE Get Bot Info API
 * (GET https://api.line.me/v2/bot/info)
 *
 * ใช้เมื่อ: หลังหมุน token (Runbook บทที่ 5.5.1) · สงสัยว่า token เสีย/หมดอายุ ·
 * ตรวจรายเดือนตามนโยบายความปลอดภัย (บทที่ 7.1.3)
 *
 * รันใน Apps Script Editor → เลือกฟังก์ชัน checkTokenHealth → Run
 * (ไม่รันใน CI เพราะต้องใช้ token จริง + network)
 *
 * @returns {Object} { ok: boolean, status: number|null, info?: Object, error?: string }
 */
function checkTokenHealth() {
  const cfg = Config.get();
  const token = cfg.CHANNEL_ACCESS_TOKEN;
  if (!token) {
    Logger.log('❌ ไม่พบ CHANNEL_ACCESS_TOKEN ใน Script Properties — กรุณาตั้งค่าก่อน (บทที่ 5.5)');
    return { ok: false, status: null, error: 'missing token' };
  }

  const options = {
    method: 'get',
    headers: { 'Authorization': 'Bearer ' + token },
    muteHttpExceptions: true // ไม่ throw — ตรวจ response code เอง
  };

  let response;
  try {
    response = UrlFetchApp.fetch('https://api.line.me/v2/bot/info', options);
  } catch (err) {
    Logger.log('❌ เรียก LINE API ไม่ได้ (network/UrlFetchApp): ' + err);
    return { ok: false, status: null, error: String(err) };
  }

  const status = response.getResponseCode();
  const body = response.getContentText();

  if (status === 200) {
    const info = JSON.parse(body);
    Logger.log('✅ Token ถูกต้อง (HTTP 200)');
    Logger.log('   Bot displayName : ' + info.displayName);
    Logger.log('   Bot userId      : ' + info.userId);
    Logger.log('   basicId         : ' + info.basicId);
    Logger.log('   chatMode        : ' + info.chatMode + ' · markAsReadMode: ' + info.markAsReadMode);
    return { ok: true, status: status, info: info };
  }

  if (status === 401) {
    Logger.log('❌ Token ไม่ถูกต้อง/หมดอายุ (HTTP 401) — กรุณาหมุน token ตาม Runbook บทที่ 5.5.1');
  } else {
    Logger.log('❌ LINE API ตอบกลับ HTTP ' + status + ': ' + body.substring(0, 300));
  }
  return { ok: false, status: status, error: body };
}

/**
 * ทดสอบ Welcome Menu (Per-User Gating — บทที่ 3.3.6):
 * โครงสร้างถูกต้อง + ทุก item id มี caption และข้อความตอบกลับใน ReplyStore
 * @returns {number} จำนวนเมนู welcome ที่ตรวจผ่าน
 */
function testWelcomeMenu() {
  const w = RichMenu.MenuData.buildWelcomeTab();
  if (!w || w.size.width !== 2500 || w.size.height !== 1686) {
    throw new Error('testWelcomeMenu: ขนาด Welcome Menu ไม่ถูกต้อง');
  }
  if (w.name !== 'RichMenu-Coop-Welcome') {
    throw new Error('testWelcomeMenu: ชื่อ Welcome Menu ไม่ถูกต้อง: ' + w.name);
  }
  if (!w.areas || w.areas.length === 0) {
    throw new Error('testWelcomeMenu: Welcome Menu ไม่มี areas');
  }

  // รวบรวม item id จาก postback ใน welcome menu
  const ids = [];
  w.areas.forEach(area => {
    const action = area.action;
    const data = action && action.data ? String(action.data) : '';
    const m = data.match(/item=([^&]+)/);
    if (m) ids.push(m[1]);
  });
  if (ids.length === 0) {
    throw new Error('testWelcomeMenu: ไม่พบ postback item ใน Welcome Menu');
  }

  // ทุก item ต้องมี caption + ข้อความตอบกลับ
  const missingCaption = ids.filter(id => !LineBot.ReplyStore.CAPTIONS[id]);
  if (missingCaption.length > 0) {
    throw new Error('testWelcomeMenu: ขาด CAPTIONS: ' + missingCaption.join(', '));
  }
  const missingReply = ids.filter(id => {
    const text = LineBot.ReplyStore.get(id);
    return !text || text === 'ไม่พบข้อมูลสำหรับรายการนี้';
  });
  if (missingReply.length > 0) {
    throw new Error('testWelcomeMenu: ขาด reply text: ' + missingReply.join(', '));
  }

  Logger.log('testWelcomeMenu OK — ' + ids.length + ' เมนู (โครงสร้าง + captions + replies)');
  return ids.length;
}

/**
 * ทดสอบ MemberRepository (Repository Pattern — บทที่ 3.2.4):
 * factory เลือก repository ตาม DB_TYPE + ตรวจสัญญา (interface) ครบถ้วน
 * @returns {boolean}
 */
function testMemberRepository() {
  const propsService = PropertiesService.getScriptProperties();

  // 1) default (DB_TYPE='sheets') → ได้ SheetsMemberRepository ครบตามสัญญา
  const repo = Data.MemberRepository.getRepository();
  const names = ['findByLineUserId', 'findByActivateCode', 'activateMember', 'isActiveMember', 'hasRole'];
  const missing = names.filter(n => typeof repo[n] !== 'function');
  if (missing.length > 0) {
    throw new Error('testMemberRepository: SheetsMemberRepository ขาดฟังก์ชัน: ' + missing.join(', '));
  }

  // 2) assertImplemented ผ่านกับ repo ที่ครบ
  Data.MemberRepository.assertImplemented(repo);

  // 3) assertImplemented throw กับ object ที่ไม่ครบสัญญา
  let threw = false;
  try { Data.MemberRepository.assertImplemented({ findByLineUserId: function () {} }); } catch (e) { threw = true; }
  if (!threw) throw new Error('testMemberRepository: assertImplemented ควร throw เมื่อ object ไม่ครบสัญญา');

  // 4) DB_TYPE=firestore → ยังไม่ implement ต้อง throw (แทนที่จะเงียบๆ ใช้ตัวผิด)
  propsService.setProperty('DB_TYPE', 'firestore');
  threw = false;
  try { Data.MemberRepository.getRepository(); } catch (e) { threw = true; }
  if (!threw) throw new Error('testMemberRepository: DB_TYPE=firestore ควร throw (ยังไม่ implement)');

  // 5) คืนค่า DB_TYPE=sheets → ทำงานได้ตามเดิม
  propsService.deleteProperty('DB_TYPE');
  const repo2 = Data.MemberRepository.getRepository();
  if (typeof repo2.findByLineUserId !== 'function') {
    throw new Error('testMemberRepository: กลับมาใช้ sheets repository ไม่ได้หลัง reset');
  }

  Logger.log('testMemberRepository OK — interface + factory (DB_TYPE switch)');
  return true;
}

/**
 * ตรวจ caption เป็นภาษาไทย (ไม่มี id ภาษาอังกฤษหลุดไปแสดงแก่สมาชิก)
 * @returns {number} จำนวนเมนูที่ caption เป็นภาษาไทย
 */
function verifyThaiCaptions() {
  const ids = RichMenu.MenuData.listItemIds();
  const thaiRegex = /[\u0E00-\u0E7F]/; // ช่วงอักขระภาษาไทย
  const notThai = ids.filter(id => {
    const caption = LineBot.ReplyStore.getCaption(id);
    return !thaiRegex.test(caption);
  });
  if (notThai.length > 0) {
    throw new Error('Captions not Thai for: ' + notThai.join(', '));
  }
  Logger.log('Thai captions OK — ครบ ' + ids.length + ' เมนู');
  return ids.length;
}
