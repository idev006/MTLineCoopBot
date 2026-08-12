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
    mem_eff_dt: '2026-08-06', mem_exp_dt: '2027-08-06'
  };

  // 1) profile มีข้อมูลจริง
  const p = S.buildProfileText(member);
  if (!p.includes('นาย สมชาย ใจดี')) throw new Error('testMemberDataService: profile ไม่มีชื่อจริง');
  if (!p.includes('M001')) throw new Error('testMemberDataService: profile ไม่มีรหัสสมาชิก');
  if (!p.includes('2026-08-06')) throw new Error('testMemberDataService: profile ไม่มีช่วงวันสิทธิ์');

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
  if (keys.length !== 4) throw new Error('testSeedData: ต้องมี 4 ตาราง (ได้ ' + keys.length + ')');

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
    ACTIVATION_LOG: ['log_id', 'mem_code', 'line_user_id', 'activate_code', 'status', 'activated_dt']
  };
  for (const key of Object.keys(expect)) {
    const actual = DataDict.getHeaders(key).join(',');
    if (actual !== expect[key].join(',')) {
      throw new Error('testSeedData: ' + key + ' คอลัมน์ไม่ตรงแบบ (' + actual + ')');
    }
  }

  Logger.log('testSeedData OK — 4 ตาราง + dummy rows ตรง DataDict');
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
