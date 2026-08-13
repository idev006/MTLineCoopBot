# Foundation Readiness Checklist

> ตรวจสอบความพร้อมของรากฐานระบบ: ทุกเสาหลักต้องมี **หลักฐานการทดสอบ** ที่รันได้
> สัญลักษณ์: ✅ = มีโค้ด + หลักฐานทดสอบ · 🧪 = รันใน CI อัตโนมัติ · ✋ = รันด้วยมือ (ต้อง environment จริง)

## เมทริกซ์ เสาหลัก ↔ หลักฐานการทดสอบ

| # | เสาหลัก (Pillar) | ที่อยู่ (Where) | หลักฐานการทดสอบ (Test Evidence) | รัน | สถานะ |
|---|------------------|-----------------|----------------------------------|-----|--------|
| 1 | **Document-Driven** — เอกสารเป็นสัญญา โค้ดตามเอกสาร (DoD 6 ข้อ) | บทที่ 8 · KANBAN.md | ทุกการ์ด Done มีบันทึก DoD ครบใน KANBAN Change Log | ✋ | ✅ |
| 2 | **SSOT โครงสร้างข้อมูล** — DataDict จุดเดียว · 16 คอลัมน์ + 8 ตาราง (ข้อมูล + audit + ประกาศ + เตือนชำระ + เนื้อหา) | `DataDict.js` | `testSeedData` (dummy rows ตรง DataDict 8 ตาราง) · `testMemberDataService` (profile อ่านฟิลด์จริง) | 🧪 | ✅ |
| 3 | **SSOT เมนู (Item-ID Contract)** — MenuData ↔ ReplyStore.CAPTIONS ตรงกัน | `MenuData.js` / `ReplyStore.js` | `verifyMenuContract` (25 postback + 1 uri) · `verifyThaiCaptions` · `testWelcomeMenu` (4 เมนู) | 🧪 | ✅ |
| 4 | **Repository Pattern** — สลับ DB ได้ (`DB_TYPE`), SpreadsheetApp จำกัดใน layer เดียว | `Data/MemberRepository.js` + `SheetsMemberRepository.js` | `testMemberRepository` (interface + `assertImplemented` + factory switch — `firestore` throw ชัดเจน) | 🧪 | ✅ (Firestore 📌 เฟส 3) |
| 5 | **Header-driven** — สลับตำแหน่งคอลัมน์ในชีทได้ | `SheetService.getHeaderMap/readRowsAsObjects` + `DataDict.rowToObjectByHeaders` | `testColumnReordering` (สลับคอลัมน์ t_member_mast/t_savings_acct → อ่าน/เขียนยังถูก) | 🧪 | ✅ |
| 6 | **มาตรฐานวันที่** — text `yyyy-mm-dd` / `yyyy-mm-dd HH:mm:ss` + validator ก่อนเขียน | data-dictionary.md · `DataDict.isValidDateString/assertValidDateString` | `testDateValidator` (ปฏิเสธ dd-mm-yyyy/T/Z/mixed · ยอมรับ yyyy-mm-dd) | 🧪 | ✅ |
| 7 | **แปลงวันที่ ↔ Firestore** (เฟส 3) — round-trip ตรงเป๊ะ | `Core/DateConverter.js` | `testDateConverter` (Date/{seconds,nanos}/RFC3339 input · round-trip · ขอบเขตปี) | 🧪 | ✅ (Core พร้อมใช้) |
| 8 | **Core pure functions** — เทสต์ใน node ไม่ต้อง mock | `Core/MemberRules.js` + `Core/LoanCalculator.js` | `testCoreMemberRules` (10 กรณี deterministic) · `testLoanCalculator` (Actual/365 schedule) | 🧪 | ✅ |
| 9 | **API Layer + Bot Adapter + Mount** (เฟส 3) — registry + envelope `{ok,error,data}` · Bot เรียกผ่าน API เดียวกัน (reads + commands) · `doGet`/`doPost` dispatch `/api/*` + API key | `app/Api/` (5 ไฟล์) + `EventHandler.apiGet` + `ActivationService`/`RenewalService` + `WebApp.dispatchApi` | `testApiLayer` (8 endpoints + error codes + envelope shape) · `testBotUsesApi` (spy ApiService — postback → API → ข้อความเหมือนเดิม) · `testActivateViaApi` (spy ApiService — activate ผ่าน POST /api/member/activate · welcome flex + ผูกเมนูที่ Bot · ข้อความ error เดิม) · `testApiMount` (health public / 401 ไม่มี key / activate+profile ผ่าน mount / webhook เดิมไม่เปลี่ยน) · `testRenewal` (ผ่าน API — seam `ctx.internal.now` deterministic) | 🧪 | ✅ (Auth per-channel 📌 เฟส 3) |
| 10 | **Activate สมาชิก** — `activate:CODE` ผ่าน repository | `LineBot/ActivationService.js` + repository | `testApiLayer` activate case (สำเร็จ/ซ้ำ ALREADY_ACTIVATED/รหัสผิด) · `testMemberRepository` | 🧪 | ✅ |
| 11 | **Gate ตรวจสิทธิ์** — findByLineUserId + isActiveMember + บทบาท | `EventHandler.getAuthorizedMember` + `Core.MemberRules` | `testMemberValidity` (ช่วงวัน/สถานะ/บทบาท/fail-safe) · `testExpiryStatus` | 🧪 | ✅ |
| 12 | **Per-User Rich Menu Gating** — Welcome default + link/unlink | `RichMenu/Gating.js` + `MenuData.buildWelcomeTab` | `testWelcomeMenu` (โครงสร้าง + captions + replies) · Gating logic (manual test 4 กรณี — เอกสาร MT-07) | 🧪 | ✅ |
| 13 | **วันหมดอายุอัตโนมัติ** — scan + push + unlink + คำเตือนในคำตอบ + **audit log ทุกการตรวจ** | `LineBot/ExpiryService.js` + `Core.MemberRules.getExpiryStatus` + `t_expiry_log` | `testExpiryStatus` (valid/expiring/expired + daysLeft) · `testExpiryService` (scan→push/unlink + **ตรวจแถว t_expiry_log**: 1 แถว/สมาชิก ถูกต้อง) | 🧪 | ✅ (ต้องตั้ง trigger — บทที่ 5.9) |
| 14 | **ต่ออายุสมาชิก** — `renew:CODE` / `renew` ขยาย `mem_exp_dt` +1 ปี + log `renewed` + ผูกเมนูกลับ | `Core/MemberRules.computeRenewal` + `LineBot/RenewalService.js` + repository `renewMember` | `testRenewal` (ต่อจาก exp เดิม/วันนี้ · รหัส/ตัวเอง · เขียนชีท · active · log renewed) · `testApiLayer` renew case · `testAlertConfirmCards` (ต่ออายุ 2 ขั้น — confirmCard → confirm_renew → alertCard) | 🧪 | ✅ |
| 15 | **แจ้งเตือนตามเวลา** — Broadcast ประกาศ (`t_notice`) + เตือนชำระรายบุคคล (`t_loan_acct`) + audit trail — **push เป็น Flex Card** (`noticeCard`/`loanReminderCard` — การ์ด MT-36) | `LineBot/NoticeService.js` + `LineBot/LoanReminderService.js` + `Core/NoticeRules.js` + `Core/LoanRules.js` + `FlexBuilder.noticeCard/loanReminderCard` + `MessageService.pushFlex` | `testNoticeRules`/`testNoticeBroadcast` (pending filter · broadcast การ์ด · mark sent · ไม่ส่งซ้ำ) · `testLoanRules`/`testLoanReminders` (due filter · การ์ดรายบุคคล · skipped · ตรวจ t_reminder_log) · `testNoticeLoanCards` (โครงสร้าง 2 การ์ด) | 🧪 | ✅ (ต้องตั้ง trigger — บทที่ 5.9.2/5.9.3) |
| 16 | **ข้อมูลการเงินจริง** — t_savings_acct/t_loan_acct/t_dividend + dummy | `MemberDataService.buildFinanceText` + repository | `testFinanceData` (seed→repository→buildFinanceText ข้อมูลจริง ไม่ปลอม) · `testSeedData` | 🧪 | ✅ (dummy; ข้อมูลจริง 📌) |
| 17 | **Webhook Auth** — webhook_secret (URL) + HMAC-SHA256 พร้อมใช้ | `Util.verifyWebhookSecret/verifyLineSignature` + WebApp.doPost | `testVerifyLineSignature` (6 test vectors) · `testVerifyWebhookSecret` | 🧪 | ✅ (X-Line-Signature จำกัด Apps Script) |
| 18 | **CI อัตโนมัติ** — syntax + contract tests + secret scan 2 ชั้น | `.github/workflows/ci.yml` + `scripts/ci-test.js` + `.gitleaks.toml` | ทุก push ขึ้น `main`: `node --check` (36 ไฟล์ .js) + **34/34 tests** + regex scan + **gitleaks** (ประวัติเต็ม) | 🧪 | ✅ |
| 19 | **Security: token** — ไม่ hardcode + หมุนได้ + ตรวจสุขภาพ | Script Properties + `Config` + `Test.checkTokenHealth` | `checkTokenHealth` (LINE Get Bot Info — รายงาน 200/401) · secret-scan ใน CI (regex + gitleaks) | ✋ (รายเดือน) | ✅ |
| 20 | **Security: กระบวนการ** — Runbook + Incident response + audit trail | SECURITY.md · ch-05 5.5.1 · KANBAN MT-26 | ประวัติ purge (filter-repo) + allowlist ลบแล้ว + audit trail `t_activation_log` / `t_expiry_log` (dummy) | ✋ | ✅ |
| 21 | **Flex Component Standard + การ์ดข้อมูล** — design tokens SSOT (FlexTheme) + แคตตาล็อก 3 ชั้น (atoms/molecules/templates) + **ไม่ hardcode สี** + **ห้าม raw flex object นอก FlexBuilder** · profile/การเงิน/ผลลัพธ์/ประกาศ/เตือนชำระ/**เนื้อหาเมนูข้อมูล**ตอบ **Flex Card** ข้อมูลเหมือนเดิม | `LineBot/FlexTheme.js` + `FlexBuilder.js` (atoms/molecules/bubbleFrame + `profileCard`/`financeCard`/`alertCard`/`confirmCard`/`noticeCard`/`loanReminderCard`/`contentCard`) + `MemberDataService.buildFinanceCardData` + `MessageService.pushFlex` | `testFlexComponents` (tokens/atoms/molecules/frame/templates — payload เหมือนเดิม) · **`flex-theme-scan`** (CI scan FlexBuilder.js ไม่ให้มี hex color) · **`flex-usage-scan`** (CI scan ไม่ให้มี `type:'flex'`/`'bubble'` นอก FlexBuilder.js — บทที่ 3.4) · `testFinanceCards` (การ์ดข้อมูลครบเหมือน text + noData ไม่ปลอมตัวเลข + EventHandler ตอบการ์ดผ่าน API) · `testAlertConfirmCards` (alertCard 3 ระดับ + confirmCard + ต่ออายุ 2 ขั้น) · `testNoticeLoanCards` (noticeCard/loanReminderCard ข้อมูลครบเหมือน text) · `testContentCards` (contentCard โครงสร้างตามมาตรฐาน + replyContentItem ตอบการ์ด + fallback text) | 🧪 | ✅ |

## วิธีรันหลักฐานทั้งหมด

```bash
# 1) ชุดทดสอบสัญญา 34 ชุด (รันใน CI อัตโนมัติทุก push)
node scripts/ci-test.js          # → ALL TESTS PASS (34/34)

# 2) syntax ทุกไฟล์ JS (36 ไฟล์)
for f in $(find app scripts -name "*.js"); do node --check "$f"; done

# 3) secret scan — ประวัติ git เต็มรูปแบบ (CI รัน gitleaks job)
gitleaks detect --source . --config .gitleaks.toml   # → no leaks found

# 4) รันด้วยมือใน Apps Script Editor (ต้อง environment จริง)
checkTokenHealth()               # ตรวจ token (รายเดือน — ch-07 7.1.3)
verifyMenuContract()             # ตรวจ item-id ก่อน Deploy Rich Menu (TC-12)
createDummyTables()              # สร้างตาราง + dummy data (บทที่ 5.6.4)
setupExpiryTrigger(9)            # ตั้ง trigger ตรวจวันหมดอายุ (บทที่ 5.9)
setupNoticeTrigger(9)            # ตั้ง trigger broadcast ประกาศ (บทที่ 5.9.2)
```

## สรุปความพร้อม

- **21/21 เสาหลักผ่าน** — 18 ข้อมีหลักฐานรันใน **CI อัตโนมัติ** (🧪) · 3 ข้อต้องรันด้วยมือ (✋: DoD review, checkTokenHealth, process security)
- **34/34 ชุดทดสอบสัญญาผ่าน** — รวม `testNoticeLoanCards` (การ์ดประกาศ/เตือนชำระ — การ์ด MT-36) + `testContentCards` (การ์ดเนื้อหาเมนูข้อมูล — การ์ด MT-37)
- **ทุกเสาหลักพร้อมต่อยอด** — จุดที่ออกแบบไว้แต่ยังไม่ implement ระบุชัดเจนในคอลัมน์สถานะ (📌 เฟส 3)
- **กฎ:** ถ้าเพิ่ม/แก้เสาหลักใด ต้องอัปเดตตารางนี้ + หลักฐานการทดสอบด้วย (DoD ข้อ 3 — บทที่ 8.1.3)
