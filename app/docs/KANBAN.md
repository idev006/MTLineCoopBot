# Kanban Board — MTLineCoopBot

> กระบวนการ: Document-Driven + Agile Kanban (บทที่ 8) · WIP Limit: 2–3 การ์ด
> วิธีใช้: ย้ายการ์ดระหว่างคอลัมน์ · อัปเดตป้ายสถานะใน [README](./README.md) เมื่อปิดงาน

---

## 📥 Backlog (งานรอทำ — ตาม Roadmap บทที่ 7)

### ระยะที่ 2 — การควบคุมสิทธิ์และข้อมูลจริง

- [ ] **[MT-14] ปรับปรุงข้อความตอบกลับ** — แทนที่ Placeholder ใน ReplyStore ด้วยข้อมูลจริง

### ระยะที่ 3 — สถาปัตยกรรม API-First และ LIFF

- [ ] **[MT-18] LIFF แอปแรก** — ฟอร์มใน LINE (เช่น ยื่นขอกู้) + LINE Login
- [ ] **[MT-19] ตรวจสอบ ID Token (JWT)** — verify ด้วย Channel Secret ก่อนเชื่อถือ `sub` = userId
- [ ] **[MT-21] รองรับหลาย UI** — Admin Dashboard เรียก API เดียวกัน

### ระยะที่ 4 — ขั้นสูง

- [ ] **[MT-22] ยื่นคำขอกู้แบบดิจิทัล (LIFF)** — ฟอร์ม + บันทึกคำขอ + สถานะติดตาม
- [ ] **[MT-23] Notification / Broadcast** — Push ตามกลุ่ม/เงื่อนไข + ตารางสิทธิ์
- [ ] **[MT-24] Dashboard เจ้าหน้าที่** — Web App จัดการสมาชิก/คำขอผ่าน API
- [ ] **[MT-25] เชื่อมระบบบัญชีกลาง** — API กับ Core Banking (ถ้ามี)

---

## 📋 To Do (รอบนี้)

- _(ยังไม่เลือกงาน — ดูการวางแผนรายสัปดาห์ บทที่ 8.2.3)_

---

## 🔄 In Progress (WIP ≤ 3)

- _(ว่าง)_

---

## ✅ Done

- [x] **[MT-01] Rich Menu 5 แท็บ + Alias + Deploy** — บทที่ 3.3, 5.6
- [x] **[MT-02] Flex Message ตอบกลับเมนู** — บทที่ 3.4 · รวมแก้บั๊ก item-id ตรงกันครบ 26 เมนู (H1)
- [x] **[MT-03] ระบบ Activate สมาชิก** — บทที่ 2.3.3 · `activate:CODE`
- [x] **[MT-04] DataDict SSOT (16 คอลัมน์)** — บทที่ 3.2 · รวม `mem_role` · อัปเดต 2026-08-12: เพิ่ม `mem_kk` (คะแนนความดี) / `mem_bk` (เงินกู้คงค้าง) / `mem_bh` (เงินหุ้น) — การ์ด MT-30
- [x] **[MT-05] ฟังก์ชันตรวจสอบสมาชิก** — `isActiveMember`/`hasRole`/`parseDate` (SheetService)
- [x] **[MT-06] Contract Test (Item ID)** — บทที่ 3.3.7, TC-12 · `Test.js` + `MenuData.listItemIds()`
- [x] **[MT-06b] เครื่องคำนวณสินเชื่อ Actual/365** — GitHub Pages (ยังรอรวมเข้ากับ LoanService เฟส 3)
- [x] **[MT-08] ตรวจสอบความถูกต้องของ Webhook** — บทที่ 3.6, 5.5 · `Util.verifyWebhookSecret` + `Util.verifyLineSignature` + guard ใน `doPost` + test ใน Test.js · หมายเหตุ: Apps Script อ่าน header ไม่ได้ จึงใช้ `webhook_secret` ผูกท้าย URL (Issue #67764685)
- [x] **[MT-09] Gate ตรวจสิทธิ์ใน EventHandler** — บทที่ 3.7, 6 TC-10 · `SheetService.findByLineUserId` + `getAuthorizedMember` (isActiveMember + บทบาท) ใน `EventHandler` ยกเว้น `activate:` + `testMemberValidity`
- [x] **[MT-15] แยก Core Business Logic** — อ้างอิง: บทที่ 3.1.1 · `Core/MemberRules.js` (parseDate/isActiveMember/hasRole — pure, รับ `now` เพื่อ deterministic) + `Core/LoanCalculator.js` (Actual/365 ลดต้นลดดอก: getDaysDiff/getNextMonthEnd/calculateLoanSchedule) · `SheetService` delegate ไป Core (API เดิมไม่เปลี่ยน) · `testCoreMemberRules` (10 กรณี) + `testLoanCalculator` (days + schedule + error) · ALL TESTS PASS 10/10 · หมายเหตุ: loan_calculator.html ยังมีสำเนาสูตรเอง — รวมใช้ Core เดียวกันในเฟส 3
- [x] **[MT-10] ดึงข้อมูลจริงตามเมนู** — อ้างอิง: บทที่ 7 ระยะ 2 · `LineBot/MemberDataService.js` (ใหม่): `buildProfileText()` แสดงข้อมูลจริง (ชื่อ/รหัส/บทบาท/ช่วงวัน/ตำแหน่ง+คะแนน) + `buildFinanceText()` ตอบสถานะจริง "ยังไม่เชื่อมต่อ" สำหรับเมนูการเงิน (saving_acct/chk_balance/dividends/share_capital/loan_balance — ตารางการเงินยังไม่มี 📌 บันทึกไว้ใน data-dictionary.md) + EventHandler ใช้ข้อมูลจริงผ่าน repository · `testMemberDataService` (8/8)
- [x] **[MT-20] แยก Data Layer (Repository Pattern)** — อ้างอิง: บทที่ 3.2.4 · `Data/MemberRepository.js` (interface + `assertImplemented` + `getRepository()` ตาม `Config.DB_TYPE`) + `Data/SheetsMemberRepository.js` ห่อ `SheetService` (5 ฟังก์ชัน) · `ActivationService` + Gate ใน `EventHandler` เรียกผ่าน repository แล้ว · `testMemberRepository` (interface + factory switch) · หมายเหตุ: `DB_TYPE=firestore` ยังไม่ implement — factory throw ชัดเจน (เฟส 3)
- [x] **[MT-07] Welcome Menu + Per-User Rich Menu Gating** — อ้างอิง: บทที่ 3.3.6 · `MenuData.buildWelcomeTab()` (4 ปุ่ม: เปิดใช้งาน/วิธีใช้/ติดต่อ/ข่าวสาร) + `ApiService.linkUser`/`unlinkUser`/`getRichMenuIdByAlias`/`getUserRichMenu` + `RichMenu.Gating` (link หลัง Activate / unlink เมื่อไม่ valid) + `Deployer.deploy()` ตั้ง **Welcome เป็น default** + EventHandler ตอบ welcome items (ไม่ผ่าน Gate) + `testWelcomeMenu` (CI 6/6) · หมายเหตุ: ภาพ Welcome ใส่ File ID ใน `Config.IMAGE_FILE_IDS.WELCOME` (ว่าง = ข้ามอัปโหลด)
- [x] **[MT-32] Audit log ตรวจวันหมดอายุ (t_expiry_log)** — อ้างอิง: บทที่ 7 ระยะ 2, data-dictionary.md · `DataDict` เพิ่มตาราง `t_expiry_log` (log_id/mem_code/line_user_id/status/days_left/mem_exp_dt/checked_dt) + SeedData 5 ตาราง · `SheetService.appendExpiryLog` + repository `logExpiry` (สัญญา interface เพิ่ม) · `ExpiryService.runExpiryCheck` **log ทุกการตรวจ** (valid/expiring/expired + days_left — 1 แถวต่อสมาชิกที่ถูกตรวจ) + สรุปมี `logged` · `testExpiryService` ตรวจแถว t_expiry_log (M001 expiring 14 / M002 expired -5 / M003 valid 147 · ไม่มีแถว inactive) · ALL TESTS PASS 18/18
- [x] **[MT-16] API Layer (Router + Responder)** — อ้างอิง: บทที่ 3.1.1 · `app/Api/` (ใหม่ 5 ไฟล์): `ApiService.handleRequest` (จุดเข้า) → `ApiRegistry` (ตาราง route + dispatch — เพิ่ม endpoint = เพิ่ม 1 รายการ) → `ApiHandlers` (7 endpoint: health / profile / savings / loans / dividends / validity / activate — ใช้ Core + Repository เท่านั้น) → `ApiResponse` (envelope `{ok, data}` / `{ok, error:{code,message}}`) + `ApiError` (throw พร้อม code) · error codes: VALIDATION / MEMBER_NOT_FOUND / ALREADY_ACTIVATED / NOT_FOUND / METHOD_NOT_ALLOWED / INTERNAL · `ctx.auth` เตรียมไว้ (Auth per-channel = เฟส 3) · `testApiLayer` (envelope shape + ทุก endpoint + error cases ผ่าน Fake Sheets) · ALL TESTS PASS 18/18
- [x] **[MT-11] ตรวจสอบวันหมดอายุสมาชิกอัตโนมัติ** — อ้างอิง: บทที่ 7 ระยะ 2, 5.9 · `Core.MemberRules.getExpiryStatus` (valid/expiring ≤ EXPIRY_WARNING_DAYS/expired + daysLeft — pure, deterministic now) + `LineBot/ExpiryService.js` (ใหม่): `runExpiryCheck` (scan ผ่าน `repository.listMembers` → push เตือนก่อนหมดอายุ / แจ้ง expired + `Gating.unlinkMemberMenu`) + `setupExpiryTrigger` (Time-driven รายวัน) + ฟังก์ชันระดับบนสุด `runExpiryCheck()` สำหรับ trigger · `MessageService.push` (Push API) + `Config.API.PUSH`/`EXPIRY_WARNING_DAYS` (default 30) + `SheetService.findAllMembers` · EventHandler แนบคำเตือนท้าย profile/finance reply · `testExpiryStatus` + `testExpiryService` (Fake Sheets + fake sender/unlinker — push expiring/expired · unlink เฉพาะ expired · ข้าม inactive) · ALL TESTS PASS 17/17
- [x] **[MT-12] Renew / ต่ออายุสมาชิก** — อ้างอิง: บทที่ 7 ระยะ 2 · `Core.MemberRules.computeRenewal` (ใหม่ = max(now, exp เดิม) + 1 ปี — pure, deterministic now) + `LineBot/RenewalService.js` (ใหม่): `performRenew` (DI: repo/gater/logger/now — ค้นด้วย activateCode หรือตัวเอง · เขียน `mem_exp_dt` + ตั้ง active · log `renewed` ใน t_activation_log · `Gating.linkMemberMenu` ผูกเมนูกลับ) / `handleRenew` (ตอบกลับสำเร็จ/ไม่พบรหัส) · EventHandler route `renew:CODE` / `renew` · API `POST /api/member/renew` (registry รวม 8 endpoints) · `testRenewal` (computeRenewal ต่อจาก exp เดิม/วันนี้ + performRenew รหัส/ตัวเอง · เขียนชีท · active · gater · log renewed · รหัสผิด/ไม่พบสมาชิก) + `testApiLayer` เพิ่ม renew case · ALL TESTS PASS 19/19
- [x] **[MT-13] Broadcast ประกาศ/ข่าวสาร** — อ้างอิง: บทที่ 7 ระยะ 2, 5.9.2 · `DataDict` เพิ่มตาราง `t_notice` (notice_id/title/message/published_dt/sent_dt/status) + SeedData 6 ตาราง + dummy (NTC-0001 ส่งแล้ว / NTC-0002 พร้อมส่ง / NTC-0003 draft) · `Core/NoticeRules.js` (ใหม่, pure): `getPendingNotices` (published + ยังไม่ส่ง + ถึงเวลา — เปรียบเทียบ string ตามมาตรฐาน) / `buildNoticeText` / `getBroadcastTargets` (active + มี userId) · `LineBot/NoticeService.js` (ใหม่): `runNoticeBroadcast` (DI: repo/sender/now/builder — push ประกาศถึง target ทุกคน → `markNoticeSent` เขียน sent_dt + status='sent' กันส่งซ้ำ) + `setupNoticeTrigger(h)` + ฟังก์ชันระดับบนสุด `runNoticeBroadcast()` · repository interface เพิ่ม `listNotices`/`markNoticeSent` · `testNoticeRules` (pure) + `testNoticeBroadcast` (Fake Sheets + fake sender — broadcast ครบ · ข้าม inactive · mark sent · รอบ 2 ไม่ส่งซ้ำ) · ALL TESTS PASS 21/21
- [x] **[MT-17] LINE Bot เป็น UI Adapter** — อ้างอิง: บทที่ 3.1.1, 7 ระยะที่ 3 · `EventHandler` เรียกข้อมูลสมาชิกผ่าน `Api.ApiService.handleRequest` (Bot ใช้ endpoint เดียวกับ UI อื่น ๆ): profile → `/api/member/profile` · เมนูการเงิน → `/api/member/savings`/`loans`/`dividends` (map `FINANCIAL_API` — ดึงเฉพาะตารางของเมนูนั้น) · Gate (auth) ยังตรวจที่ `getAuthorizedMember` · จัดรูปแบบข้อความ (MemberDataService) ยังอยู่ใน UI layer — พฤติกรรมผู้ใช้ไม่เปลี่ยน · API error → `replyApiDataError` (ข้อความแจ้งเตือน) · เพิ่ม `mem_position_score` ใน `ApiHandlers.getProfile` (ครบทุกฟิลด์ที่ buildProfileText ใช้) · `testBotUsesApi` (spy `Api.ApiService.handleRequest` + fake reply — postback → API → ข้อความเหมือนเดิมทุกประการ) · ALL TESTS PASS 22/22
- [x] **[MT-16b] Mount API ใน WebApp** — อ้างอิง: บทที่ 3.1.1, 5.10 · `WebApp.doGet` + `doPost` แยกเส้นทาง: `pathInfo` ขึ้นต้น `api/` → `dispatchApi` (Api.ApiService.handleRequest + **ตรวจ API key** — `Config.API_KEY` จาก `?api_key=`/body · `/api/health` เปิดสาธารณะ) · LINE webhook (ไม่มี pathInfo) **ไม่แตะ** — ตรวจ `webhook_secret` เหมือนเดิม · `ctx.auth = { apiKey }` เตรียมไว้สำหรับ Auth per-channel · `testApiMount` (health public / 401 ไม่มี key / profile+activate ผ่าน key / activate ซ้ำ ALREADY_ACTIVATED / webhook เดิมยังทำงาน) · ALL TESTS PASS 23/23
- [x] **[MT-31] เลเยอร์แปลงวันที่ชีท ↔ Firestore TIMESTAMP (เฟส 3)** — อ้างอิง: บทที่ 3.1.1, data-dictionary.md · `Core/DateConverter.js` (ใหม่, pure): `toFirestoreTimestamp` (string/Date → `{seconds,nanos}` REST Timestamp) + `fromFirestoreTimestamp` (รับ Date / `{seconds,nanos}` / RFC3339 → string มาตรฐานชีท) + helpers · ข้อตกลง timezone: ตีความ wall-clock เป็น UTC → round-trip ตรงเป๊ะ (offset +07:00 = จุดตัดสินใจเฟส 3) · `testDateConverter` (round-trip / 3 รูปแบบ input / ปฏิเสธรูปแบบผิด / ขอบเขตปี) · ALL TESTS PASS 15/15
- [x] **[MT-30] label ภาษาไทย + แสดงฟิลด์เพิ่มเติมในโปรไฟล์** — อ้างอิง: บทที่ 3.2.2, 4.2.7 · ยืนยันความหมายจากเจ้าของระบบ: `mem_kk` = คะแนนความดี · `mem_bk` = เงินกู้คงค้าง (บาท) · `mem_bh` = เงินหุ้น (บาท) · ใส่ label ใน DataDict + แสดงใน `buildProfileText` (จัดรูปแบบเงินด้วย `formatMoney`; ไม่โชว์บรรทัดเมื่อไม่มีค่า) · อัปเดต testMemberDataService (แสดง/ไม่แสดง 3 ฟิลด์) · ALL TESTS PASS 14/14
- [x] **[MT-29] ตัวตรวจรูปแบบวันที่ก่อนเขียน (Date Validator)** — อ้างอิง: data-dictionary.md (มาตรฐานการจัดเก็บวันที่) · `DataDict.isValidDateString`/`assertValidDateString` + เรียกอัตโนมัติใน `objectToRow`/`objectToRowByHeaders` → ปฏิเสธ `dd-mm-yyyy`/`mm/dd/yyyy`/`T`/`Z`/mixed (มีเวลาในคอลัมน์ date) พร้อม error ชี้ชื่อตาราง+คอลัมน์ · ยอมรับ `yyyy-mm-dd`/`yyyy-mm-dd HH:mm:ss`/ค่าว่าง/Date object · `testDateValidator` (10+ กรณี) · ALL TESTS PASS 14/14
- [x] **[MT-28] รองรับการสลับตำแหน่งฟิลด์ในตาราง (Header-driven)** — อ้างอิง: บทที่ 3.2.1, data-dictionary.md · `DataDict.rowToObjectByHeaders`/`objectToRowByHeaders` (map ตาม header จริง) + `SheetService.getHeaderRow`/`getHeaderMap`/`readRowsAsObjects` · refactor ทั้ง read/write path: `findByActivateCode`/`findByLineUserId`/`findAllByColumn`/`activateMember`/`logActivation` ใช้ header จริงแทน `getColumnIndex` (DataDict เหลือใช้สำหรับสร้างชีทใหม่ + ชื่อมาตรฐาน) · คอลัมน์จำเป็นหายไป → throw error ชัดเจน · `testColumnReordering` (สลับคอลัมน์ t_member_mast/t_savings_acct แล้วอ่าน/เขียนถูกต้อง) · ALL TESTS PASS 13/13
- [x] **[MT-27] ตารางข้อมูลตาม use case + dummy data** — อ้างอิง: บทที่ 7 ระยะ 2, data-dictionary.md · `DataDict.js` เพิ่ม 4 ตาราง (naming: lower case + `t_`): `t_savings_acct` (เงินฝาก/เช็คยอด) · `t_loan_acct` (ยอดหนี้) · `t_dividend` (ปันผล/หุ้น) · `t_activation_log` (audit trail) · `SeedData.js` (ใหม่): `createDummyTables()` (non-destructive) / `resetDummyTables()` / `getDummyRows()` (pure) · repository ขยาย: `findSavingsByMember`/`findLoansByMember`/`findDividendsByMember`/`logActivation` (SheetService.findAllByColumn) · `MemberDataService.buildFinanceText` แสดง**ข้อมูลจริง** (formatMoney) · EventHandler ดึงข้อมูลผ่าน repository · CI เพิ่ม Fake SpreadsheetApp (in-memory) + `testSeedData` + `testFinanceData` — ALL TESTS PASS 12/12 · หมายเหตุ: dummy ใช้ `MEM001–003` ต้องมีใน `t_member_mast` ถึงจะเห็นข้อมูล (บทที่ 5.6.4)
- [x] **[MT-26] หมุน Channel Access Token (SEC)** — อ้างอิง: บทที่ 5.5.1 (Runbook), ch-02 R1 · token รั่วจาก initial commit (2026-08-12) → ลบออกจากโค้ด + **purge ประวัติ git (filter-repo)** + CI กันซ้ำ 2 ชั้น (regex + gitleaks ตรวจเต็มรูปแบบ) · **ยืนยันครบ 3 ข้อแล้ว:** ① `checkTokenHealth()` → HTTP 200 ② token เก่า Deactivate แล้ว ③ Executions แสดง `reply success: 200` · เพิ่ม `checkTokenHealth()` ใน Test.js ใช้ตรวจรายเดือน
  > ⚠️ **หมายเหตุ:** purge ประวัติลบ token ได้แค่จาก repo กลางเท่านั้น — **ผู้ที่ clone repo ไปก่อน purge (12 ส.ค. 2026) ยังมี token อยู่ในประวัติเก่าของตัวเอง** การหมุน token (ทำแล้วในการ์ดนี้) คือทางแก้อันเดียวที่แก้การเปิดเผยได้จริง

---

## บันทึกการย้ายการ์ด (Change Log)

| วันที่ | การ์ด | จาก → ไป | หมายเหตุ |
|-------|-------|----------|----------|
| 2026-08-12 | MT-01 – MT-06b | → Done | งานระยะที่ 1 เสร็จ (สถานะตรงกับ README) |
| 2026-08-12 | MT-27 | → In Progress → Done | ตารางตาม use case + dummy data: DataDict 4 ตาราง + SeedData.js + repository ขยาย (findSavings/findLoans/findDividends/logActivation) + buildFinanceText แสดงข้อมูลจริง + Fake SpreadsheetApp ใน CI + testSeedData/testFinanceData · ALL TESTS PASS 12/12 · DoD ครบ |
| 2026-08-12 | MT-28 | → In Progress → Done | รองรับการสลับตำแหน่งฟิลด์: rowToObjectByHeaders/objectToRowByHeaders + getHeaderMap/readRowsAsObjects + refactor ทั้ง read/write path ใช้ header จริง + testColumnReordering · ALL TESTS PASS 13/13 · DoD ครบ |
| 2026-08-12 | MT-29 | → In Progress → Done | ตัวตรวจรูปแบบวันที่ก่อนเขียน: isValidDateString/assertValidDateString ใน DataDict + เรียกใน objectToRow/objectToRowByHeaders + testDateValidator · ALL TESTS PASS 14/14 · DoD ครบ |
| 2026-08-12 | MT-30 | → In Progress → Done | ยืนยันความหมาย mem_kk/mem_bk/mem_bh (คะแนนความดี/เงินกู้คงค้าง/เงินหุ้น) + label ภาษาไทยใน DataDict + แสดงใน buildProfileText (formatMoney + ซ่อนเมื่อไม่มีค่า) + testMemberDataService · ALL TESTS PASS 14/14 · DoD ครบ |
| 2026-08-12 | MT-31 | → In Progress → Done | เลเยอร์แปลงวันที่ชีท ↔ Firestore TIMESTAMP: Core/DateConverter.js (to/fromFirestoreTimestamp + helpers, UTC wall-clock, round-trip ตรงเป๊ะ) + testDateConverter · ALL TESTS PASS 15/15 · DoD ครบ |
| 2026-08-12 | MT-11 | → In Progress → Done | ตรวจวันหมดอายุอัตโนมัติ: Core.getExpiryStatus + ExpiryService (scan → push expiring/expired + unlink) + MessageService.push + EXPIRY_WARNING_DAYS + คำเตือนในคำตอบ + testExpiryStatus/testExpiryService · ALL TESTS PASS 17/17 · DoD ครบ |
| 2026-08-12 | MT-16 | → In Progress → Done | API Layer: ApiService/ApiRegistry/ApiHandlers/ApiResponse/ApiError (registry + envelope + 7 endpoints ใช้ Core/Repository) + testApiLayer · ALL TESTS PASS 18/18 · DoD ครบ |
| 2026-08-12 | MT-32 | → In Progress → Done | Audit log ตรวจหมดอายุ: DataDict t_expiry_log + SeedData 5 ตาราง + SheetService.appendExpiryLog/repo.logExpiry + ExpiryService log ทุกการตรวจ + testExpiryService ตรวจแถว log · ALL TESTS PASS 18/18 · DoD ครบ |
| 2026-08-12 | MT-12 | → In Progress → Done | Renew/ต่ออายุ: Core.computeRenewal (max(now, exp เดิม)+1 ปี) + RenewalService (performRenew/handleRenew — `renew:CODE`/`renew` ตัวเอง · เขียน mem_exp_dt + active + log renewed + ผูกเมนูกลับ) + API POST /api/member/renew + testRenewal/testApiLayer · ALL TESTS PASS 19/19 · DoD ครบ |
| 2026-08-12 | MT-13 | → In Progress → Done | Broadcast ประกาศ: DataDict t_notice + SeedData 6 ตาราง + Core.NoticeRules (pending/text/targets) + NoticeService.runNoticeBroadcast (push → mark sent กันส่งซ้ำ) + setupNoticeTrigger + repo.listNotices/markNoticeSent + testNoticeRules/testNoticeBroadcast · ALL TESTS PASS 21/21 · DoD ครบ |
| 2026-08-12 | MT-17 | → In Progress → Done | Bot เป็น UI Adapter: EventHandler เรียกข้อมูลสมาชิกผ่าน Api.ApiService (profile/savings/loans/dividends — ดึงเฉพาะตารางของเมนู) + mem_position_score ใน API profile + replyApiDataError + testBotUsesApi (spy API + fake reply — ข้อความเหมือนเดิม) · ALL TESTS PASS 22/22 · DoD ครบ |
| 2026-08-12 | MT-16b | → In Progress → Done | Mount API ใน WebApp: doGet/doPost แยก /api/* → Api.ApiService + API key (Config.API_KEY · query/body · health เปิดสาธารณะ) · webhook เดิมไม่แตะ · testApiMount (401/activate/profile/webhook) · ALL TESTS PASS 23/23 · DoD ครบ |
| 2026-08-12 | MT-27b | → In Progress → Done | เตรียมข้อมูลทดสอบ use case สมาชิก: `SeedData.createDummyMemberMaster()` (dev/test — t_member_mast MEM001–005: MEM001–003 activate ได้ด้วย ACT001–003 · MEM004 หมดอายุ · MEM005 staff · non-destructive) + top-level wrappers (createDummyTables/createDummyMemberMaster/seedAllForTesting/resetDummyTables ใน Editor) + testDummyMemberMaster (16 คอลัมน์/activate codes ไม่ซ้ำ/FK ตรงการเงิน) · ALL TESTS PASS 24/24 · DoD ครบ |
| 2026-08-12 | MT-08 | To Do → In Progress → Done | implement `webhook_secret` + ฟังก์ชัน HMAC; DoD ครบ 6 ข้อ (test ผ่าน, syntax ผ่าน, README ✅, เอกสารตรงโค้ด) |
| 2026-08-12 | MT-09 | To Do → In Progress → Done | Gate ตรวจสิทธิ์ (findByLineUserId + isActiveMember + บทบาท); ALL TESTS PASS; DoD ครบ 6 ข้อ |
| 2026-08-12 | MT-26 | → In Progress | หมุน token (SEC) — ตรวจพบ token hardcode ใน initial commit → ลบออกจากโค้ด + CI secret scan 2 ชั้นกันซ้ำ (regex + gitleaks) · รอผู้ดูแลหมุน token ใน LINE Console |
| 2026-08-12 | MT-26 | In Progress → Done | ยืนยันครบ 3 ข้อ (checkTokenHealth HTTP 200 / token เก่า Deactivate / Executions 200) · เพิ่ม purge ประวัติ git (filter-repo) + checkTokenHealth() · DoD ครบ |
| 2026-08-12 | MT-07 | → In Progress → Done | Welcome Menu + Per-User Gating: buildWelcomeTab + linkUser/unlinkUser + Gating (link หลัง Activate / unlink เมื่อไม่ valid) + Welcome เป็น default · testWelcomeMenu + gating logic (4 กรณี) ผ่าน · ALL TESTS PASS 6/6 · DoD ครบ |
| 2026-08-12 | MT-20 | → In Progress → Done | Repository Pattern: MemberRepository interface + factory (DB_TYPE) + SheetsMemberRepository ห่อ SheetService · ActivationService + Gate เรียกผ่าน repo · testMemberRepository ผ่าน · ALL TESTS PASS 7/7 · DoD ครบ |
| 2026-08-12 | MT-10 | → In Progress → Done | ดึงข้อมูลจริงตามเมนู: profile ข้อมูลจริง + เมนูการเงินตอบสถานะจริง (ตารางการเงินยังไม่มี — ออกแบบไว้ใน data-dictionary) · testMemberDataService ผ่าน · ALL TESTS PASS 8/8 · DoD ครบ |
| 2026-08-12 | MT-15 | → In Progress → Done | แยก Core: MemberRules + LoanCalculator (pure) · SheetService delegate · testCoreMemberRules + testLoanCalculator ผ่าน (แก้ expectation ตามพฤติกรรมจริงของสูตร HTML — งวด 1 = สิ้นเดือนเริ่ม) · ALL TESTS PASS 10/10 · DoD ครบ |
