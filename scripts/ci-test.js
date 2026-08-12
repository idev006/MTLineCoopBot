#!/usr/bin/env node
/**
 * ci-test.js — ชุดทดสอบสัญญา (Contract Tests) ของ MTLineCoopBot รันใน node
 *
 * จำลอง runtime ของ Google Apps Script (Logger, PropertiesService, Utilities,
 * ContentService) เพื่อให้ Test.js รันได้โดยไม่ต้องพึ่ง Apps Script จริง
 *
 * ใช้ใน GitHub Actions (mirror DoD บทที่ 8.1.3) และรันในเครื่องได้:
 *   node scripts/ci-test.js
 *
 * ตรวจ:
 *   1. verifyMenuContract      — item id ทุกตัวใน MenuData มี key ใน ReplyStore.CAPTIONS + reply text
 *   2. verifyThaiCaptions      — caption เป็นภาษาไทย (ไม่มี id ภาษาอังกฤษหลุด)
 *   3. testVerifyLineSignature — HMAC-SHA256 test vectors
 *   4. testVerifyWebhookSecret — token จาก query parameter
 *   5. testMemberValidity      — กฎความ valid (ช่วงวัน + status + role)
 *   6. Secret scan             — ห้าม hardcoded token/secret ในโค้ด (fail ถ้าพบ)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const APP_DIR = path.join(__dirname, '..', 'app');

// ── 1) Secret scan: ห้าม token/secret hardcode ในโค้ด ──
const TOKEN_PATTERN = /(?:CHANNEL_ACCESS_TOKEN|CHANNEL_SECRET|WEBHOOK_SECRET|Authorization\s*[:=]\s*Bearer)\s*[:=]\s*['"][A-Za-z0-9+/=_-]{40,}['"]/;
const scanHits = [];
for (const file of fs.readdirSync(APP_DIR, { recursive: true })) {
  const rel = String(file);
  if (!rel.endsWith('.js')) continue;
  const abs = path.join(APP_DIR, rel);
  const content = fs.readFileSync(abs, 'utf8');
  if (TOKEN_PATTERN.test(content)) scanHits.push(rel);
}

// ── 2) จำลอง Apps Script services ──
const props = {};
const sandbox = {
  console,
  Logger: { log: (...args) => console.log(...args) },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (k) => (k in props ? props[k] : null),
      getProperties: () => ({ ...props }),
      setProperty: (k, v) => { props[k] = String(v); },
      setProperties: (obj) => { Object.entries(obj || {}).forEach(([k, v]) => { props[k] = String(v); }); },
      deleteProperty: (k) => { delete props[k]; }
    })
  },
  Utilities: {
    computeHmacSha256Signature: (body, secret) =>
      Array.from(crypto.createHmac('sha256', String(secret)).update(String(body)).digest()),
    base64Encode: (bytes) => Buffer.from(bytes).toString('base64')
  },
  ContentService: {
    createTextOutput: (content) => ({ setMimeType: () => ({ getContent: () => content }) }),
    MimeType: { JSON: 'application/json' }
  },
  UrlFetchApp: {}
};

// ── 2.5) Fake SpreadsheetApp (in-memory) — ทดสอบ Data Layer ได้จริงใน node (MT-27) ──
// จำลอง getSheetByName / insertSheet / getDataRange / appendRow / getRange().setValue / deleteRows
const __fakeSheets = {};
function makeFakeSheet(name, rows) {
  return {
    getName: () => name,
    getDataRange: () => ({ getValues: () => rows.map(r => [...r]) }),
    appendRow: (row) => { rows.push([...row]); },
    getRange: (r, c) => ({ setValue: (v) => { rows[r - 1][c - 1] = v; } }),
    getLastRow: () => rows.length,
    getLastColumn: () => (rows[0] ? rows[0].length : 0),
    deleteRows: (start, count) => { rows.splice(start - 1, count); }
  };
}
sandbox.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheetByName: (name) => (name in __fakeSheets ? makeFakeSheet(name, __fakeSheets[name]) : null),
    insertSheet: (name) => { __fakeSheets[name] = []; return makeFakeSheet(name, __fakeSheets[name]); }
  })
};
sandbox.__fakeSheets = __fakeSheets;

// ── 3) เรียงไฟล์ให้ namespace (var LineBot / var RichMenu / const Config) ครบก่อนใช้ ──
const FILE_ORDER = [
  'Config.js',
  'DataDict.js',
  'Util.js',
  'Core/MemberRules.js',
  'Core/LoanCalculator.js',
  'Core/DateConverter.js',
  'Core/NoticeRules.js',
  'Data/MemberRepository.js',
  'Data/SheetsMemberRepository.js',
  'LineBot/SheetService.js',
  'LineBot/ReplyStore.js',
  'LineBot/MemberDataService.js',
  'LineBot/FlexBuilder.js',
  'LineBot/MessageService.js',
  'LineBot/ActivationService.js',
  'LineBot/ExpiryService.js',
  'LineBot/RenewalService.js',
  'LineBot/NoticeService.js',
  'LineBot/EventHandler.js',
  'RichMenu/MenuData.js',
  'RichMenu/ApiService.js',
  'RichMenu/Deployer.js',
  'RichMenu/Gating.js',
  'Api/ApiResponse.js',
  'Api/ApiError.js',
  'Api/ApiService.js',
  'Api/ApiRegistry.js',
  'Api/ApiHandlers.js',
  'WebApp.js',
  'SeedData.js',
  'Test.js'
];

const src = FILE_ORDER
  .map((f) => fs.readFileSync(path.join(APP_DIR, f), 'utf8'))
  .join('\n;\n');

// ── 4) runner ต่อท้ายโค้ด — รันใน vm context เดียวกัน (const ระดับบนสุดมองเห็นกัน) ──
const runner = `
;(function () {
  const tests = [
    ['verifyMenuContract', verifyMenuContract],
    ['verifyThaiCaptions', verifyThaiCaptions],
    ['testVerifyLineSignature', testVerifyLineSignature],
    ['testVerifyWebhookSecret', testVerifyWebhookSecret],
    ['testMemberValidity', testMemberValidity],
    ['testWelcomeMenu', testWelcomeMenu],
    ['testMemberRepository', testMemberRepository],
    ['testMemberDataService', testMemberDataService],
    ['testSeedData', testSeedData],
    ['testFinanceData', testFinanceData],
    ['testColumnReordering', testColumnReordering],
    ['testDateValidator', testDateValidator],
    ['testDateConverter', testDateConverter],
    ['testExpiryStatus', testExpiryStatus],
    ['testExpiryService', testExpiryService],
    ['testApiLayer', testApiLayer],
    ['testRenewal', testRenewal],
    ['testNoticeRules', testNoticeRules],
    ['testNoticeBroadcast', testNoticeBroadcast],
    ['testCoreMemberRules', testCoreMemberRules],
    ['testLoanCalculator', testLoanCalculator]
  ];
  const failed = [];
  for (const [name, fn] of tests) {
    try {
      fn();
      console.log('PASS  ' + name);
    } catch (e) {
      failed.push(name);
      console.error('FAIL  ' + name + ' — ' + (e && e.message ? e.message : e));
    }
  }
  if (failed.length > 0) {
    throw new Error('CI TESTS FAILED: ' + failed.join(', '));
  }
  console.log('=== ALL TESTS PASS (' + tests.length + '/' + tests.length + ') ===');
})();
`;

let ok = true;

// Secret scan
if (scanHits.length > 0) {
  ok = false;
  console.error('FAIL  secret-scan — พบ hardcoded token ใน: ' + scanHits.join(', '));
  console.error('      ย้ายค่าลง Script Properties (Config.js จัดการให้) แล้วลบออกจากโค้ด');
} else {
  console.log('PASS  secret-scan');
}

// Contract tests
try {
  vm.createContext(sandbox);
  vm.runInContext(src + '\n' + runner, sandbox, { filename: 'MTLineCoopBot-ci.js' });
} catch (err) {
  ok = false;
  console.error('CI FAILED: ' + err.message);
}

if (!ok) {
  console.error('❌ CI FAILED');
  process.exit(1);
}
console.log('✅ CI OK — ทุกการตรวจผ่าน (พร้อม Deploy ตาม DoD)');
