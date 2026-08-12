# Kanban Board — MTLineCoopBot

> กระบวนการ: Document-Driven + Agile Kanban (บทที่ 8) · WIP Limit: 2–3 การ์ด
> วิธีใช้: ย้ายการ์ดระหว่างคอลัมน์ · อัปเดตป้ายสถานะใน [README](./README.md) เมื่อปิดงาน

---

## 📥 Backlog (งานรอทำ — ตาม Roadmap บทที่ 7)

### ระยะที่ 2 — การควบคุมสิทธิ์และข้อมูลจริง

- [ ] **[MT-10] ดึงข้อมูลจริงตามเมนู** — อ้างอิง: บทที่ 7 ระยะ 2 · ยอดเงินฝาก/หนี้/ปันผลจาก `t_member_mast`
- [ ] **[MT-11] ตรวจสอบวันหมดอายุ** — ตอบกลับ/แจ้งเตือนเมื่อ `mem_exp_dt` ใกล้หมด
- [ ] **[MT-12] Renew / ต่ออายุสมาชิก** — คำสั่ง/trigger ต่ออายุ `mem_exp_dt`
- [ ] **[MT-13] แจ้งเตือนตามเวลา** — Time-driven Trigger ส่งข่าว/เตือนชำระ
- [ ] **[MT-14] ปรับปรุงข้อความตอบกลับ** — แทนที่ Placeholder ใน ReplyStore ด้วยข้อมูลจริง

### ระยะที่ 3 — สถาปัตยกรรม API-First และ LIFF

- [ ] **[MT-15] แยก Core Business Logic** — อ้างอิง: บทที่ 3.1.1 · ย้าย validity/role/loan calc เป็น pure functions ใน `app/Core/` + unit tests
- [ ] **[MT-16] API Layer (Router + Responder)** — `app/Api/` registry routing + JSON envelope `{ok, error, data}`
- [ ] **[MT-17] LINE Bot เป็น UI Adapter** — ให้ Bot เรียกผ่าน API เดียวกัน (พฤติกรรมผู้ใช้ไม่เปลี่ยน)
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
- [x] **[MT-04] DataDict SSOT (13 คอลัมน์)** — บทที่ 3.2 · รวม `mem_role`
- [x] **[MT-05] ฟังก์ชันตรวจสอบสมาชิก** — `isActiveMember`/`hasRole`/`parseDate` (SheetService)
- [x] **[MT-06] Contract Test (Item ID)** — บทที่ 3.3.7, TC-12 · `Test.js` + `MenuData.listItemIds()`
- [x] **[MT-06b] เครื่องคำนวณสินเชื่อ Actual/365** — GitHub Pages (ยังรอรวมเข้ากับ LoanService เฟส 3)
- [x] **[MT-08] ตรวจสอบความถูกต้องของ Webhook** — บทที่ 3.6, 5.5 · `Util.verifyWebhookSecret` + `Util.verifyLineSignature` + guard ใน `doPost` + test ใน Test.js · หมายเหตุ: Apps Script อ่าน header ไม่ได้ จึงใช้ `webhook_secret` ผูกท้าย URL (Issue #67764685)
- [x] **[MT-09] Gate ตรวจสิทธิ์ใน EventHandler** — บทที่ 3.7, 6 TC-10 · `SheetService.findByLineUserId` + `getAuthorizedMember` (isActiveMember + บทบาท) ใน `EventHandler` ยกเว้น `activate:` + `testMemberValidity`
- [x] **[MT-20] แยก Data Layer (Repository Pattern)** — อ้างอิง: บทที่ 3.2.4 · `Data/MemberRepository.js` (interface + `assertImplemented` + `getRepository()` ตาม `Config.DB_TYPE`) + `Data/SheetsMemberRepository.js` ห่อ `SheetService` (5 ฟังก์ชัน) · `ActivationService` + Gate ใน `EventHandler` เรียกผ่าน repository แล้ว · `testMemberRepository` (interface + factory switch) · หมายเหตุ: `DB_TYPE=firestore` ยังไม่ implement — factory throw ชัดเจน (เฟส 3)
- [x] **[MT-07] Welcome Menu + Per-User Rich Menu Gating** — อ้างอิง: บทที่ 3.3.6 · `MenuData.buildWelcomeTab()` (4 ปุ่ม: เปิดใช้งาน/วิธีใช้/ติดต่อ/ข่าวสาร) + `ApiService.linkUser`/`unlinkUser`/`getRichMenuIdByAlias`/`getUserRichMenu` + `RichMenu.Gating` (link หลัง Activate / unlink เมื่อไม่ valid) + `Deployer.deploy()` ตั้ง **Welcome เป็น default** + EventHandler ตอบ welcome items (ไม่ผ่าน Gate) + `testWelcomeMenu` (CI 6/6) · หมายเหตุ: ภาพ Welcome ใส่ File ID ใน `Config.IMAGE_FILE_IDS.WELCOME` (ว่าง = ข้ามอัปโหลด)
- [x] **[MT-26] หมุน Channel Access Token (SEC)** — อ้างอิง: บทที่ 5.5.1 (Runbook), ch-02 R1 · token รั่วจาก initial commit (2026-08-12) → ลบออกจากโค้ด + **purge ประวัติ git (filter-repo)** + CI กันซ้ำ 2 ชั้น (regex + gitleaks ตรวจเต็มรูปแบบ) · **ยืนยันครบ 3 ข้อแล้ว:** ① `checkTokenHealth()` → HTTP 200 ② token เก่า Deactivate แล้ว ③ Executions แสดง `reply success: 200` · เพิ่ม `checkTokenHealth()` ใน Test.js ใช้ตรวจรายเดือน
  > ⚠️ **หมายเหตุ:** purge ประวัติลบ token ได้แค่จาก repo กลางเท่านั้น — **ผู้ที่ clone repo ไปก่อน purge (12 ส.ค. 2026) ยังมี token อยู่ในประวัติเก่าของตัวเอง** การหมุน token (ทำแล้วในการ์ดนี้) คือทางแก้อันเดียวที่แก้การเปิดเผยได้จริง

---

## บันทึกการย้ายการ์ด (Change Log)

| วันที่ | การ์ด | จาก → ไป | หมายเหตุ |
|-------|-------|----------|----------|
| 2026-08-12 | MT-01 – MT-06b | → Done | งานระยะที่ 1 เสร็จ (สถานะตรงกับ README) |
| 2026-08-12 | MT-08 | To Do → In Progress → Done | implement `webhook_secret` + ฟังก์ชัน HMAC; DoD ครบ 6 ข้อ (test ผ่าน, syntax ผ่าน, README ✅, เอกสารตรงโค้ด) |
| 2026-08-12 | MT-09 | To Do → In Progress → Done | Gate ตรวจสิทธิ์ (findByLineUserId + isActiveMember + บทบาท); ALL TESTS PASS; DoD ครบ 6 ข้อ |
| 2026-08-12 | MT-26 | → In Progress | หมุน token (SEC) — ตรวจพบ token hardcode ใน initial commit → ลบออกจากโค้ด + CI secret scan 2 ชั้นกันซ้ำ (regex + gitleaks) · รอผู้ดูแลหมุน token ใน LINE Console |
| 2026-08-12 | MT-26 | In Progress → Done | ยืนยันครบ 3 ข้อ (checkTokenHealth HTTP 200 / token เก่า Deactivate / Executions 200) · เพิ่ม purge ประวัติ git (filter-repo) + checkTokenHealth() · DoD ครบ |
| 2026-08-12 | MT-07 | → In Progress → Done | Welcome Menu + Per-User Gating: buildWelcomeTab + linkUser/unlinkUser + Gating (link หลัง Activate / unlink เมื่อไม่ valid) + Welcome เป็น default · testWelcomeMenu + gating logic (4 กรณี) ผ่าน · ALL TESTS PASS 6/6 · DoD ครบ |
| 2026-08-12 | MT-20 | → In Progress → Done | Repository Pattern: MemberRepository interface + factory (DB_TYPE) + SheetsMemberRepository ห่อ SheetService · ActivationService + Gate เรียกผ่าน repo · testMemberRepository ผ่าน · ALL TESTS PASS 7/7 · DoD ครบ |
