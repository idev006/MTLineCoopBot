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
 * ทดสอบ MemberDataService (MT-10 — ดึงข้อมูลจริงตามเมนู):
 * profile แสดงข้อมูลจริงจาก t_member_mast · เมนูการเงินตอบสถานะชัดเจน (ไม่ปลอมตัวเลข)
 * @returns {boolean}
 */
function testMemberDataService() {
  const S = LineBot.MemberDataService;
  const member = {
    mem_title: 'นาย', mem_fname: 'สมชาย', mem_lname: 'ใจดี',
    mem_code: 'M001', mem_role: 'member', mem_position: 'กรรมการ',
    mem_position_score: 10, mem_rank_score: 25, mem_status: 'active',
    mem_eff_dt: '2026-08-06', mem_exp_dt: '2027-08-06',
    mem_kk: 85, mem_bk: 50000, mem_bh: 10000
  };

  // 1) profile มีข้อมูลจริง
  const p = S.buildProfileText(member);
  if (!p.includes('นาย สมชาย ใจดี')) throw new Error('testMemberDataService: profile ไม่มีชื่อจริง');
  if (!p.includes('M001')) throw new Error('testMemberDataService: profile ไม่มีรหัสสมาชิก');
  if (!p.includes('2026-08-06')) throw new Error('testMemberDataService: profile ไม่มีช่วงวันสิทธิ์');

  // 1b) ฟิลด์เพิ่มเติม (MT-30): คะแนนความดี / เงินกู้คงค้าง / เงินหุ้น
  if (!p.includes('คะแนนความดี: 85')) throw new Error('testMemberDataService: profile ไม่มีคะแนนความดี');
  if (!p.includes('เงินกู้คงค้าง: 50,000.00 บาท')) throw new Error('testMemberDataService: profile ไม่มีเงินกู้คงค้าง (จัดรูปแบบเงิน)');
  if (!p.includes('เงินหุ้น: 10,000.00 บาท')) throw new Error('testMemberDataService: profile ไม่มีเงินหุ้น');

  // 1c) สมาชิกที่ไม่มีค่าฟิลด์ใหม่ → ไม่แสดงบรรทัดนั้น (ไม่โชว์ว่าง ๆ)
  const p2 = S.buildProfileText({ ...member, mem_kk: undefined, mem_bk: null, mem_bh: '' });
  if (p2.includes('คะแนนความดี')) throw new Error('testMemberDataService: ไม่ควรแสดงคะแนนความดีเมื่อไม่มีค่า');
  if (p2.includes('เงินกู้คงค้าง')) throw new Error('testMemberDataService: ไม่ควรแสดงเงินกู้คงค้างเมื่อไม่มีค่า');

  // 2) profile null → ข้อความไม่พบข้อมูล
  if (S.buildProfileText(null) !== 'ไม่พบข้อมูลสมาชิก') {
    throw new Error('testMemberDataService: buildProfileText(null) ผิด');
  }

  // 3) การจัดกลุ่มเมนูการเงิน
  if (!S.isFinancialItem('saving_acct')) throw new Error('testMemberDataService: saving_acct ควรเป็นเมนูการเงิน');
  if (!S.isFinancialItem('loan_balance')) throw new Error('testMemberDataService: loan_balance ควรเป็นเมนูการเงิน');
  if (S.isFinancialItem('profile')) throw new Error('testMemberDataService: profile ไม่ควรเป็นเมนูการเงิน');

  // 4) เมนูการเงินไม่มีข้อมูล → ตอบสถานะจริง (ไม่ปลอมตัวเลข) + มี caption
  const f = S.buildFinanceText('saving_acct', member);
  if (!f.includes('บัญชีเงินฝาก')) throw new Error('testMemberDataService: finance text ไม่มี caption');
  if (!f.includes('ไม่พบข้อมูลบัญชีเงินฝาก')) throw new Error('testMemberDataService: finance text ควรแจ้งไม่พบข้อมูล');
  if (/\d{3,}[.,]\d{2}\s*บาท/.test(f)) throw new Error('testMemberDataService: ห้ามมีตัวเลขยอดเงินปลอม');

  Logger.log('testMemberDataService OK — profile จริง + เมนูการเงินตอบสถานะจริง');
  return true;
}

/**
 * ทดสอบ SeedData (MT-27):
 * dummy rows ตรงกับคอลัมน์ใน DataDict (SSOT) · ครบ 4 ตาราง · mem_code เป็น MEMxxx
 * (pure — ตรวจโครงสร้างได้โดยไม่ต้องพึ่ง SpreadsheetApp)
 * @returns {boolean}
 */
function testSeedData() {
  const rows = SeedData.getDummyRows();
  const keys = SeedData.SEED_TABLE_KEYS;
  if (keys.length !== 8) throw new Error('testSeedData: ต้องมี 8 ตาราง (ได้ ' + keys.length + ')');

  for (const key of keys) {
    const headers = DataDict.getHeaders(key);
    const rowsForKey = rows[key] || [];
    if (rowsForKey.length === 0) throw new Error('testSeedData: ' + key + ' ไม่มี dummy rows');
    for (const row of rowsForKey) {
      if (row.length !== headers.length) {
        throw new Error('testSeedData: ' + key + ' แถวมี ' + row.length + ' ค่า แต่ DataDict กำหนด ' + headers.length + ' คอลัมน์');
      }
    }
  }

  // FK ใช้ได้จริง: mem_code ในตารางการเงินเป็น MEMxxx (ต้องมีใน t_member_mast)
  for (const s of rows.SAVINGS_ACCT) {
    if (!/^MEM\d{3}$/.test(String(s[0]))) throw new Error('testSeedData: mem_code ต้องเป็น MEMxxx');
  }

  // คอลัมน์หลักของแต่ละตารางตรงตามที่ออกแบบไว้
  const expect = {
    SAVINGS_ACCT: ['mem_code', 'acct_no', 'acct_type', 'balance', 'updated_dt'],
    LOAN_ACCT: ['mem_code', 'loan_no', 'principal', 'outstanding', 'due_dt'],
    DIVIDEND: ['mem_code', 'year', 'dividend_amt', 'share_capital'],
    ACTIVATION_LOG: ['log_id', 'mem_code', 'line_user_id', 'activate_code', 'status', 'activated_dt'],
    EXPIRY_LOG: ['log_id', 'mem_code', 'line_user_id', 'status', 'days_left', 'mem_exp_dt', 'checked_dt'],
    NOTICE: ['notice_id', 'title', 'message', 'published_dt', 'sent_dt', 'status'],
    REMINDER_LOG: ['log_id', 'mem_code', 'loan_no', 'due_dt', 'days_left', 'status', 'reminded_dt'],
    CONTENT: ['content_key', 'content_text', 'updated_dt']
  };
  for (const key of Object.keys(expect)) {
    const actual = DataDict.getHeaders(key).join(',');
    if (actual !== expect[key].join(',')) {
      throw new Error('testSeedData: ' + key + ' คอลัมน์ไม่ตรงแบบ (' + actual + ')');
    }
  }

  Logger.log('testSeedData OK — 8 ตาราง + dummy rows ตรง DataDict');
  return true;
}

/**
 * ทดสอบว่าไม่มี placeholder คงเหลือ (การ์ด MT-14):
 * ข้อความใน ReplyStore (TAB_1–5 + WELCOME) + t_content dummy ต้องเป็นภาษาไทยจริง
 * (ไม่พบ 'ยังไม่มีข้อมูล' / 'XXX-' / 'กำลังดึง' / 'กำลังตรวจสอบ' / 'placeholder' / 'เริ่มขั้นตอน')
 * และ t_content ต้องครอบคลุมเมนูข้อมูล/เอกสาร/ติดต่อทุกเมนู
 * @returns {boolean}
 */
function testNoPlaceholders() {
  const patterns = ['ยังไม่มีข้อมูล', 'XXX-', 'กำลังดึง', 'กำลังตรวจสอบ', 'placeholder', 'เริ่มขั้นตอน'];
  const check = (text, where) => {
    for (const p of patterns) {
      if (text.includes(p)) throw new Error('testNoPlaceholders: ยังพบ placeholder "' + p + '" ใน ' + where);
    }
  };

  const stores = [
    ['TAB_1', LineBot.ReplyStore.TAB_1],
    ['TAB_2', LineBot.ReplyStore.TAB_2],
    ['TAB_3', LineBot.ReplyStore.TAB_3],
    ['TAB_4', LineBot.ReplyStore.TAB_4],
    ['TAB_5', LineBot.ReplyStore.TAB_5],
    ['WELCOME', LineBot.ReplyStore.WELCOME]
  ];
  for (const [name, store] of stores) {
    for (const key in store) check(store[key], name + '.' + key);
  }

  const content = SeedData.getDummyRows().CONTENT || [];
  if (content.length === 0) throw new Error('testNoPlaceholders: t_content ต้องมี dummy rows');
  for (const row of content) check(row[1] || '', 't_content.' + (row[0] || ''));

  // t_content ต้องครอบคลุมเมนูข้อมูล/เอกสาร/ติดต่อที่เคยเป็น placeholder
  const keys = content.map(r => r[0]);
  const required = ['welfare', 'emergency', 'about_coop', 'faq', 'contact_coop', 'contact_staff',
    'office_loc', 'manual', 'rules', 'annual_report', 'perf_report', 'news_pr', 'activities',
    'announce', 'loan_apply', 'chg_password', 'feedback', 'dl_forms', 'calc_install'];
  for (const k of required) {
    if (!keys.includes(k)) throw new Error('testNoPlaceholders: t_content ต้องมี key ' + k);
  }

  Logger.log('testNoPlaceholders OK — ไม่มี placeholder ใน ReplyStore/WELCOME/t_content (MT-14)');
  return true;
}

/**
 * ทดสอบเมนูข้อมูลตอบเนื้อหาจริง (การ์ด MT-14) ผ่าน EventHandler:
 * มี t_content → ตอบจากตาราง · ไม่มี t_content → fallback ข้อความจริงใน ReplyStore
 * (ไม่ใช่ flex "คุณเลือกเมนู..." placeholder)
 * @returns {boolean}
 */
function testContentReply() {
  // 1) seed fake sheets: สมาชิก active + t_content (มีแค่ welfare)
  delete __fakeSheets['t_member_mast'];
  __fakeSheets['t_member_mast'] = [
    DataDict.getHeaders('MEMBER_MASTER'),
    ['M001', 'นาย', 'สมชาย', 'ใจดี', 25, 'กรรมการ', 10, '2026-01-01', '2026-12-31', 'active', 'ACT001', 'U11111111111111111111111111111111', 'member', 85, 50000, 10000]
  ];
  delete __fakeSheets['t_content'];
  __fakeSheets['t_content'] = [
    DataDict.getHeaders('CONTENT'),
    ['welfare', '🎁 สวัสดิการ: ค่ารักษาพยาบาล 80% สูงสุด 30,000 บาท/ปี — แก้ไขได้ที่ชีท t_content', '2026-08-12 09:00:00']
  ];

  const replies = [];
  const origReply = LineBot.MessageService.reply;
  LineBot.MessageService.reply = function (replyToken, text) { replies.push(text); return { ok: true }; };
  const user = { source: { userId: 'U11111111111111111111111111111111' } };
  try {
    // welfare: มีใน t_content → ตอบเนื้อหาจากตาราง
    LineBot.EventHandler.handlePostback(
      { ...user, replyToken: 'RT1', postback: { data: 'action=menu_item&item=welfare' } }, 'TOKEN');
    // emergency: ไม่มีใน t_content → fallback ข้อความจริงใน ReplyStore (ไม่ใช่ flex placeholder)
    LineBot.EventHandler.handlePostback(
      { ...user, replyToken: 'RT2', postback: { data: 'action=menu_item&item=emergency' } }, 'TOKEN');
  } finally {
    LineBot.MessageService.reply = origReply;
  }

  if (!replies[0] || !replies[0].includes('ค่ารักษาพยาบาล 80%')) {
    throw new Error('testContentReply: welfare ต้องตอบเนื้อหาจาก t_content');
  }
  if (!replies[1]) throw new Error('testContentReply: emergency ต้องมีคำตอบ');
  if (replies[1].includes('คุณเลือกเมนู')) throw new Error('testContentReply: emergency ต้องไม่ตอบ flex placeholder');
  if (replies[1].includes('ยังไม่มีข้อมูล')) throw new Error('testContentReply: emergency ต้องเป็นข้อความจริง');
  if (!replies[1].includes('กองทุนฉุกเฉิน')) throw new Error('testContentReply: emergency ต้องมีเนื้อหาจริง');

  Logger.log('testContentReply OK — t_content ก่อน · fallback ReplyStore จริง · ไม่มี flex placeholder (MT-14)');
  return true;
}

/**
 * ทดสอบ Core.LoanRules (MT-13b) — pure:
 * getDueLoans (due_dt ∈ [now, now+days] · ไม่รวมเลยกำหนด/ไกลเกิน) · daysLeft ·
 * buildLoanReminderText (รายบุคคล) · isReminderTarget (active + มี userId)
 * @returns {boolean}
 */
function testLoanRules() {
  const now = new Date('2026-08-12T12:00:00');
  const loans = [
    { loan_no: 'L1', mem_code: 'M1', due_dt: '2026-08-10' },  // เลยกำหนดแล้ว → ไม่เตือน
    { loan_no: 'L2', mem_code: 'M1', due_dt: '2026-08-20' },  // อีก 8 วัน → เตือน
    { loan_no: 'L3', mem_code: 'M2', due_dt: '2026-08-12' },  // วันนี้ → เตือน
    { loan_no: 'L4', mem_code: 'M2', due_dt: '2026-09-30' },  // ไกลเกิน 14 วัน → ไม่เตือน
    { loan_no: 'L5', mem_code: 'M3', due_dt: '' }             // ไม่มี due → ไม่เตือน
  ];
  const due = Core.LoanRules.getDueLoans(loans, now, 14);
  if (due.length !== 2) throw new Error('testLoanRules: due ควร 2 (ได้ ' + due.length + ')');
  const byLoan = {};
  for (const d of due) byLoan[d.loan.loan_no] = d.daysLeft;
  if (byLoan['L2'] !== 8) throw new Error('testLoanRules: L2 daysLeft ควร 8');
  if (byLoan['L3'] !== 0) throw new Error('testLoanRules: L3 daysLeft ควร 0');
  if (due.some(d => d.loan.loan_no === 'L1' || d.loan.loan_no === 'L4' || d.loan.loan_no === 'L5')) {
    throw new Error('testLoanRules: L1/L4/L5 ไม่ควรถูกเตือน (เลยกำหนด/ไกลเกิน/ไม่มี due)');
  }

  const text = Core.LoanRules.buildLoanReminderText(
    { loan_no: 'LN-001', outstanding: 45000, due_dt: '2026-08-20' },
    { mem_title: 'นาย', mem_fname: 'สมชาย', mem_lname: 'ใจดี' }, 8);
  if (!text.includes('คุณนาย สมชาย ใจดี')) throw new Error('testLoanRules: ข้อความต้องมีชื่อสมาชิก');
  if (!text.includes('LN-001') || !text.includes('45,000.00') || !text.includes('2026-08-20')) {
    throw new Error('testLoanRules: ข้อความต้องมีเลขสัญญา/ยอดคงค้าง/วันครบกำหนด');
  }
  if (!text.includes('อีก 8 วัน')) throw new Error('testLoanRules: ข้อความต้องบอกวันเหลือ');

  if (!Core.LoanRules.isReminderTarget({ mem_status: 'active', line_user_id: 'U1' })) {
    throw new Error('testLoanRules: active + userId ต้องเป็น target');
  }
  if (Core.LoanRules.isReminderTarget({ mem_status: 'active', line_user_id: '' })) {
    throw new Error('testLoanRules: ไม่มี userId ไม่ควรเป็น target');
  }
  if (Core.LoanRules.isReminderTarget({ mem_status: 'inactive', line_user_id: 'U1' })) {
    throw new Error('testLoanRules: inactive ไม่ควรเป็น target');
  }

  Logger.log('testLoanRules OK — due filter + daysLeft + ข้อความรายบุคคล + target (pure)');
  return true;
}

/**
 * ทดสอบ LineBot.LoanReminderService.runLoanReminders (MT-13b) — Fake Sheets + fake sender:
 * เตือนเฉพาะสัญญาที่ถึงรอบ · ข้อความรายบุคคล · ข้าม/บันทึก skipped เมื่อไม่มี userId ·
 * audit trail t_reminder_log (reminded/skipped)
 * @returns {boolean}
 */
function testLoanReminders() {
  // 1) seed fake sheets: t_member_mast + t_loan_acct
  delete __fakeSheets['t_member_mast'];
  __fakeSheets['t_member_mast'] = [
    DataDict.getHeaders('MEMBER_MASTER'),
    ['M001', 'นาย', 'สมชาย', 'ใจดี', 25, 'กรรมการ', 10, '2026-01-01', '2026-12-31', 'active', 'ACT001', 'U11111111111111111111111111111111', 'member', 85, 50000, 10000],
    ['M002', 'นาง', 'สมหญิง', 'รักดี', 20, '', 5, '2026-01-01', '2026-12-31', 'active', 'ACT002', '', 'member', 80, 8000, 5000],
    ['M003', 'นาย', 'ทดสอบ', 'ระบบ', 15, '', 3, '2026-01-01', '2026-12-31', 'inactive', 'ACT003', 'U33333333333333333333333333333333', 'member', 70, 0, 2000]
  ];
  delete __fakeSheets['t_loan_acct'];
  __fakeSheets['t_loan_acct'] = [
    DataDict.getHeaders('LOAN_ACCT'),
    ['M001', 'LN-001', 100000, 45000, '2026-08-20'],   // ถึงรอบ (8 วัน) — active + userId → reminded
    ['M001', 'LN-002', 50000, 10000, '2026-12-31'],    // ไกลเกิน → ไม่เตือน
    ['M002', 'LN-003', 30000, 12000, '2026-08-25'],    // ถึงรอบ (13 วัน) — ไม่มี userId → skipped
    ['M003', 'LN-004', 20000, 5000, '2026-08-01']      // เลยกำหนด → ไม่เตือน
  ];

  const sent = [];
  const summary = LineBot.LoanReminderService.runLoanReminders('TOKEN', {
    now: new Date('2026-08-12T12:00:00'),
    reminderDays: 14,
    sender: (to, text) => { sent.push({ to, text }); return { ok: true }; }
  });

  if (summary.loans !== 4) throw new Error('testLoanReminders: loans ควร 4 (' + summary.loans + ')');
  if (summary.due !== 2) throw new Error('testLoanReminders: due ควร 2 (' + summary.due + ')');
  if (summary.reminded !== 1) throw new Error('testLoanReminders: reminded ควร 1');
  if (summary.skipped !== 1) throw new Error('testLoanReminders: skipped ควร 1');
  if (summary.pushed !== 1) throw new Error('testLoanReminders: pushed ควร 1 (' + summary.pushed + ')');

  // เตือนเฉพาะ LN-001 (M001) — ข้อความรายบุคคล
  if (sent.length !== 1) throw new Error('testLoanReminders: ควร push 1 ครั้ง');
  if (sent[0].to !== 'U11111111111111111111111111111111') throw new Error('testLoanReminders: ต้อง push ถึง M001');
  if (!sent[0].text.includes('LN-001') || !sent[0].text.includes('คุณนาย สมชาย ใจดี') || !sent[0].text.includes('อีก 8 วัน')) {
    throw new Error('testLoanReminders: ข้อความต้องเป็นรายบุคคล (ชื่อ + สัญญา + วันเหลือ)');
  }

  // audit trail: reminded (M001/LN-001) + skipped (M002/LN-003)
  const logs = __fakeSheets['t_reminder_log'] || [];
  const logRows = logs.length > 0 ? logs.slice(1) : [];
  if (logRows.length !== 2) throw new Error('testLoanReminders: t_reminder_log ควรมี 2 แถว (ได้ ' + logRows.length + ')');
  const byLoan = {};
  for (const r of logRows) byLoan[r[2]] = r;
  if (!byLoan['LN-001'] || byLoan['LN-001'][5] !== 'reminded' || byLoan['LN-001'][4] !== 8) {
    throw new Error('testLoanReminders: log LN-001 ควรเป็น reminded 8 วัน');
  }
  if (!byLoan['LN-003'] || byLoan['LN-003'][5] !== 'skipped') {
    throw new Error('testLoanReminders: log LN-003 ควรเป็น skipped (M002 ไม่มี userId)');
  }

  Logger.log('testLoanReminders OK — เตือนรายบุคคล + skipped + audit log (Fake Sheets + fake sender)');
  return true;
}

/**
 * ทดสอบข้อมูลทดสอบ t_member_mast (dev/test — createDummyMemberMaster):
 * 16 คอลัมน์ตรง DataDict · activate codes ไม่ซ้ำ · FK ตรงตารางการเงิน · สถานะ/บทบาทถูกต้อง
 * @returns {boolean}
 */
function testDummyMemberMaster() {
  const rows = SeedData.getDummyMemberRows();
  const headers = DataDict.getHeaders('MEMBER_MASTER');
  if (headers.length !== 16) throw new Error('testDummyMemberMaster: t_member_mast ต้องมี 16 คอลัมน์ (ได้ ' + headers.length + ')');
  if (rows.length < 4) throw new Error('testDummyMemberMaster: ต้องมีสมาชิกทดสอบอย่างน้อย 4 คน');

  const memCodes = [];
  const activateCodes = [];
  for (const row of rows) {
    if (row.length !== 16) {
      throw new Error('testDummyMemberMaster: แถวมี ' + row.length + ' ค่า แต่ DataDict กำหนด 16');
    }
    const obj = DataDict.rowToObject('MEMBER_MASTER', row);
    memCodes.push(obj.mem_code);
    if (obj.activate_code) activateCodes.push(obj.activate_code);
    if (!/^(member|staff|admin)$/.test(obj.mem_role)) {
      throw new Error('testDummyMemberMaster: mem_role ต้องเป็น member/staff/admin');
    }
    if (!/^(active|inactive)$/.test(obj.mem_status)) {
      throw new Error('testDummyMemberMaster: mem_status ต้องเป็น active/inactive');
    }
  }

  // activate codes ต้องไม่ซ้ำกัน
  if (new Set(activateCodes).size !== activateCodes.length) {
    throw new Error('testDummyMemberMaster: activate_code ต้องไม่ซ้ำ');
  }

  // สมาชิกทดสอบหลัก (MEM001–003) ต้องมีข้อมูลในตารางการเงิน (FK ใช้งานได้จริง)
  const financeCodes = new Set();
  for (const key of ['SAVINGS_ACCT', 'LOAN_ACCT', 'DIVIDEND']) {
    for (const row of SeedData.getDummyRows()[key]) {
      financeCodes.add(String(row[0]));
    }
  }
  for (const c of ['MEM001', 'MEM002', 'MEM003']) {
    if (!memCodes.includes(c)) throw new Error('testDummyMemberMaster: ต้องมี ' + c);
    if (!financeCodes.has(c)) throw new Error('testDummyMemberMaster: ' + c + ' ต้องมีข้อมูลในตารางการเงิน');
  }

  // MEM001–003 ยังไม่ activate (mem_eff_dt ว่าง) → ผู้ทดสอบ activate เองได้
  const m1 = DataDict.rowToObject('MEMBER_MASTER', rows[0]);
  if (m1.mem_status !== 'inactive' || m1.mem_eff_dt) {
    throw new Error('testDummyMemberMaster: MEM001 ควรยังไม่ activate (ทดสอบ activate:ACT001 ได้)');
  }

  Logger.log('testDummyMemberMaster OK — 16 คอลัมน์ · activate codes ไม่ซ้ำ · FK ตรงการเงิน · พร้อมทดสอบ use case');
  return true;
}

/**
 * ทดสอบ Core.NoticeRules (MT-13) — pure:
 * getPendingNotices (published + ยังไม่ส่ง + ถึงเวลา) · buildNoticeText · getBroadcastTargets
 * @returns {boolean}
 */
function testNoticeRules() {
  const now = new Date('2026-08-06T12:00:00');
  const notices = [
    { notice_id: 'N1', title: 'ส่งแล้ว', message: 'x', published_dt: '2026-08-01 09:00:00', sent_dt: '2026-08-01 09:05:00', status: 'published' },
    { notice_id: 'N2', title: 'พร้อมส่ง', message: 'ยินดีต้อนรับสมาชิกใหม่', published_dt: '2026-08-06 09:00:00', sent_dt: '', status: 'published' },
    { notice_id: 'N3', title: 'ร่าง', message: 'y', published_dt: '2026-08-10 09:00:00', sent_dt: '', status: 'draft' },
    { notice_id: 'N4', title: 'ยังไม่ถึงเวลา', message: 'z', published_dt: '2026-08-07 09:00:00', sent_dt: '', status: 'published' }
  ];
  const pending = Core.NoticeRules.getPendingNotices(notices, now);
  if (pending.length !== 1) throw new Error('testNoticeRules: pending ควร 1 (ได้ ' + pending.length + ')');
  if (pending[0].notice_id !== 'N2') throw new Error('testNoticeRules: ควรเหลือ N2 เท่านั้น');

  const text = Core.NoticeRules.buildNoticeText({ title: 'ประชุม', message: 'เวลา 9 โมง', published_dt: '2026-08-06 09:00:00' });
  if (!text.includes('📢 ประกาศสหกรณ์')) throw new Error('testNoticeRules: ข้อความต้องมีหัวประกาศ');
  if (!text.includes('ประชุม') || !text.includes('เวลา 9 โมง')) throw new Error('testNoticeRules: ข้อความต้องมี title + message');
  if (!text.includes('2026-08-06 09:00:00')) throw new Error('testNoticeRules: ข้อความต้องมี published_dt');

  const members = [
    { mem_code: 'M1', mem_status: 'active', line_user_id: 'U1' },
    { mem_code: 'M2', mem_status: 'active', line_user_id: '' },
    { mem_code: 'M3', mem_status: 'inactive', line_user_id: 'U3' },
    { mem_code: 'M4', mem_status: 'active', line_user_id: 'U4' }
  ];
  const targets = Core.NoticeRules.getBroadcastTargets(members);
  if (targets.length !== 2) throw new Error('testNoticeRules: targets ควร 2 (ได้ ' + targets.length + ')');
  if (!targets.some(t => t.mem_code === 'M1') || !targets.some(t => t.mem_code === 'M4')) {
    throw new Error('testNoticeRules: targets ต้องเป็น active + มี userId เท่านั้น');
  }

  Logger.log('testNoticeRules OK — pending filter + ข้อความ + กลุ่มเป้าหมาย (pure)');
  return true;
}

/**
 * ทดสอบ LineBot.NoticeService.runNoticeBroadcast (MT-13) — Fake Sheets + fake sender:
 * broadcast ประกาศที่พร้อมส่งถึงสมาชิก active ทุกคน · mark sent กันส่งซ้ำ ·
 * ข้ามประกาศที่ส่งแล้ว / draft / ยังไม่ถึงเวลา · ข้าม inactive/ไม่มี userId
 * @returns {boolean}
 */
function testNoticeBroadcast() {
  // 1) seed fake sheets: t_member_mast (3 active + 1 inactive) + t_notice (dummy 6 คอลัมน์)
  delete __fakeSheets['t_member_mast'];
  __fakeSheets['t_member_mast'] = [
    DataDict.getHeaders('MEMBER_MASTER'),
    ['M001', 'นาย', 'สมชาย', 'ใจดี', 25, 'กรรมการ', 10, '2026-01-01', '2026-12-31', 'active', 'ACT001', 'U11111111111111111111111111111111', 'member', 85, 50000, 10000],
    ['M002', 'นาง', 'สมหญิง', 'รักดี', 20, '', 5, '2026-01-01', '2026-12-31', 'active', 'ACT002', 'U22222222222222222222222222222222', 'member', 80, 8000, 5000],
    ['M003', 'นาย', 'ทดสอบ', 'ระบบ', 15, '', 3, '2026-01-01', '2026-12-31', 'active', 'ACT003', 'U33333333333333333333333333333333', 'member', 70, 0, 2000],
    ['M004', 'นาย', 'ยังไม่', 'Activate', 0, '', 0, '', '', 'inactive', 'ACT004', '', 'member', 0, 0, 0]
  ];
  delete __fakeSheets['t_notice'];
  __fakeSheets['t_notice'] = [
    DataDict.getHeaders('NOTICE'),
    ['NTC-0001', 'ประกาศปิดทำการ', 'ปิดวันที่ 12 ส.ค. 2569', '2026-08-01 09:00:00', '2026-08-01 09:00:05', 'published'],
    ['NTC-0002', 'ประชุมใหญ่สามัญ', 'ประชุมวันที่ 20 ส.ค. 2569 เวลา 09:00 น.', '2026-08-06 09:00:00', '', 'published'],
    ['NTC-0003', 'แบบร่างประกาศ', 'ยังไม่เผยแพร่', '2026-08-10 09:00:00', '', 'draft']
  ];

  const sent = [];
  const summary = LineBot.NoticeService.runNoticeBroadcast('TOKEN', {
    now: new Date('2026-08-06T12:00:00'),
    sender: (to, text) => { sent.push({ to, text }); return { ok: true }; }
  });

  if (summary.notices !== 3) throw new Error('testNoticeBroadcast: notices ควร 3 (' + summary.notices + ')');
  if (summary.pending !== 1) throw new Error('testNoticeBroadcast: pending ควร 1 (' + summary.pending + ')');
  if (summary.sent !== 1) throw new Error('testNoticeBroadcast: sent ควร 1 (' + summary.sent + ')');
  if (summary.targets !== 3) throw new Error('testNoticeBroadcast: targets ควร 3 (' + summary.targets + ')');
  if (summary.pushed !== 3) throw new Error('testNoticeBroadcast: pushed ควร 3 (' + summary.pushed + ')');

  // ทุก active member ได้รับประกาศ NTC-0002 (มีหัวข้อ) · inactive ไม่ได้รับ
  if (!sent.every(s => s.text.includes('ประชุมใหญ่สามัญ'))) throw new Error('testNoticeBroadcast: ข้อความต้องเป็น NTC-0002');
  if (!sent.some(s => s.to === 'U11111111111111111111111111111111')) throw new Error('testNoticeBroadcast: M001 ไม่ได้รับประกาศ');
  if (!sent.some(s => s.to === 'U22222222222222222222222222222222')) throw new Error('testNoticeBroadcast: M002 ไม่ได้รับประกาศ');
  if (!sent.some(s => s.to === 'U33333333333333333333333333333333')) throw new Error('testNoticeBroadcast: M003 ไม่ได้รับประกาศ');
  if (sent.some(s => s.to === 'U44444444444444444444444444444444')) throw new Error('testNoticeBroadcast: inactive ไม่ควรได้รับประกาศ');

  // NTC-0002 ถูก mark sent แล้ว (sent_dt + status='sent')
  const noticeRows = __fakeSheets['t_notice'] || [];
  const ntc2 = noticeRows.find(r => r[0] === 'NTC-0002');
  if (!ntc2 || !ntc2[4] || ntc2[5] !== 'sent') {
    throw new Error('testNoticeBroadcast: NTC-0002 ต้องถูก mark sent (sent_dt + status=sent)');
  }

  // 2) รันรอบที่ 2 — ไม่ส่งซ้ำ (pending = 0, pushed = 0)
  const sent2 = [];
  const summary2 = LineBot.NoticeService.runNoticeBroadcast('TOKEN', {
    now: new Date('2026-08-06T13:00:00'),
    sender: (to, text) => { sent2.push({ to, text }); return { ok: true }; }
  });
  if (summary2.pending !== 0) throw new Error('testNoticeBroadcast: รอบ 2 pending ควร 0 (กันส่งซ้ำ)');
  if (summary2.pushed !== 0) throw new Error('testNoticeBroadcast: รอบ 2 pushed ควร 0');

  Logger.log('testNoticeBroadcast OK — broadcast + mark sent + ไม่ส่งซ้ำ (Fake Sheets + fake sender)');
  return true;
}

/**
 * ทดสอบ Data Layer การเงิน (MT-27) — ผ่าน Fake SpreadsheetApp (ใน CI harness):
 * seed ด้วย path จริง (SheetService.getSheet) → repository อ่าน →
 * buildFinanceText จัดรูปแบบข้อมูลจริง (ไม่มีตัวเลขปลอม)
 * @returns {boolean}
 */
function testFinanceData() {
  // 1) ล้าง fake sheets ของตารางการเงิน แล้ว seed ด้วย path จริง
  delete __fakeSheets['t_savings_acct'];
  delete __fakeSheets['t_loan_acct'];
  delete __fakeSheets['t_dividend'];

  const rowsByTable = SeedData.getDummyRows();
  for (const key of ['SAVINGS_ACCT', 'LOAN_ACCT', 'DIVIDEND']) {
    const sheet = LineBot.SheetService.getSheet(key);
    for (const row of rowsByTable[key]) {
      sheet.appendRow(row);
    }
  }

  // 2) repository อ่านข้อมูลจริง (Data Layer เต็ม path)
  const repo = Data.MemberRepository.getRepository();
  const savings = repo.findSavingsByMember('MEM001');
  if (savings.length !== 2) throw new Error('testFinanceData: MEM001 ควรมี 2 บัญชี (ได้ ' + savings.length + ')');
  const loans = repo.findLoansByMember('MEM001');
  if (loans.length !== 1) throw new Error('testFinanceData: MEM001 ควรมี 1 สัญญา (ได้ ' + loans.length + ')');
  const dividends = repo.findDividendsByMember('MEM001');
  if (dividends.length !== 2) throw new Error('testFinanceData: MEM001 ควรมีปันผล 2 ปี (ได้ ' + dividends.length + ')');
  if (repo.findSavingsByMember('MEM999').length !== 0) throw new Error('testFinanceData: MEM999 ไม่ควรมีข้อมูล');

  // 3) buildFinanceText จัดรูปแบบข้อมูลจริง
  const S = LineBot.MemberDataService;
  const member = { mem_code: 'MEM001' };
  const fd = { savings: savings, loans: loans, dividends: dividends };

  const savingText = S.buildFinanceText('saving_acct', member, fd);
  if (!savingText.includes('25,000.00 บาท')) throw new Error('testFinanceData: saving ไม่มียอด 25,000.00');
  if (!savingText.includes('รวมเงินฝาก: 125,000.00 บาท')) throw new Error('testFinanceData: รวมเงินฝากผิด');

  const loanText = S.buildFinanceText('loan_balance', member, fd);
  if (!loanText.includes('45,000.00 บาท')) throw new Error('testFinanceData: loan ไม่มียอด 45,000.00');

  const divText = S.buildFinanceText('dividends', member, fd);
  if (!divText.includes('ปันผล 1,250.00 บาท')) throw new Error('testFinanceData: dividends ผิด');

  const shareText = S.buildFinanceText('share_capital', member, fd);
  if (!shareText.includes('10,000.00 บาท')) throw new Error('testFinanceData: share_capital ผิด');

  // ไม่มีข้อมูล → ตอบสถานะจริง ไม่มีตัวเลขปลอม
  const emptyText = S.buildFinanceText('loan_balance', { mem_code: 'MEM003' }, { savings: [], loans: [], dividends: [] });
  if (!emptyText.includes('ไม่พบข้อมูลยอดหนี้')) throw new Error('testFinanceData: no-data ควรแจ้งไม่พบข้อมูล');

  // formatMoney
  if (S.formatMoney(25000) !== '25,000.00') throw new Error('testFinanceData: formatMoney(25000) ผิด');

  Logger.log('testFinanceData OK — seed → repository → buildFinanceText (ข้อมูลจริง)');
  return true;
}

/**
 * ทดสอบการสลับตำแหน่งฟิลด์ในตาราง (Header-driven — ข้อกำหนดของระบบ):
 * สลับคอลัมน์ t_member_mast / t_savings_acct ให้ต่างจาก DataDict order
 * แล้วยืนยันว่าอ่าน (findByLineUserId / findAllByColumn) และเขียน (activateMember) ยังถูกต้อง
 * @returns {boolean}
 */
function testColumnReordering() {
  // 1) สร้างชีท t_member_mast ที่สลับตำแหน่งคอลัมน์ (line_user_id อยู่วิปแรก, mem_code อยู่ที่ 3)
  delete __fakeSheets['t_member_mast'];
  __fakeSheets['t_member_mast'] = [
    ['line_user_id', 'mem_status', 'mem_code', 'mem_fname', 'mem_lname', 'activate_code',
     'mem_title', 'mem_rank_score', 'mem_position', 'mem_position_score',
     'mem_eff_dt', 'mem_exp_dt', 'mem_role', 'mem_kk', 'mem_bk', 'mem_bh'],
    ['U11111111111111111111111111111111', 'active', 'M001', 'สมชาย', 'ใจดี', 'ACT001',
     'นาย', 25, 'กรรมการ', 10, '2026-08-06', '2027-08-06', 'member', 85, 50000, 10000]
  ];

  const repo = Data.MemberRepository.getRepository();

  // 2) findByLineUserId ยังคืนข้อมูลถูกต้องแม้สลับตำแหน่ง
  const m = repo.findByLineUserId('U11111111111111111111111111111111');
  if (!m) throw new Error('testColumnReordering: findByLineUserId ไม่พบสมาชิก');
  if (m.mem_code !== 'M001') throw new Error('testColumnReordering: mem_code ผิด (' + m.mem_code + ')');
  if (m.mem_fname !== 'สมชาย') throw new Error('testColumnReordering: mem_fname ผิด');
  if (m.mem_status !== 'active') throw new Error('testColumnReordering: mem_status ผิด');
  if (m.mem_kk !== 85) throw new Error('testColumnReordering: mem_kk ผิด (' + m.mem_kk + ')');
  if (m._rowIndex !== 2) throw new Error('testColumnReordering: _rowIndex ผิด');

  // 3) findByActivateCode ยังทำงาน
  const a = repo.findByActivateCode('ACT001');
  if (!a || a.mem_code !== 'M001') throw new Error('testColumnReordering: findByActivateCode ผิด');

  // 4) activateMember เขียนถูกคอลัมน์ (line_user_id = คอลัมน์ 1, mem_status = คอลัมน์ 2 ใน layout ใหม่)
  repo.activateMember(2, 'U99999999999999999999999999999999');
  const row = __fakeSheets['t_member_mast'][1];
  if (row[0] !== 'U99999999999999999999999999999999') throw new Error('testColumnReordering: line_user_id เขียนผิดคอลัมน์');
  if (row[1] !== 'active') throw new Error('testColumnReordering: mem_status เขียนผิดคอลัมน์');
  if (typeof row[10] !== 'string' || row[10].length < 10) throw new Error('testColumnReordering: mem_eff_dt ไม่ถูกเขียน');
  if (row[4] !== 'ใจดี') throw new Error('testColumnReordering: ข้อมูลอื่นเสียหายจากการเขียน');

  // 5) ตารางการเงินสลับคอลัมน์ — findAllByColumn ยังอ่านถูกต้อง
  delete __fakeSheets['t_savings_acct'];
  __fakeSheets['t_savings_acct'] = [
    ['balance', 'acct_no', 'mem_code', 'acct_type', 'updated_dt'],
    [25000, 'SAV-0001', 'MEM001', 'ออมทรัพย์', '2026-08-01'],
    [100000, 'SAV-0011', 'MEM001', 'ออมทรัพย์พิเศษ', '2026-08-01']
  ];
  const savings = repo.findSavingsByMember('MEM001');
  if (savings.length !== 2) throw new Error('testColumnReordering: findSavings ผิด');
  if (savings[0].acct_no !== 'SAV-0001' || savings[0].balance !== 25000) {
    throw new Error('testColumnReordering: สลับคอลัมน์แล้วอ่านยอดผิด');
  }

  Logger.log('testColumnReordering OK — สลับตำแหน่งคอลัมน์แล้วอ่าน/เขียนยังถูกต้อง (Header-driven)');
  return true;
}

/**
 * ทดสอบตัวตรวจรูปแบบวันที่ (มาตรฐาน: yyyy-mm-dd / yyyy-mm-dd HH:mm:ss):
 * ปฏิเสธ dd-mm-yyyy · T/Z · mixed · ยอมรับค่าว่าง/Date object · objectToRow throw พร้อมชื่อคอลัมน์
 * @returns {boolean}
 */
function testDateValidator() {
  const D = DataDict;
  const ok = D.isValidDateString;

  // valid ตามมาตรฐาน
  if (!ok('2026-08-06', 'date')) throw new Error('testDateValidator: yyyy-mm-dd ควรผ่าน');
  if (!ok('2026-08-06 14:30:00', 'datetime')) throw new Error('testDateValidator: yyyy-mm-dd HH:mm:ss ควรผ่าน');

  // ปฏิเสธ dd-mm-yyyy
  if (ok('06-08-2026', 'date')) throw new Error('testDateValidator: dd-mm-yyyy ต้องถูกปฏิเสธ');
  if (ok('06/08/2026', 'date')) throw new Error('testDateValidator: mm/dd/yyyy ต้องถูกปฏิเสธ');

  // ปฏิเสธ T / Z formats
  if (ok('2026-08-06T14:30:00', 'datetime')) throw new Error('testDateValidator: T format ต้องถูกปฏิเสธ');
  if (ok('2026-08-06T14:30:00Z', 'datetime')) throw new Error('testDateValidator: Z format ต้องถูกปฏิเสธ');

  // ปฏิเสธ mixed (มีเวลาในคอลัมน์ date / ไม่มีเวลาในคอลัมน์ datetime)
  if (ok('2026-08-06 14:30:00', 'date')) throw new Error('testDateValidator: datetime ในคอลัมน์ date ต้องถูกปฏิเสธ');
  if (ok('2026-08-06', 'datetime')) throw new Error('testDateValidator: date ในคอลัมน์ datetime ต้องถูกปฏิเสธ');

  // ค่าว่าง / null / Date object ผ่าน
  if (!ok('', 'date')) throw new Error('testDateValidator: ค่าว่างควรผ่าน');
  if (!ok(null, 'date')) throw new Error('testDateValidator: null ควรผ่าน');
  if (!ok(new Date(2026, 7, 6), 'datetime')) throw new Error('testDateValidator: Date object ควรผ่าน');

  // objectToRow: วันที่ผิด → throw พร้อมชื่อคอลัมน์
  let threw = false;
  try {
    D.objectToRow('MEMBER_MASTER', { mem_code: 'M001', mem_eff_dt: '06-08-2026' });
  } catch (e) {
    threw = true;
    if (!String(e.message).includes('mem_eff_dt')) throw new Error('testDateValidator: error ต้องระบุชื่อคอลัมน์');
  }
  if (!threw) throw new Error('testDateValidator: objectToRow ควร throw เมื่อวันที่ผิดรูปแบบ');

  // objectToRowByHeaders: ตรวจเหมือนกัน
  threw = false;
  try {
    D.objectToRowByHeaders('MEMBER_MASTER', ['mem_code', 'mem_exp_dt'], { mem_code: 'M001', mem_exp_dt: '2026-08-06T00:00:00Z' });
  } catch (e) {
    threw = true;
  }
  if (!threw) throw new Error('testDateValidator: objectToRowByHeaders ควร throw เมื่อวันที่ผิดรูปแบบ');

  // Date object ถูกแปลงเป็น yyyy-mm-dd ผ่าน
  const row = D.objectToRow('MEMBER_MASTER', { mem_code: 'M001', mem_eff_dt: new Date(2026, 7, 6) });
  if (row[7] !== '2026-08-06') throw new Error('testDateValidator: Date object ควรแปลงเป็น yyyy-mm-dd');

  Logger.log('testDateValidator OK — ปฏิเสธ dd-mm-yyyy / T / Z / mixed · ยอมรับ yyyy-mm-dd');
  return true;
}

/**
 * ทดสอบ Core.DateConverter (เฟส 3 — แปลงวันที่ชีท <-> Firestore TIMESTAMP):
 * round-trip ตรงกันเป๊ะ · รองรับ Date / {seconds,nanos} / RFC3339 · ปฏิเสธรูปแบบผิด
 * @returns {boolean}
 */
function testDateConverter() {
  const C = Core.DateConverter;

  // 1) string → Firestore REST Timestamp { seconds, nanos }
  const tsDate = C.toFirestoreTimestamp('2026-08-06', 'date');
  if (tsDate.seconds !== Math.floor(Date.UTC(2026, 7, 6) / 1000)) {
    throw new Error('testDateConverter: toFirestoreTimestamp(date) seconds ผิด');
  }
  if (tsDate.nanos !== 0) throw new Error('testDateConverter: nanos ควรเป็น 0 (วินาทีเต็ม)');

  const tsDt = C.toFirestoreTimestamp('2026-08-06 14:30:00', 'datetime');
  if (tsDt.seconds !== Math.floor(Date.UTC(2026, 7, 6, 14, 30, 0) / 1000)) {
    throw new Error('testDateConverter: toFirestoreTimestamp(datetime) seconds ผิด');
  }

  // 2) round-trip: string → timestamp → string ตรงกันเป๊ะ
  if (C.fromFirestoreTimestamp(tsDate, 'date') !== '2026-08-06') {
    throw new Error('testDateConverter: round-trip date ผิด');
  }
  if (C.fromFirestoreTimestamp(tsDt, 'datetime') !== '2026-08-06 14:30:00') {
    throw new Error('testDateConverter: round-trip datetime ผิด');
  }

  // 3) รับ Date object เข้า → ได้ seconds ถูกต้อง
  const tsFromDate = C.toFirestoreTimestamp(new Date(Date.UTC(2026, 7, 6, 14, 30, 0)), 'datetime');
  if (tsFromDate.seconds !== tsDt.seconds) throw new Error('testDateConverter: Date object input ผิด');

  // 4) รับ { seconds, nanos } เข้า (REST Timestamp)
  if (C.fromFirestoreTimestamp({ seconds: tsDt.seconds, nanos: 0 }, 'datetime') !== '2026-08-06 14:30:00') {
    throw new Error('testDateConverter: {seconds,nanos} input ผิด');
  }

  // 5) รับ RFC3339 string เข้า (Firestore export/query)
  if (C.fromFirestoreTimestamp('2026-08-06T14:30:00Z', 'datetime') !== '2026-08-06 14:30:00') {
    throw new Error('testDateConverter: RFC3339 input ผิด');
  }

  // 6) ปฏิเสธรูปแบบผิด
  let threw = false;
  try { C.toFirestoreTimestamp('06-08-2026', 'date'); } catch (e) { threw = true; }
  if (!threw) throw new Error('testDateConverter: dd-mm-yyyy ต้อง throw');
  threw = false;
  try { C.toFirestoreTimestamp('2026-08-06T14:30:00Z', 'datetime'); } catch (e) { threw = true; }
  if (!threw) throw new Error('testDateConverter: T/Z format ต้อง throw');
  threw = false;
  try { C.fromFirestoreTimestamp('not-a-date', 'date'); } catch (e) { threw = true; }
  if (!threw) throw new Error('testDateConverter: timestamp ผิดต้อง throw');

  // 7) วันที่ข้ามปี (round-trip ขอบเขต)
  const tsEdge = C.toFirestoreTimestamp('2026-12-31 23:59:59', 'datetime');
  if (C.fromFirestoreTimestamp(tsEdge, 'datetime') !== '2026-12-31 23:59:59') {
    throw new Error('testDateConverter: round-trip ขอบเขตปีผิด');
  }

  Logger.log('testDateConverter OK — แปลงชีท <-> Firestore TIMESTAMP (round-trip ตรงเป๊ะ)');
  return true;
}

/**
 * ทดสอบ Core.MemberRules.getExpiryStatus (MT-11 — pure, deterministic now):
 * valid / expiring (ภายใน warningDays) / expired + daysLeft ถูกต้อง
 * @returns {boolean}
 */
function testExpiryStatus() {
  const R = Core.MemberRules;
  const now = new Date('2026-08-06T12:00:00');
  const base = { mem_code: 'M001' };

  const valid = R.getExpiryStatus({ ...base, mem_exp_dt: '2026-12-31' }, now, 30);
  if (valid.status !== 'valid') throw new Error('testExpiryStatus: 2026-12-31 ควร valid');
  if (valid.daysLeft !== 147) throw new Error('testExpiryStatus: daysLeft valid ผิด (' + valid.daysLeft + ')');

  const expiring = R.getExpiryStatus({ ...base, mem_exp_dt: '2026-08-20' }, now, 30);
  if (expiring.status !== 'expiring') throw new Error('testExpiryStatus: 2026-08-20 ควร expiring');
  if (expiring.daysLeft !== 14) throw new Error('testExpiryStatus: daysLeft expiring ผิด (' + expiring.daysLeft + ')');

  const boundary = R.getExpiryStatus({ ...base, mem_exp_dt: '2026-09-05' }, now, 30);
  if (boundary.status !== 'expiring') throw new Error('testExpiryStatus: ขอบเขต 30 วันพอดี ควร expiring');

  const expired = R.getExpiryStatus({ ...base, mem_exp_dt: '2026-08-01' }, now, 30);
  if (expired.status !== 'expired') throw new Error('testExpiryStatus: 2026-08-01 ควร expired');
  if (expired.daysLeft !== -5) throw new Error('testExpiryStatus: daysLeft expired ผิด (' + expired.daysLeft + ')');

  if (R.getExpiryStatus({ ...base, mem_exp_dt: '' }, now, 30).status !== 'valid') {
    throw new Error('testExpiryStatus: ไม่มี mem_exp_dt ควร valid (fail-safe)');
  }
  if (R.getExpiryStatus(null, now, 30).status !== 'valid') {
    throw new Error('testExpiryStatus: null ควร valid');
  }

  // ข้อความเตือน (MemberDataService)
  const S = LineBot.MemberDataService;
  const warn = S.buildExpiryWarning({ ...base, mem_title: 'นาย', mem_fname: 'สมชาย', mem_lname: 'ใจดี', mem_exp_dt: '2026-08-20' }, expiring);
  if (!warn.includes('14 วัน')) throw new Error('testExpiryStatus: คำเตือนไม่บอกจำนวนวัน');
  if (!warn.includes('สมชาย')) throw new Error('testExpiryStatus: คำเตือนไม่มีชื่อ');
  if (S.buildExpiryWarning(base, { status: 'valid', daysLeft: 147 }) !== '') {
    throw new Error('testExpiryStatus: valid ไม่ควรมีคำเตือน');
  }
  const appended = S.appendExpiryWarning('ข้อความเดิม', base, expiring);
  if (!appended.startsWith('ข้อความเดิม')) throw new Error('testExpiryStatus: append ต้องไม่ทิ้งข้อความเดิม');
  if (S.appendExpiryWarning('x', base, { status: 'valid', daysLeft: 147 }) !== 'x') {
    throw new Error('testExpiryStatus: append valid ต้องไม่เพิ่มอะไร');
  }

  Logger.log('testExpiryStatus OK — valid/expiring/expired + daysLeft + คำเตือน (deterministic)');
  return true;
}

/**
 * ทดสอบ LineBot.ExpiryService.runExpiryCheck (MT-11) — ผ่าน Fake SpreadsheetApp + fake sender:
 * scan สมาชิก → push expiring/expired ถูกต้อง · unlink เฉพาะ expired · ข้าม inactive/ไม่มี userId
 * @returns {boolean}
 */
function testExpiryService() {
  // 1) seed t_member_mast ใน fake sheets (header + 4 แถว: expiring / expired / valid / inactive)
  delete __fakeSheets['t_member_mast'];
  __fakeSheets['t_member_mast'] = [
    DataDict.getHeaders('MEMBER_MASTER'),
    ['M001', 'นาย', 'สมชาย', 'ใจดี', 25, 'กรรมการ', 10, '2026-01-01', '2026-08-20', 'active', 'ACT001', 'U11111111111111111111111111111111', 'member', 85, 50000, 10000],
    ['M002', 'นาง', 'สมหญิง', 'รักดี', 20, '', 5, '2026-01-01', '2026-08-01', 'active', 'ACT002', 'U22222222222222222222222222222222', 'member', 80, 8000, 5000],
    ['M003', 'นาย', 'ทดสอบ', 'ระบบ', 15, '', 3, '2026-01-01', '2026-12-31', 'active', 'ACT003', 'U33333333333333333333333333333333', 'member', 70, 0, 2000],
    ['M004', 'นาย', 'ยังไม่', 'Activate', 0, '', 0, '', '', 'inactive', 'ACT004', '', 'member', 0, 0, 0]
  ];

  const sent = [];
  const unlinked = [];
  const summary = LineBot.ExpiryService.runExpiryCheck('TOKEN', {
    now: new Date('2026-08-06T12:00:00'),
    warningDays: 30,
    sender: (to, text) => { sent.push({ to, text }); return { ok: true }; },
    unlinker: (lineUserId) => { unlinked.push(lineUserId); return { ok: true }; }
  });

  if (summary.checked !== 4) throw new Error('testExpiryService: checked ควร 4 (' + summary.checked + ')');
  if (summary.logged !== 3) throw new Error('testExpiryService: logged ควร 3 (ทุก active+userId ที่ถูกตรวจ)');
  if (summary.expiring !== 1) throw new Error('testExpiryService: expiring ควร 1');
  if (summary.expired !== 1) throw new Error('testExpiryService: expired ควร 1');
  if (summary.pushed !== 2) throw new Error('testExpiryService: pushed ควร 2 (' + summary.pushed + ')');
  if (sent.length !== 2) throw new Error('testExpiryService: sender ควรถูกเรียก 2 ครั้ง');

  if (!sent.some(s => s.to === 'U11111111111111111111111111111111' && s.text.includes('14 วัน'))) {
    throw new Error('testExpiryService: ไม่มี push เตือน expiring');
  }
  if (!sent.some(s => s.to === 'U22222222222222222222222222222222' && s.text.includes('หมดอายุแล้ว'))) {
    throw new Error('testExpiryService: ไม่มี push แจ้ง expired');
  }
  if (!unlinked.includes('U22222222222222222222222222222222')) throw new Error('testExpiryService: expired ควรถูก unlink');
  if (unlinked.includes('U11111111111111111111111111111111')) throw new Error('testExpiryService: expiring ไม่ควรถูก unlink');
  if (sent.some(s => s.to === 'U33333333333333333333333333333333')) throw new Error('testExpiryService: valid ไม่ควรถูก push');
  if (sent.some(s => s.to === 'U44444444444444444444444444444444')) throw new Error('testExpiryService: inactive ไม่ควรถูก push');

  // 2) audit trail: ทุกการตรวจถูกบันทึกลง t_expiry_log (การ์ด MT-32)
  const logs = __fakeSheets['t_expiry_log'] || [];
  const logRows = logs.length > 0 ? logs.slice(1) : []; // ข้าม header
  if (logRows.length !== 3) throw new Error('testExpiryService: t_expiry_log ควรมี 3 แถว (ได้ ' + logRows.length + ')');
  const byMember = {};
  for (const r of logRows) byMember[r[1]] = r;
  if (!byMember['M001'] || byMember['M001'][3] !== 'expiring' || byMember['M001'][4] !== 14) {
    throw new Error('testExpiryService: log M001 ผิด (ควร expiring 14 วัน)');
  }
  if (!byMember['M002'] || byMember['M002'][3] !== 'expired' || byMember['M002'][4] !== -5) {
    throw new Error('testExpiryService: log M002 ผิด (ควร expired -5 วัน)');
  }
  if (!byMember['M003'] || byMember['M003'][3] !== 'valid' || byMember['M003'][4] !== 147) {
    throw new Error('testExpiryService: log M003 ผิด (ควร valid 147 วัน)');
  }
  if (byMember['M004']) throw new Error('testExpiryService: inactive ไม่ควรมี log');

  // 3) repository มี listMembers + logExpiry ครบสัญญา
  const repo = Data.MemberRepository.getRepository();
  if (typeof repo.listMembers !== 'function') throw new Error('testExpiryService: repository ต้องมี listMembers');
  if (typeof repo.logExpiry !== 'function') throw new Error('testExpiryService: repository ต้องมี logExpiry');
  if (repo.listMembers().length !== 4) throw new Error('testExpiryService: listMembers ควรคืน 4 รายการ');

  Logger.log('testExpiryService OK — scan + push + unlink + audit log t_expiry_log (ทุกการตรวจ)');
  return true;
}

/**
 * ทดสอบ Api Layer (MT-16): registry routing + JSON envelope {ok,error,data}
 * + handlers ใช้ Core/Repository (ผ่าน Fake Sheets)
 * @returns {boolean}
 */
function testApiLayer() {
  const api = Api.ApiService;

  // 1) health
  const health = api.handleRequest('GET', '/api/health', {});
  if (!health.ok || health.data.status !== 'ok') throw new Error('testApiLayer: health ควร ok');

  // 2) seed fake sheets: M001 valid / M002 expired / M003 ยังไม่ activate + บัญชีเงินฝาก
  delete __fakeSheets['t_member_mast'];
  delete __fakeSheets['t_savings_acct'];
  __fakeSheets['t_member_mast'] = [
    DataDict.getHeaders('MEMBER_MASTER'),
    ['M001', 'นาย', 'สมชาย', 'ใจดี', 25, 'กรรมการ', 10, '2026-01-01', '2027-01-01', 'active', 'ACT001', 'U11111111111111111111111111111111', 'member', 85, 50000, 10000],
    ['M002', 'นาง', 'สมหญิง', 'รักดี', 20, '', 5, '2026-01-01', '2026-08-01', 'active', 'ACT002', 'U22222222222222222222222222222222', 'member', 80, 8000, 5000],
    ['M003', 'นาย', 'ใหม่', 'สมาชิก', 10, '', 2, '', '', 'inactive', 'ACT003', '', 'member', 60, 0, 1000]
  ];
  __fakeSheets['t_savings_acct'] = [
    DataDict.getHeaders('SAVINGS_ACCT'),
    ['M001', 'SAV-0001', 'ออมทรัพย์', 25000, '2026-08-01']
  ];

  // 3) profile
  const p = api.handleRequest('GET', '/api/member/profile', { query: { lineUserId: 'U11111111111111111111111111111111' } });
  if (!p.ok) throw new Error('testApiLayer: profile ควร ok');
  if (p.data.mem_code !== 'M001' || p.data.mem_fname !== 'สมชาย') throw new Error('testApiLayer: profile data ผิด');
  if (p.data.mem_kk !== 85) throw new Error('testApiLayer: profile ไม่มี mem_kk');

  // 4) ไม่มี lineUserId → VALIDATION
  const noId = api.handleRequest('GET', '/api/member/profile', {});
  if (noId.ok || noId.error.code !== 'VALIDATION') throw new Error('testApiLayer: ไม่มี lineUserId ควร VALIDATION');

  // 5) ไม่พบสมาชิก → MEMBER_NOT_FOUND
  const nf = api.handleRequest('GET', '/api/member/profile', { query: { lineUserId: 'U99999999999999999999999999999999' } });
  if (nf.ok || nf.error.code !== 'MEMBER_NOT_FOUND') throw new Error('testApiLayer: ไม่พบสมาชิกควร MEMBER_NOT_FOUND');

  // 6) savings
  const s = api.handleRequest('GET', '/api/member/savings', { query: { lineUserId: 'U11111111111111111111111111111111' } });
  if (!s.ok || s.data.savings.length !== 1) throw new Error('testApiLayer: savings ผิด');
  if (s.data.savings[0].balance !== 25000) throw new Error('testApiLayer: savings balance ผิด');

  // 7) validity (default now = เวลาจริง): M001 valid / M002 expired
  const v1 = api.handleRequest('GET', '/api/member/validity', { query: { lineUserId: 'U11111111111111111111111111111111' } });
  if (!v1.ok || v1.data.valid !== true) throw new Error('testApiLayer: M001 ควร valid');
  const v2 = api.handleRequest('GET', '/api/member/validity', { query: { lineUserId: 'U22222222222222222222222222222222' } });
  if (!v2.ok || v2.data.valid !== false) throw new Error('testApiLayer: M002 ควร invalid (หมดอายุ)');
  if (v2.data.expiry.status !== 'expired') throw new Error('testApiLayer: expiry.status ควร expired');

  // 8) activate สำเร็จ (M003 ยังไม่ activate) → activate ซ้ำ ALREADY_ACTIVATED → รหัสผิด MEMBER_NOT_FOUND
  const a1 = api.handleRequest('POST', '/api/member/activate', { body: { activateCode: 'ACT003', lineUserId: 'U33333333333333333333333333333333' } });
  if (!a1.ok) throw new Error('testApiLayer: activate ควร ok — ' + JSON.stringify(a1));
  if (a1.data.mem_code !== 'M003' || !a1.data.mem_exp_dt) throw new Error('testApiLayer: activate data ผิด');
  const a2 = api.handleRequest('POST', '/api/member/activate', { body: { activateCode: 'ACT003', lineUserId: 'U33333333333333333333333333333333' } });
  if (a2.ok || a2.error.code !== 'ALREADY_ACTIVATED') throw new Error('testApiLayer: activate ซ้ำควร ALREADY_ACTIVATED');
  const a3 = api.handleRequest('POST', '/api/member/activate', { body: { activateCode: 'WRONG', lineUserId: 'U33333333333333333333333333333333' } });
  if (a3.ok || a3.error.code !== 'MEMBER_NOT_FOUND') throw new Error('testApiLayer: activate รหัสผิดควร MEMBER_NOT_FOUND');

  // 8b) renew (MT-12): M002 หมดอายุแล้ว → ต่ออายุด้วย ACT002 → mem_exp_dt ขยายอย่างน้อย 1 ปี
  const rn = api.handleRequest('POST', '/api/member/renew', { body: { activateCode: 'ACT002', lineUserId: 'U22222222222222222222222222222222' } });
  if (!rn.ok) throw new Error('testApiLayer: renew ควร ok — ' + JSON.stringify(rn));
  if (rn.data.mem_code !== 'M002') throw new Error('testApiLayer: renew mem_code ผิด');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rn.data.mem_exp_dt)) throw new Error('testApiLayer: renew ต้องคืน yyyy-mm-dd');
  if (rn.data.mem_exp_dt < '2027-08-01') throw new Error('testApiLayer: renew ควรขยายอย่างน้อย 1 ปี');
  if (rn.data.mem_status !== 'active') throw new Error('testApiLayer: renew ควรตั้ง active');
  const rnBad = api.handleRequest('POST', '/api/member/renew', { body: { activateCode: 'WRONG', lineUserId: 'U22222222222222222222222222222222' } });
  if (rnBad.ok || rnBad.error.code !== 'MEMBER_NOT_FOUND') throw new Error('testApiLayer: renew รหัสผิดควร MEMBER_NOT_FOUND');

  // 9) route ไม่มี → NOT_FOUND · method ผิด → METHOD_NOT_ALLOWED
  const nf2 = api.handleRequest('GET', '/api/nope', {});
  if (nf2.ok || nf2.error.code !== 'NOT_FOUND') throw new Error('testApiLayer: route ไม่มีควร NOT_FOUND');
  const mma = api.handleRequest('POST', '/api/health', {});
  if (mma.ok || mma.error.code !== 'METHOD_NOT_ALLOWED') throw new Error('testApiLayer: method ผิดควร METHOD_NOT_ALLOWED');

  // 10) envelope shape: ทุก response มี ok + (data หรือ error.code)
  const all = [health, p, noId, nf, s, v1, v2, a1, a2, a3, rn, rnBad, nf2, mma];
  for (const r of all) {
    if (typeof r.ok !== 'boolean') throw new Error('testApiLayer: envelope ต้องมี ok (boolean)');
    if (r.ok && !('data' in r)) throw new Error('testApiLayer: ok ต้องมี data');
    if (!r.ok && (!r.error || !r.error.code)) throw new Error('testApiLayer: error ต้องมี code');
  }

  Logger.log('testApiLayer OK — registry + envelope {ok,error,data} + handlers (profile/savings/validity/activate)');
  return true;
}

/**
 * ทดสอบ Bot เป็น UI Adapter (MT-17): EventHandler เรียกข้อมูลสมาชิกผ่าน Api.ApiService
 * (spy handleRequest + fake MessageService.reply) — postback → API → ข้อความตอบกลับ
 * เหมือนเดิมทุกประการ (ไม่เปลี่ยนพฤติกรรมผู้ใช้)
 * @returns {boolean}
 */
function testBotUsesApi() {
  // 1) seed fake sheets: สมาชิก active 1 คน + บัญชีเงินฝาก 1 บัญชี
  delete __fakeSheets['t_member_mast'];
  __fakeSheets['t_member_mast'] = [
    DataDict.getHeaders('MEMBER_MASTER'),
    ['M001', 'นาย', 'สมชาย', 'ใจดี', 25, 'กรรมการ', 10, '2026-01-01', '2026-12-31', 'active', 'ACT001', 'U11111111111111111111111111111111', 'member', 85, 50000, 10000]
  ];
  delete __fakeSheets['t_savings_acct'];
  __fakeSheets['t_savings_acct'] = [
    DataDict.getHeaders('SAVINGS_ACCT'),
    ['M001', 'SAV-0001', 'ออมทรัพย์', 25000, '2026-08-01']
  ];

  // 2) spy: ตรวจว่า EventHandler เรียกผ่าน Api.ApiService.handleRequest (ไม่เรียก repo ตรง ๆ)
  const origHandle = Api.ApiService.handleRequest;
  const apiCalls = [];
  Api.ApiService.handleRequest = function (method, path, opts) {
    apiCalls.push({ method, path });
    return origHandle(method, path, opts);
  };
  // fake MessageService.reply — เก็บข้อความที่ตอบผู้ใช้
  const replies = [];
  const origReply = LineBot.MessageService.reply;
  LineBot.MessageService.reply = function (replyToken, text) {
    replies.push(text);
    return { ok: true };
  };

  const user = { source: { userId: 'U11111111111111111111111111111111' } };
  try {
    // profile ผ่าน API
    LineBot.EventHandler.handlePostback(
      { ...user, replyToken: 'RT1', postback: { data: 'action=menu_item&item=profile' } }, 'TOKEN');
    // saving_acct ผ่าน API
    LineBot.EventHandler.handlePostback(
      { ...user, replyToken: 'RT2', postback: { data: 'action=menu_item&item=saving_acct' } }, 'TOKEN');
  } finally {
    Api.ApiService.handleRequest = origHandle;
    LineBot.MessageService.reply = origReply;
  }

  // 3) ตรวจว่าเรียก API ครบทั้ง 2 เส้นทาง (GET)
  const paths = apiCalls.map(c => c.path);
  if (!paths.includes('/api/member/profile')) throw new Error('testBotUsesApi: profile ต้องเรียกผ่าน /api/member/profile');
  if (!paths.includes('/api/member/savings')) throw new Error('testBotUsesApi: saving_acct ต้องเรียกผ่าน /api/member/savings');
  if (apiCalls.length !== 2) throw new Error('testBotUsesApi: ควรเรียก API 2 ครั้ง (ได้ ' + apiCalls.length + ')');
  if (apiCalls.some(c => c.method !== 'GET')) throw new Error('testBotUsesApi: data read ต้องเป็น GET');

  // 4) user-visible behavior เหมือนเดิม: profile มีชื่อ/คะแนนตำแหน่ง/ฟิลด์ใหม่ · finance มีข้อมูลจริง
  if (!replies[0] || !replies[0].includes('สมชาย ใจดี')) throw new Error('testBotUsesApi: profile ต้องมีชื่อ');
  if (!replies[0] || !replies[0].includes('คะแนน 10')) throw new Error('testBotUsesApi: profile ต้องมีคะแนนตำแหน่ง (mem_position_score ผ่าน API)');
  if (!replies[0] || !replies[0].includes('คะแนนความดี: 85')) throw new Error('testBotUsesApi: profile ต้องมี mem_kk ผ่าน API');
  if (!replies[0] || !replies[0].includes('50,000.00 บาท')) throw new Error('testBotUsesApi: profile ต้องมี mem_bk (formatMoney) ผ่าน API');
  if (!replies[1] || !replies[1].includes('25,000.00 บาท')) throw new Error('testBotUsesApi: saving reply ต้องมีข้อมูลจริงจาก t_savings_acct ผ่าน API');
  if (!replies[1] || !replies[1].includes('รวมเงินฝาก')) throw new Error('testBotUsesApi: saving reply ต้องมีรวมยอด');

  Logger.log('testBotUsesApi OK — postback → Api.ApiService (profile/savings) → ข้อความเหมือนเดิม');
  return true;
}

/**
 * ทดสอบ API Mount ใน WebApp (doGet/doPost แยก /api/* → Api.ApiService + API key):
 * health เปิดสาธารณะ · path อื่นต้องมี api_key ถูกต้อง (401 ถ้าไม่) ·
 * profile/activate ผ่าน mount · LINE webhook (ไม่มี pathInfo) ยังทำงานเหมือนเดิม
 * @returns {boolean}
 */
function testApiMount() {
  // 1) ตั้งค่า Script Properties (sandbox): API_KEY + WEBHOOK_SECRET
  const props = PropertiesService.getScriptProperties();
  props.setProperty('API_KEY', 'test-api-key-123');
  props.setProperty('WEBHOOK_SECRET', 'wh-secret');

  // seed fake sheets: สมาชิก 1 คน (ยังไม่ activate)
  delete __fakeSheets['t_member_mast'];
  __fakeSheets['t_member_mast'] = [
    DataDict.getHeaders('MEMBER_MASTER'),
    ['M001', 'นาย', 'สมชาย', 'ใจดี', 25, 'กรรมการ', 10, '', '', 'inactive', 'ACT001', '', 'member', 85, 50000, 10000]
  ];

  const resp = (r) => JSON.parse(r.getContent());

  // 2) GET /api/health — public (ไม่ต้องมี key)
  let env = resp(doGet({ pathInfo: 'api/health', parameter: {} }));
  if (!env.ok || env.data.status !== 'ok') throw new Error('testApiMount: /api/health ต้องตอบ ok (public)');

  // 3) GET /api/member/profile โดยไม่มี key → 401 UNAUTHORIZED
  env = resp(doGet({ pathInfo: 'api/member/profile', parameter: { lineUserId: 'U11111111111111111111111111111111' } }));
  if (env.ok || env.error.code !== 'UNAUTHORIZED') {
    throw new Error('testApiMount: profile ไม่มี api_key ต้องตอบ UNAUTHORIZED (ได้ ' + JSON.stringify(env) + ')');
  }

  // 4) POST /api/member/activate — api_key ใน body (ไม่ใช่ query) → ผูก line_user_id กับ M001
  env = resp(doPost({
    pathInfo: 'api/member/activate',
    parameter: {},
    postData: { contents: JSON.stringify({ api_key: 'test-api-key-123', activateCode: 'ACT001', lineUserId: 'U11111111111111111111111111111111' }) }
  }));
  if (!env.ok || env.data.mem_status !== 'active') throw new Error('testApiMount: activate ผ่าน mount ต้องสำเร็จ');
  // activate ซ้ำ → ALREADY_ACTIVATED (ผ่าน mount)
  env = resp(doPost({
    pathInfo: 'api/member/activate',
    parameter: {},
    postData: { contents: JSON.stringify({ api_key: 'test-api-key-123', activateCode: 'ACT001', lineUserId: 'U11111111111111111111111111111111' }) }
  }));
  if (env.ok || env.error.code !== 'ALREADY_ACTIVATED') {
    throw new Error('testApiMount: activate ซ้ำผ่าน mount ต้องตอบ ALREADY_ACTIVATED');
  }

  // 5) GET /api/member/profile พร้อม api_key ถูกต้อง (หลัง activate) → ข้อมูลสมาชิก
  env = resp(doGet({
    pathInfo: 'api/member/profile',
    parameter: { api_key: 'test-api-key-123', lineUserId: 'U11111111111111111111111111111111' }
  }));
  if (!env.ok || env.data.mem_code !== 'M001') throw new Error('testApiMount: profile ผ่าน api_key ต้องคืน mem_code=M001');
  // api_key ผิด → UNAUTHORIZED
  env = resp(doGet({
    pathInfo: 'api/member/profile',
    parameter: { api_key: 'wrong-key', lineUserId: 'U11111111111111111111111111111111' }
  }));
  if (env.ok || env.error.code !== 'UNAUTHORIZED') throw new Error('testApiMount: api_key ผิดต้องตอบ UNAUTHORIZED');

  // 6) LINE webhook (ไม่มี pathInfo) — ไม่แตะ API mount: ตรวจ webhook_secret เหมือนเดิม
  env = resp(doPost({ parameter: {}, postData: { contents: JSON.stringify({ events: [] }) } }));
  if (env.status !== 'error' || env.message !== 'Unauthorized') {
    throw new Error('testApiMount: webhook ที่ไม่มี webhook_secret ต้องถูกปฏิเสธ (Unauthorized)');
  }
  env = resp(doPost({ parameter: { webhook_secret: 'wh-secret' }, postData: { contents: JSON.stringify({ events: [] }) } }));
  if (env.status !== 'ok') throw new Error('testApiMount: webhook ที่มี webhook_secret ต้องตอบ ok (เส้นทางเดิมไม่เปลี่ยน)');

  Logger.log('testApiMount OK — /api/* ผ่าน Api.ApiService + API key · health public · webhook เดิมไม่เปลี่ยน');
  return true;
}

/**
 * ทดสอบการต่ออายุสมาชิก (MT-12): Core.computeRenewal (pure) + RenewalService.performRenew
 * (ผ่าน Fake Sheets + fake gater — ไม่แตะ LINE API)
 * @returns {boolean}
 */
function testRenewal() {
  // 1) Core.computeRenewal (pure, deterministic now)
  const R = Core.MemberRules;
  const now = new Date('2026-08-12T12:00:00');
  // ยังไม่หมดอายุ → ต่อจากวันหมดอายุเดิม +1 ปี
  const r1 = R.computeRenewal({ mem_code: 'M002', mem_exp_dt: '2026-12-31' }, now);
  if (r1.newExpDt !== '2027-12-31') throw new Error('testRenewal: ยังไม่หมดอายุควรต่อจาก exp เดิม (' + r1.newExpDt + ')');
  // หมดอายุแล้ว → ต่อจากวันนี้ +1 ปี
  const r2 = R.computeRenewal({ mem_code: 'M001', mem_exp_dt: '2026-08-01' }, now);
  if (r2.newExpDt !== '2027-08-12') throw new Error('testRenewal: หมดอายุควรต่อจากวันนี้ (' + r2.newExpDt + ')');
  // ไม่มี exp → ต่อจากวันนี้
  const r3 = R.computeRenewal({ mem_code: 'M003' }, now);
  if (r3.newExpDt !== '2027-08-12') throw new Error('testRenewal: ไม่มี exp ควรต่อจากวันนี้ (' + r3.newExpDt + ')');

  // 2) seed fake sheets: M001 หมดอายุแล้ว / M002 ยัง valid
  delete __fakeSheets['t_member_mast'];
  delete __fakeSheets['t_activation_log'];
  __fakeSheets['t_member_mast'] = [
    DataDict.getHeaders('MEMBER_MASTER'),
    ['M001', 'นาย', 'สมชาย', 'ใจดี', 25, 'กรรมการ', 10, '2026-01-01', '2026-08-01', 'active', 'ACT001', 'U11111111111111111111111111111111', 'member', 85, 50000, 10000],
    ['M002', 'นาง', 'สมหญิง', 'รักดี', 20, '', 5, '2026-01-01', '2026-12-31', 'active', 'ACT002', 'U22222222222222222222222222222222', 'member', 80, 8000, 5000]
  ];

  const S = LineBot.RenewalService;
  const gated = [];

  // 3) ต่ออายุด้วยรหัส (ACT001 — หมดอายุแล้ว) → ใหม่เป็น 2027-08-12 + ตั้ง active + gater ถูกเรียก + log renewed
  const res = S.performRenew('ACT001', 'U11111111111111111111111111111111', {
    now: now,
    gater: (userId) => { gated.push(userId); return { ok: true }; }
  });
  if (!res.success) throw new Error('testRenewal: ต่ออายุควรสำเร็จ — ' + JSON.stringify(res));
  if (res.newExpDt !== '2027-08-12') throw new Error('testRenewal: newExpDt ผิด (' + res.newExpDt + ')');
  const mRow = __fakeSheets['t_member_mast'][1];
  if (mRow[8] !== '2027-08-12') throw new Error('testRenewal: mem_exp_dt ในชีทไม่ถูกเขียน');
  if (mRow[9] !== 'active') throw new Error('testRenewal: mem_status ควรเป็น active');
  if (!gated.includes('U11111111111111111111111111111111')) throw new Error('testRenewal: ควรผูกเมนูสมาชิกกลับ (gater)');
  const actLogs = (__fakeSheets['t_activation_log'] || []).slice(1);
  if (actLogs.length !== 1 || actLogs[0][4] !== 'renewed') {
    throw new Error('testRenewal: ควรมี audit log renewed ใน t_activation_log');
  }

  // 4) ต่ออายุตัวเอง (ไม่มีรหัส — renew) สมาชิกที่ยัง valid → ต่อจาก exp เดิม
  const res2 = S.performRenew('', 'U22222222222222222222222222222222', {
    now: now,
    gater: (userId) => { gated.push(userId); return { ok: true }; }
  });
  if (!res2.success || res2.newExpDt !== '2027-12-31') {
    throw new Error('testRenewal: ต่ออายุตัวเองผิด (' + JSON.stringify(res2) + ')');
  }

  // 5) รหัสผิด → code_not_found · ไม่พบตัวเอง → member_not_found
  const bad = S.performRenew('WRONG', 'U11111111111111111111111111111111', { now: now, gater: () => ({ ok: true }) });
  if (bad.success || bad.reason !== 'code_not_found') throw new Error('testRenewal: รหัสผิดควร code_not_found');
  const nf = S.performRenew('', 'U99999999999999999999999999999999', { now: now, gater: () => ({ ok: true }) });
  if (nf.success || nf.reason !== 'member_not_found') throw new Error('testRenewal: ไม่พบตัวเองควร member_not_found');

  Logger.log('testRenewal OK — computeRenewal (ต่อจาก exp/วันนี้) + performRenew (รหัส/ตัวเอง + log + gater)');
  return true;
}

/**
 * ทดสอบ Core.MemberRules (pure — ไม่แตะ service):
 * ตรวจกฎความ valid ด้วย now ที่กำหนดเอง (deterministic)
 * @returns {boolean}
 */
function testCoreMemberRules() {
  const R = Core.MemberRules;
  const now = new Date('2026-08-06T12:00:00');
  const valid = { mem_status: 'active', mem_role: 'member', mem_eff_dt: '2026-01-01', mem_exp_dt: '2027-01-01' };

  const cases = [
    [valid, true, 'valid'],
    [{ ...valid, mem_status: 'inactive' }, false, 'status ไม่ active'],
    [{ ...valid, mem_eff_dt: '2026-09-01' }, false, 'ยังไม่ถึงวันเริ่ม'],
    [{ ...valid, mem_exp_dt: '2026-07-01' }, false, 'หมดอายุ'],
    [{ ...valid, mem_eff_dt: '' }, false, 'ไม่มีวันเริ่ม (fail-safe)'],
    [{ ...valid, mem_exp_dt: null }, false, 'ไม่มีวันหมดอายุ (fail-safe)'],
    [null, false, 'ไม่มี member'],
    [valid, true, 'hasRole member ผ่าน'],
    [{ ...valid, mem_role: 'staff' }, false, 'hasRole(member) ไม่ผ่านเมื่อ role staff'],
    [{ ...valid, mem_role: 'admin' }, true, 'hasRole(admin) ผ่าน']
  ];

  for (let i = 0; i < cases.length; i++) {
    const [member, expected, label] = cases[i];
    let actual;
    if (i < 7) actual = R.isActiveMember(member, now);
    else actual = R.hasRole(member, i === 8 ? 'member' : (i === 9 ? 'admin' : 'member'), now);
    if (actual !== expected) {
      throw new Error('testCoreMemberRules FAILED: ' + label + ' (expected ' + expected + ', got ' + actual + ')');
    }
  }
  Logger.log('testCoreMemberRules OK — ' + cases.length + ' กรณี (pure, deterministic now)');
  return true;
}

/**
 * ทดสอบ Core.LoanCalculator (pure — Actual/365 ลดต้นลดดอก)
 * @returns {boolean}
 */
function testLoanCalculator() {
  const L = Core.LoanCalculator;

  // 1) getDaysDiff / getNextMonthEnd
  if (L.getDaysDiff(new Date('2026-01-15'), new Date('2026-01-31')) !== 16) {
    throw new Error('testLoanCalculator: getDaysDiff(15 → 31 ม.ค.) ควรเป็น 16 วัน');
  }
  // ตามสูตร HTML: getNextMonthEnd(..., period) = วันสิ้นเดือนของเดือน (start.month + period - 1)
  if (L.getNextMonthEnd('2026-01-15', 1).getDate() !== 31) {
    throw new Error('testLoanCalculator: getNextMonthEnd งวด 1 ควรเป็น 31 ม.ค. (สิ้นเดือนเริ่ม)');
  }
  if (L.getNextMonthEnd('2026-01-15', 2).getDate() !== 28) {
    throw new Error('testLoanCalculator: getNextMonthEnd งวด 2 ควรเป็น 28 ก.พ.');
  }

  // 2) กรณีทั่วไป: กู้ 100,000 · 5% · ลดต้นคงที่ · 12 งวด · เริ่ม 15 ม.ค. 2026
  const r = L.calculateLoanSchedule({
    loanAmount: 100000, interestRatePercent: 5,
    calcMode: 'installment_count', calcValue: 12,
    paymentType: 'equal_principal', startDate: '2026-01-15'
  });
  if (r.error) throw new Error('testLoanCalculator: ' + r.error);
  if (r.schedule.length !== 12) throw new Error('testLoanCalculator: ควรมี 12 งวด แต่ได้ ' + r.schedule.length);
  // ดอกเบี้ยงวดแรก = 100000 × 0.05 × 16/365 (15 → 31 ม.ค.)
  if (r.schedule[0].interest !== 219.18) {
    throw new Error('testLoanCalculator: ดอกเบี้ยงวดแรกควรเป็น 219.18 แต่ได้ ' + r.schedule[0].interest);
  }
  // งวดสุดท้าย (period 12) เงินต้นที่จ่าย = ยอดคงเหลือทั้งหมด (ปิดบัญชี)
  const lastPrincipal = r.schedule[11].principal;
  const sumPrincipal = r.schedule.reduce((s, row) => s + row.principal, 0);
  if (lastPrincipal !== 8333.33) {
    throw new Error('testLoanCalculator: งวดสุดท้ายควรปิดยอด 8333.33 แต่ได้ ' + lastPrincipal);
  }
  // ผลรวมเงินต้นทุกงวด ≈ เงินกู้ (ยอดปิดครบ)
  if (Math.abs(sumPrincipal - 100000) > 1) {
    throw new Error('testLoanCalculator: ผลรวมเงินต้นควร ≈ 100000 แต่ได้ ' + sumPrincipal);
  }
  // ยอดเงินต้นรวม (จาก return) ≈ เงินกู้
  if (Math.abs(r.totalPrincipal - 100000) > 1) {
    throw new Error('testLoanCalculator: totalPrincipal ควร ≈ 100000 แต่ได้ ' + r.totalPrincipal);
  }

  // 3) error case: ยอดส่งงวดน้อยกว่าดอกเบี้ย
  const err = L.calculateLoanSchedule({
    loanAmount: 100000, interestRatePercent: 5,
    calcMode: 'installment_amount', calcValue: 100,
    paymentType: 'equal_installment', startDate: '2026-01-15'
  });
  if (!err.error) throw new Error('testLoanCalculator: ควรได้ error เมื่อยอดส่งน้อยกว่าดอกเบี้ย');

  Logger.log('testLoanCalculator OK — Actual/365 (days + schedule + error case)');
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
