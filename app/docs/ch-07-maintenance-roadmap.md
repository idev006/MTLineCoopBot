# บทที่ 7 การบำรุงรักษาและการพัฒนาในอนาคต (Maintenance & Future Development)

## 7.1 การบำรุงรักษาระบบ (Maintenance)

### 7.1.1 งานบำรุงรักษาประจำวัน/สัปดาห์

| ความถี่ | งาน |
|---------|-----|
| รายวัน | ตรวจ Apps Script Executions ว่ามี error หรือไม่ |
| รายสัปดาห์ | ตรวจ Log ของ LINE webhook (`doPost`, `reply success/error`) |
| รายสัปดาห์ | ตรวจสอบข้อมูล Activate สมาชิกใน Google Sheets ว่าสอดคล้องกับ LINE |
| รายเดือน | ทบทวนสิทธิ์การเข้าถึง Google Sheets/Drive และ Script Properties |

### 7.1.2 งานบำรุงรักษาเมื่อมีการเปลี่ยนแปลง

| เหตุการณ์ | ขั้นตอน |
|-----------|---------|
| แก้โค้ด webhook | `clasp push` → Deploy Web App version ใหม่ |
| แก้เมนู/พิกัด Rich Menu | แก้ `MenuData.js` → รัน `main()` |
| เปลี่ยนภาพ Rich Menu | อัปโหลดภาพใหม่ที่ Drive → เปลี่ยน File ID ใน `Config.js` → รัน `main()` |
| เปลี่ยน Channel Access Token | ตั้งค่า Script Properties ใหม่ → ทดสอบ reply |
| เพิ่มข้อมูลสมาชิกใหม่ | เพิ่มแถวใน `t_member_mast` พร้อม `activate_code` ที่ unique |

### 7.1.3 การเฝ้าระวังความปลอดภัย

- [ ] **หมุน (Rotate) Channel Access Token** ตามนโยบายหรือเมื่อสงสัยว่ารั่วไหล — ดู Runbook บทที่ 5.5.1 · ติดตามผ่านการ์ด **[MT-26] ใน KANBAN.md** (✅ ปิดแล้ว 2026-08-12)
- [ ] **การเปิดเผยซ้ำจาก clone เก่า** — purge ประวัติ (filter-repo) ลบ token ได้แค่จาก repo กลาง · ผู้ที่ clone repo ก่อน purge ยังมี token ในประวัติเก่า → **การหมุน token เท่านั้นที่แก้การเปิดเผยได้จริง** (ทำแล้วใน MT-26 — อย่าลืมเตือนสมาชิกทีมที่ clone ไปแล้วให้ pull ประวัติใหม่)
- [ ] **ตรวจสุขภาพ token รายเดือน** — รัน `checkTokenHealth()` ใน Apps Script Editor (Test.js) ต้องได้ `✅ HTTP 200` — ถ้า `401` หมุน token ตาม Runbook 5.5.1
- [ ] ตรวจสอบว่าไม่มีการ commit token/secret ลง Git — CI secret scan 2 ชั้น (regex ใน `scripts/ci-test.js` + **gitleaks** ตาม `.gitleaks.toml`) จะ fail ถ้าพบ (บทที่ 8.1.3)
- [ ] ตรวจสอบ `X-Line-Signature` ทุก request เพื่อยืนยันว่า Webhook มาจาก LINE จริง (ขั้นตอนบังคับ — บทที่ 3.6) · หมายเหตุ: Apps Script อ่าน header ไม่ได้ (Issue #67764685) — ใช้ `webhook_secret` ผูกท้าย URL
- [ ] ทบทวนสิทธิ์การเข้าถึง Google Sheets/Drive และ Script Properties รายเดือน (ใครเข้าถึงได้บ้าง สิทธิ์ยังจำเป็นไหม)

## 7.2 แผนการพัฒนาในอนาคต (Roadmap)

### ระยะที่ 1 — พื้นฐาน (ปัจจุบัน)

- ✅ Rich Menu 5 แท็บ + Alias
- ✅ Flex Message ตอบกลับเมื่อคลิกเมนู
- ✅ ระบบ Activate สมาชิก (`activate:CODE`)
- ✅ โครงสร้างข้อมูลกลาง (DataDict / `t_member_mast`)
- ✅ เครื่องคำนวณสินเชื่อ Actual/365

### ระยะที่ 2 — การควบคุมสิทธิ์และข้อมูลจริง (แนะนำลำดับถัดไป)

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| ~~ควบคุมเมนูตามสิทธิ์ (Per-User Rich Menu)~~ | ✅ ทำแล้ว — Welcome Menu default + `linkMemberMenu` หลัง Activate + `unlinkMemberMenu` เมื่อหมดอายุ (บทที่ 3.3.6, การ์ด MT-07) |
| ~~ตรวจสอบ X-Line-Signature~~ | ✅ ทำแล้ว — `verifyWebhookSecret` (URL token) + ฟังก์ชัน HMAC พร้อมใช้ (บทที่ 3.6, การ์ด MT-08) |
| ~~Gate ตรวจสิทธิ์ใน EventHandler~~ | ✅ ทำแล้ว — `findByLineUserId` + `isActiveMember`/`hasRole` (บทที่ 3.7, การ์ด MT-09) |
| ~~ดึงข้อมูลสมาชิกจริงตามเมนู~~ | ✅ ทำแล้ว — profile แสดงข้อมูลจริงจาก `t_member_mast` (การ์ด MT-10) · **เมนูการเงินแสดงข้อมูลจริง** จาก `t_savings_acct` / `t_loan_acct` / `t_dividend` (การ์ด MT-27 — ข้อมูลตัวอย่างผ่าน `SeedData` บทที่ 5.6.4) · ถ้าไม่มีข้อมูลตอบ "ไม่พบข้อมูล" (ไม่ปลอมตัวเลข) · เหลือ: แทนที่ dummy ด้วยข้อมูลจริงจากระบบบัญชีสหกรณ์ 📌 |
| ~~ตรวจสอบวันหมดอายุสมาชิก~~ | ✅ ทำแล้ว (การ์ด MT-11/MT-32) — `Core.MemberRules.getExpiryStatus` (expired/expiring/valid + daysLeft) · `LineBot.ExpiryService.runExpiryCheck` (Time-driven Trigger รายวัน): push เตือนก่อนหมดอายุ (≤ `EXPIRY_WARNING_DAYS`) / แจ้ง expired + unlink เมนู · **ทุกการตรวจบันทึก audit trail ลง `t_expiry_log`** (MT-32) · ตอบกลับแนบคำเตือนเมื่อใกล้หมด · ตั้ง trigger ตามบทที่ 5.9 |
| ~~Renew / ต่ออายุสมาชิก~~ | ✅ ทำแล้ว (การ์ด MT-12) — คำสั่ง `renew:CODE` หรือ `renew` (ต่ออายุตัวเอง) · `Core.MemberRules.computeRenewal`: ใหม่ = max(now, exp เดิม) + 1 ปี · `RenewalService.performRenew/handleRenew` (เขียน `mem_exp_dt` + ตั้ง active + ผูกเมนูกลับ + log `renewed` ใน t_activation_log) · API `POST /api/member/renew` · เหลือ: ต่ออายุโดยเจ้าหน้าที่ (staff/admin — เฟส 3) |
| ~~แจ้งเตือนตามเวลา (Broadcast ประกาศ)~~ | ✅ ทำแล้ว (การ์ด MT-13) — ตาราง `t_notice` (notice_id/title/message/published_dt/sent_dt/status) · `Core.NoticeRules` (pure: `getPendingNotices` — published + ยังไม่ส่ง + ถึงเวลา / `buildNoticeText` / `getBroadcastTargets` — active + มี userId) · `LineBot.NoticeService.runNoticeBroadcast` (Time-driven Trigger รายวัน): push ประกาศถึงสมาชิก active ทุกคน → mark `sent_dt` + `status='sent'` (กันส่งซ้ำ) · `setupNoticeTrigger(h)` + ฟังก์ชันระดับบนสุด `runNoticeBroadcast()` · เหลือ: เตือนชำระตามข้อมูลจริง (ผูกกับ t_loan_acct — เฟส 2.5) 📌 |
| ปรับปรุงข้อความตอบกลับ | แทนที่ Placeholder ใน `ReplyStore` ด้วยข้อมูลจากฐานข้อมูล |

### ระยะที่ 3 — สถาปัตยกรรม API-First และ LIFF

**เป้าหมาย:** เปลี่ยนจาก Bot-centric เป็น API-First เพื่อรองรับหลาย UI (สถาปัตยกรรมในบทที่ 3.1.1)

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| ~~แยก Core Business Logic~~ | ✅ ทำแล้ว — `Core/MemberRules.js` (validity/role — delegate จาก SheetService) + `Core/LoanCalculator.js` (Actual/365) + unit tests ใน node (การ์ด MT-15) · เหลือ: เชื่อม Bot/LIFF ใช้ Core เดียวกัน |
| ~~API Layer (Router + Responder)~~ | ✅ ทำแล้ว (การ์ด MT-16) — `app/Api/`: ApiService → ApiRegistry (ตาราง route) → ApiHandlers (ใช้ Core + Repository) → ApiResponse (envelope `{ok, error, data}`) · 8 endpoints (health/profile/savings/loans/dividends/validity/activate/renew — renew เพิ่มในการ์ด MT-12) · ✅ Bot เรียกผ่าน API แล้ว (การ์ด MT-17) · เหลือ: Auth per-channel + Mount ใน WebApp (การ์ด MT-18–19) |
| ~~LINE Bot เป็น UI Adapter~~ | ✅ ทำแล้ว (การ์ด MT-17) — `EventHandler` เรียกข้อมูลสมาชิก (profile/savings/loans/dividends) ผ่าน `Api.ApiService.handleRequest` (endpoint เดียวกับ UI อื่น ๆ) · Gate (auth) ยังตรวจที่ `getAuthorizedMember` · จัดรูปแบบข้อความ (MemberDataService) ยังอยู่ใน UI layer · เพิ่ม `mem_position_score` ใน API profile (ครบทุกฟิลด์ที่ buildProfileText ใช้) · `testBotUsesApi` (postback → API → ข้อความเหมือนเดิม) |
| LIFF (LINE Frontend Framework) | เปิดฟอร์ม/ตารางภายใน LINE แทนการเปิดเว็บภายนอก ใช้ LINE Login ยืนยันตัวตน |
| ตรวจสอบ ID Token (JWT) | ตรวจสอบ ID token จาก LIFF ด้วย Channel Secret ก่อนเชื่อถือ `sub` = userId (บทที่ 3.1.1) |
| รองรับหลาย UI | Admin Dashboard / แอปมือถือในอนาคต เรียกใช้ API เดียวกัน |
| ~~แยก Data Layer (Repository Pattern)~~ | ✅ ทำแล้ว — `MemberRepository` interface + `SheetsMemberRepository` ห่อ `SheetService` + factory ตาม `DB_TYPE` (การ์ด MT-20) · เหลือ Firestore implementation 📌 |

### ระยะที่ 4 — ขั้นสูง

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| การยื่นคำขอกู้แบบดิจิทัล (LIFF) | ฟอร์มกรอก + บันทึกคำขอลง Sheets พร้อมสถานะติดตาม |
| Notification / Broadcast | ส่งข้อความแบบ Push ถึงสมาชิกตามกลุ่ม/เงื่อนไข (ควบคุมด้วยตารางสิทธิ์ตามบทบาท) |
| Dashboard สำหรับเจ้าหน้าที่ | Web App (UI Adapter) จัดการข้อมูลสมาชิกและคำขอผ่าน API |
| เชื่อมต่อระบบบัญชีกลาง | API กับ Core Banking ของสหกรณ์ (ถ้ามี) |

## 7.3 แนวทางการขยายระบบ (Extensibility)

### 7.3.1 เพิ่มเมนู/แท็บ

- เพิ่ม `TAB_6_MENUS` และ `buildTab6()` ใน `MenuData.js`
- เพิ่ม Alias และภาพใหม่ใน `Config.js`
- เพิ่ม caption ใน `ReplyStore.js`
- รัน `main()`

### 7.3.2 เพิ่มตารางข้อมูล

- เพิ่มคำนิยามใน `DataDict.TABLES`
- ใช้ `SheetService.getSheet()` — สร้าง sheet/header อัตโนมัติ

### 7.3.3 เพิ่มคำสั่งข้อความ

- เพิ่มเงื่อนไข `text.startsWith(...)` ใน `EventHandler.handleTextMessage`
- สร้าง service ใหม่ใน namespace `LineBot` ตาม pattern เดิม

## 7.4 ข้อเสนอแนะเชิงบริหาร (Management Recommendations)

1. **จัดทำนโยบายการจัดการ Token** — ห้าม hardcode ในซอร์ส ใช้ Script Properties + rotation ตามรอบ
2. **กำหนดผู้รับผิดชอบ** — แบ่งบทบาท Admin (ดูแล LINE Console/Sheets) และ Developer (ดูแลโค้ด/deploy)
3. **จัดทำคู่มือสมาชิก** — แจกจ่ายวิธีการใช้เมนูและคำสั่ง activate ให้สมาชิก
4. **ติดตามตัวชี้วัด (KPI)** — จำนวนสมาชิกที่ activate, จำนวนการใช้งานเมนู, อัตราความสำเร็จของ reply
5. **กำหนดรอบทบทวนระบบ** — ทุก 6 เดือน ตรวจสอบ feature, ความปลอดภัย และความต้องการใหม่

## สรุปท้ายบท

ระบบ MTLineCoopBot พร้อมใช้งานในระยะที่ 1 และมีสถาปัตยกรรมที่ออกแบบไว้รองรับการขยายในระยะที่ 2–3 ได้โดยตรง การบำรุงรักษาที่เป็นระบบและการวาง Roadmap ที่ชัดเจนจะช่วยให้ระบบเติบโตไปพร้อมกับความต้องการของสหกรณ์และสมาชิกอย่างยั่งยืน
