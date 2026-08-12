# Kanban Board — MTLineCoopBot

> กระบวนการ: Document-Driven + Agile Kanban (บทที่ 8) · WIP Limit: 2–3 การ์ด
> วิธีใช้: ย้ายการ์ดระหว่างคอลัมน์ · อัปเดตป้ายสถานะใน [README](./README.md) เมื่อปิดงาน

---

## 📥 Backlog (งานรอทำ — ตาม Roadmap บทที่ 7)

### ระยะที่ 2 — การควบคุมสิทธิ์และข้อมูลจริง

- [ ] **[MT-07] Welcome Menu + Per-User Rich Menu Gating** — อ้างอิง: บทที่ 3.3.6 · เพิ่ม `buildWelcomeTab()`, `ApiService.linkUser/unlinkUser`, ตั้ง default
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
- [ ] **[MT-20] แยก Data Layer (Repository Pattern)** — `MemberRepository` interface + `SheetsMemberRepository` ห่อ `SheetService` — สลับฐานข้อมูลได้ด้วย factory จุดเดียว (บทที่ 3.2.4)
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

- [ ] **[MT-26] หมุน Channel Access Token (SEC)** — อ้างอิง: บทที่ 5.5.1 (Runbook), ch-02 R1 · ที่มา: token ถูก commit ใน initial commit (2026-08-12) → ลบออกจากโค้ด + **purge ประวัติ git แล้ว (filter-repo — token ถูกแทนด้วย `***REMOVED***` ในทุก commit, 2026-08-12)** + CI กันซ้ำ 2 ชั้น (regex + gitleaks ตรวจเต็มรูปแบบแล้ว)
  - **ขั้นตอนหมุน (Runbook 5.5.1):**
    - [ ] ① ออก token ใหม่ใน LINE Console
    - [ ] ② อัปเดต `CHANNEL_ACCESS_TOKEN` ใน Script Properties (ผ่าน UI เท่านั้น — ห้าม commit)
    - [ ] ③ ทดสอบ reply `200` — รัน `checkTokenHealth()` (Test.js) ต้องได้ `✅ HTTP 200`
    - [ ] ④ Deactivate token เก่าใน LINE Console
  - **การยืนยันก่อนปิดการ์ด (ต้องครบทั้ง 3):**
    - [ ] ✅ Token ใหม่ทำงาน — `checkTokenHealth()` ได้ HTTP 200 / LINE ตอบกลับปกติ
    - [ ] ✅ Token เก่าถูก Deactivate แล้ว
    - [ ] ✅ Executions log แสดง `reply success: 200`

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

---

## บันทึกการย้ายการ์ด (Change Log)

| วันที่ | การ์ด | จาก → ไป | หมายเหตุ |
|-------|-------|----------|----------|
| 2026-08-12 | MT-01 – MT-06b | → Done | งานระยะที่ 1 เสร็จ (สถานะตรงกับ README) |
| 2026-08-12 | MT-08 | To Do → In Progress → Done | implement `webhook_secret` + ฟังก์ชัน HMAC; DoD ครบ 6 ข้อ (test ผ่าน, syntax ผ่าน, README ✅, เอกสารตรงโค้ด) |
| 2026-08-12 | MT-09 | To Do → In Progress → Done | Gate ตรวจสิทธิ์ (findByLineUserId + isActiveMember + บทบาท); ALL TESTS PASS; DoD ครบ 6 ข้อ |
| 2026-08-12 | MT-26 | → In Progress | หมุน token (SEC) — ตรวจพบ token hardcode ใน initial commit → ลบออกจากโค้ด + CI secret scan 2 ชั้นกันซ้ำ (regex + gitleaks) · รอผู้ดูแลหมุน token ใน LINE Console |
