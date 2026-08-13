# บทที่ 6 การทดสอบระบบ (System Testing)

## 6.1 กลยุทธ์การทดสอบ (Testing Strategy)

การทดสอบแบ่งเป็น 3 ระดับ

| ระดับ | ขอบเขต | เครื่องมือ/วิธี |
|-------|--------|---------------|
| Unit Test | ทดสอบฟังก์ชันย่อย เช่น `parseQueryString`, `calcBounds`, `getCaption` | ฟังก์ชันทดสอบใน Apps Script + `Logger.log` |
| Integration Test | ทดสอบการทำงานร่วมระหว่างโมดูล เช่น การ Activate สมาชิกทั้ง Flow | จำลองการเรียก Service โดยตรง + ตรวจข้อมูลใน Sheets |
| End-to-End Test | ทดสอบผ่าน LINE จริง (คลิกเมนู, พิมพ์คำสั่ง) | LINE Application + Apps Script Executions Log |

## 6.2 Test Cases หลัก

### 6.2.1 TC-01: รับ Webhook และตอบกลับ

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ตรวจว่า LINE webhook เรียก `doPost` ได้และตอบ `{status:'ok'}` |
| ขั้นตอน | ส่ง POST จำลองไปยัง Web App URL พร้อม body ที่มี event |
| ผลที่คาดหวัง | Response `{status:'ok'}`; Log ขึ้น `=== doPost started ===` |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.2 TC-02: คลิกเมนูแล้วได้ Flex Message

| หัวข้อ | รายละเอียด |
|--------|-----------|
| ขั้นตอน | คลิกเมนู "บัญชีเงินฝาก" ใน Rich Menu Tab 1 |
| ผลที่คาดหวัง | Log: `postback received: action=menu_item&item=saving_acct` → `reply success: 200`; สมาชิกเห็น Flex Message "คุณเลือกเมนู บัญชีเงินฝาก" |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.3 TC-03: Activate สำเร็จ

| หัวข้อ | รายละเอียด |
|--------|-----------|
| ข้อมูลตั้งต้น | มีแถว `M001` ที่มี `activate_code=ABC123`, `mem_eff_dt` ว่าง |
| ขั้นตอน | ส่ง `activate:ABC123` ใน LINE |
| ผลที่คาดหวัง | สมาชิกเห็น Flex ต้อนรับ; ใน Sheets: `mem_eff_dt` = now, `mem_exp_dt` = now+365, `mem_status='active'`, `line_user_id` ถูกบันทึก |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.4 TC-04: Activate รหัสไม่ถูกต้อง

| ขั้นตอน | ส่ง `activate:WRONGCODE` |
| ผลที่คาดหวัง | ข้อความ "ไม่พบรหัส activate นี้ในระบบ กรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง" |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.5 TC-05: Activate ซ้ำด้วยรหัสเดิม

| ขั้นตอน | ส่ง `activate:ABC123` อีกครั้ง (หลัง TC-03) |
| ผลที่คาดหวัง | ข้อความ "รหัสนี้ถูกใช้ไปแล้ว ไม่สามารถ activate ซ้ำได้" |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.6 TC-06: สลับแท็บ Rich Menu

| ขั้นตอน | คลิกแท็บ 2 (เงินกู้ & สวัสดิการ) |
| ผลที่คาดหวัง | หน้าจอเปลี่ยนเป็นเมนูแท็บ 2; Log มี `switch_tab` และไม่มีการตอบข้อความกลับ |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.7 TC-07: เปิดเครื่องคำนวณสินเชื่อ

| ขั้นตอน | คลิกเมนู "เครื่องคำนวณเงินกู้" (Tab 2) |
| ผลที่คาดหวัง | เปิด URL loan_calculator.html; กรอกข้อมูลแล้วกดคำนวณได้ตารางผ่อนชำระถูกต้อง |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.8 TC-08: Fallback Postback รูปแบบเก่า

| ขั้นตอน | ส่ง postback ที่ data เป็น `saving_acct` (ไม่มี `action=`) |
| ผลที่คาดหวัง | Handler จับ fallback ได้และตอบ Flex "บัญชีเงินฝาก" |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.9 TC-09: Postback ที่ไม่รู้จัก

| ขั้นตอน | ส่ง postback data ที่ไม่ตรงกับ CAPTIONS |
| ผลที่คาดหวัง | ตอบข้อความ "ได้รับ postback แล้ว แต่ยังไม่รู้จักเมนู..." |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.10 TC-10: สมาชิกที่ยังไม่ Activate ไม่เห็นเมนูสมาชิก ✅

> สถานะ: ทดสอบได้กับโค้ดปัจจุบันแล้ว — Server (Gate ใน EventHandler) ✅ + UI (Welcome Menu default + ผูกเมนูรายบุคคล) ✅ · `testWelcomeMenu()` ใน Test.js ตรวจโครงสร้าง Welcome + captions อัตโนมัติ

| หัวข้อ | รายละเอียด |
|--------|-----------|
| ข้อมูลตั้งต้น | ผู้ใช้ LINE ใหม่ที่ยังไม่เคย Activate (ไม่ถูกผูกเมนู) |
| ขั้นตอน | 1. เพิ่ม Bot เป็นเพื่อนและเปิดแชท 2. สังเกต Rich Menu ที่เห็น 3. คลิกปุ่ม Welcome (เปิดใช้งาน/วิธีใช้/ติดต่อ/ข่าวสาร) 4. พยายามเรียกคำสั่ง/เมนูของสมาชิก |
| ผลที่คาดหวัง | เห็นเฉพาะ **Welcome Menu** (ไม่เห็น 5 แท็บ); ปุ่ม Welcome ตอบข้อความได้ทันที (ไม่ต้องผ่าน Gate); เมื่อใช้เมนูสมาชิก ระบบตอบข้อความปฏิเสธ เช่น "กรุณาลงทะเบียนเปิดสิทธิ์ด้วยรหัส activate ก่อนใช้งาน" |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.11 TC-11: สมาชิกหมดอายุถูกตัดสิทธิ์ ✅

> สถานะ: ทดสอบได้กับโค้ดปัจจุบันแล้ว — Gate ปฏิเสธ + `RichMenu.Gating.unlinkMemberMenu()` ยกเลิกเมนูให้กลับไป Welcome (Deploy + ตั้งค่า Script Properties แล้ว)

| หัวข้อ | รายละเอียด |
|--------|-----------|
| ข้อมูลตั้งต้น | สมาชิกที่ `mem_exp_dt` ผ่านไปแล้ว (สถานะหมดอายุ) และเคยถูกผูกเมนู Tab 1 |
| ขั้นตอน | 1. ตรวจสอบ Rich Menu ที่สมาชิกเห็น 2. ส่งคำสั่งเมนูสมาชิก |
| ผลที่คาดหวัง | Rich Menu ถูกยกเลิกการผูก (unlink) → เห็น Welcome Menu; คำสั่งเมนูสมาชิกถูกปฏิเสธที่ Server (`isActiveMember` = false) |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.12 TC-12: ตรวจสัญญา Item ID ก่อน Deploy Rich Menu (Menu Item ID Contract)

> **รันได้กับโค้ดปัจจุบัน** — เป็นการทดสอบเชิงป้องกัน (Regression) ควรทำก่อนทุกครั้งที่ Deploy Rich Menu

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่าทุก item id ใน `MenuData.js` resolve เป็น caption ภาษาไทยใน `ReplyStore.CAPTIONS` ครบ — ป้องกันบั๊ก Flex แสดง id ภาษาอังกฤษแทนชื่อไทย |
| ข้อมูลตั้งต้น | มีเมนูใน `MenuData.js` (ปัจจุบัน 26 เมนู: 25 postback + 1 uri) และ `ReplyStore.js` ถูกโหลด |
| ขั้นตอน | 1. รัน `verifyMenuContract()` (ฟังก์ชันจริงใน `app/Test.js`) 2. ตรวจผลลัพธ์ใน Log |
| ผลที่คาดหวัง | Log: `Contract OK — ครบ 25 เมนู`; ไม่มี id ใด missing จาก CAPTIONS; caption ทุกตัวเป็นภาษาไทย (ตรวจด้วย `verifyThaiCaptions()`) หากเพิ่มเมนูใหม่โดยไม่เพิ่ม key → ฟังก์ชัน throw error และห้าม Deploy |
| ผ่าน/ไม่ผ่าน | ☐ |

**Checklist ที่เกี่ยวข้อง (จากบทที่ 3.3.7 / บทที่ 4):**

- [ ] ทุก `postback('id', ...)` ใน `MenuData.js` มี key ตรงกันใน `ReplyStore.CAPTIONS`
- [ ] ทุก id มีข้อความตอบกลับใน `TAB_1`–`TAB_5` (ไม่คืน "ไม่พบข้อมูลสำหรับรายการนี้")
- [ ] caption ทุกตัวเป็นภาษาไทย
- [ ] รัน `verifyMenuContract()` ผ่าน แล้วจึงรัน `main()` Deploy Rich Menu (บทที่ 5.6.2)

### 6.2.13 TC-13: เมนูการเงินแสดงข้อมูลจริงจากตาราง (dummy data — การ์ด MT-27)

> **รันได้กับโค้ดปัจจุบัน** — ต้องรัน `createDummyTables()` (บทที่ 5.6.4) ก่อน และต้องมีรหัสสมาชิก `MEM001`–`MEM003` ใน `t_member_mast`

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่าเมนูการเงิน (เงินฝาก/เช็คยอด/หนี้/ปันผล/หุ้น) แสดง**ข้อมูลจริง**จาก `t_savings_acct`/`t_loan_acct`/`t_dividend` ผ่าน repository — ไม่ตอบ "ไม่เชื่อมต่อ" อีกต่อไป |
| ข้อมูลตั้งต้น | รัน `createDummyTables()` แล้ว (8 ตาราง + dummy data) · สมาชิก LINE ที่ activate และผูกกับ `MEM001` |
| ขั้นตอน | 1. คลิกเมนู "บัญชีเงินฝาก" 2. คลิก "ยอดหนี้" 3. คลิก "เงินปันผล" 4. (ผู้ใช้ที่ไม่มีข้อมูล — เช่น `MEM003`) คลิก "ยอดหนี้" |
| ผลที่คาดหวัง | 1. รายการบัญชี + รวมยอด (`25,000.00 บาท` / `รวมเงินฝาก: 125,000.00 บาท`) 2. เลขสัญญา + ยอดคงค้าง + วันครบกำหนด 3. ปันผลรายปี 4. "ไม่พบข้อมูลยอดหนี้สำหรับรหัสสมาชิกนี้" (ไม่ปลอมตัวเลข) |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.14 TC-14: Broadcast ประกาศถึงสมาชิก (การ์ด MT-13)

> **รันได้กับโค้ดปัจจุบัน** — ต้องตั้ง trigger ตามบทที่ 5.9.2 หรือรัน `runNoticeBroadcast` ด้วยมือ

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่า `t_notice` ที่พร้อมส่งถูก push ถึงสมาชิก active ทุกคน (ที่มี `line_user_id`) แล้ว mark sent — กันส่งซ้ำรอบถัดไป |
| ข้อมูลตั้งต้น | มี `t_notice` (จาก `createDummyTables()` — มี `NTC-0002` พร้อมส่ง) · สมาชิก activate แล้ว ≥ 1 คน · สมาชิก inactive/ยังไม่ activate ≥ 1 คน |
| ขั้นตอน | 1. เพิ่มประกาศใน `t_notice`: `status='published'` + `sent_dt` ว่าง + `published_dt` = เวลาปัจจุบัน 2. รัน `runNoticeBroadcast` (หรือรอ trigger รายวัน) 3. ตรวจ Log 4. รัน `runNoticeBroadcast` อีกครั้ง |
| ผลที่คาดหวัง | 1. สมาชิก active ทุกคนได้รับข้อความ `📢 ประกาศสหกรณ์` 2. Log `[NoticeBroadcast] notices=... pending=1 sent=1 targets=N pushed=N` · สมาชิก inactive/ไม่มี userId ไม่ได้รับ 3. แถวประกาศมี `sent_dt` + `status='sent'` 4. รอบที่ 2: `pending=0 pushed=0` (ไม่ส่งซ้ำ) |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.15 TC-15: Bot เรียกข้อมูลผ่าน API เดียวกัน (Bot เป็น UI Adapter — การ์ด MT-17)

> **รันได้กับโค้ดปัจจุบัน** — เป็นการทดสอบใน CI (`testBotUsesApi`); สำหรับมือตรวจพฤติกรรมผู้ใช้:

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่า Bot (EventHandler) เรียกข้อมูลสมาชิกผ่าน `Api.ApiService` (endpoint เดียวกับ UI อื่น ๆ) โดยข้อความที่ผู้ใช้เห็น**ไม่เปลี่ยน** |
| ข้อมูลตั้งต้น | สมาชิก activate ที่ผูกกับ `M001` (มีเงินฝากใน `t_savings_acct` จาก `createDummyTables()`) |
| ขั้นตอน | 1. คลิกเมนู "ข้อมูลส่วนตัว" 2. คลิก "บัญชีเงินฝาก" 3. (CI) รัน `testBotUsesApi` — spy `Api.ApiService.handleRequest` |
| ผลที่คาดหวัง | 1. โปรไฟล์เหมือนเดิม: ชื่อ/รหัส/ตำแหน่ง (คะแนน)/คะแนนความดี/เงินกู้คงค้าง/เงินหุ้น 2. ยอดเงินฝากจริง + รวมยอด 3. CI: เรียก `/api/member/profile` + `/api/member/savings` (GET) — ไม่เรียก repo ตรง ๆ |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.16 TC-16: เตือนชำระหนี้รายบุคคล (การ์ด MT-13b)

> **รันได้กับโค้ดปัจจุบัน** — ต้องตั้ง trigger ตามบทที่ 5.9.3 หรือรัน `runLoanReminders` ด้วยมือ

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่าสัญญาที่ `due_dt` ในหน้าต่าง `PAYMENT_REMINDER_DAYS` ถูก push **ข้อความรายบุคคล** (ชื่อสมาชิกจริง) และบันทึก `t_reminder_log` |
| ข้อมูลตั้งต้น | รัน `createDummyTables()` (มี `LN-2026-003` MEM003 ครบกำหนด 2026-08-20) · สมาชิก activate ≥ 1 คนที่ผูกกับสัญญาที่ใกล้ครบกำหนด |
| ขั้นตอน | 1. (เลือก) เพิ่มสัญญา `due_dt` ภายใน 14 วันให้สมาชิกที่ activate แล้ว 2. รัน `runLoanReminders` (หรือรอ trigger) 3. ตรวจ Log 4. ตรวจ `t_reminder_log` |
| ผลที่คาดหวัง | 1. สมาชิกได้รับข้อความ `💳 เตือนชำระหนี้ — คุณ...` (มีเลขสัญญา/ยอด/วันครบกำหนด/อีก X วัน) 2. Log `[LoanReminder] loans=... due=N reminded=... skipped=... pushed=...` 3. `t_reminder_log` มีแถว `reminded` (push แล้ว) / `skipped` (ไม่มี userId/ไม่ active) · สัญญาที่เลยกำหนด/ไกลเกินไม่ถูกเตือน |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.17 TC-17: เมนูข้อมูลตอบเนื้อหาจริง (การ์ด MT-14)

> **รันได้กับโค้ดปัจจุบัน** — ต้องรัน `createDummyTables()` ก่อน (สร้าง `t_content`)

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่าเมนูข้อมูล/เอกสาร/ติดต่อ (สวัสดิการ/กองทุนฉุกเฉิน/FAQs/ที่ตั้ง ฯลฯ) ตอบ**เนื้อหาจริง** — อ่านจาก `t_content` ก่อน แล้ว fallback ข้อความจริงใน `ReplyStore` — ไม่ใช่ flex "คุณเลือกเมนู..." placeholder |
| ข้อมูลตั้งต้น | สมาชิก activate แล้ว · รัน `createDummyTables()` (มีเนื้อหาใน `t_content`) |
| ขั้นตอน | 1. คลิก "สวัสดิการสมาชิก" 2. คลิก "กองทุนฉุกเฉิน" 3. คลิก "คำถามที่พบบ่อย" 4. (ทดสอบ fallback) ลบแถว `emergency` ใน `t_content` แล้วคลิกอีกครั้ง |
| ผลที่คาดหวัง | 1–3. ได้ข้อความเนื้อหาจริง (🎁/🚨/❓ — ไม่ใช่ "ยังไม่มีข้อมูล"/"คุณเลือกเมนู...") 4. ยังได้ข้อความจริง (จาก ReplyStore) — ระบบไม่พังเมื่อไม่มีแถวใน `t_content` |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.18 TC-18: คำสั่ง activate/renew เรียกผ่าน API เดียวกัน (การ์ด MT-17 — ครบสโคป)

> **รันได้กับโค้ดปัจจุบัน** — เป็นการทดสอบใน CI (`testActivateViaApi` + `testRenewal`); สำหรับมือตรวจพฤติกรรมผู้ใช้:

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่า Bot (`ActivationService`/`RenewalService`) เรียก `POST /api/member/activate` / `POST /api/member/renew` — ตรรกะ (find/check/เขียนชีท) อยู่ที่ API handler เพียงที่เดียว · UI work (welcome flex/ข้อความ/ผูกเมนู) อยู่ที่ Bot layer · ข้อความที่ผู้ใช้เห็น**ไม่เปลี่ยน** |
| ข้อมูลตั้งต้น | สมาชิกยังไม่ activate (มี activate code) · สมาชิก activate แล้วสำหรับทดสอบ renew |
| ขั้นตอน | 1. ส่ง `activate:ACT001` ในแชท → welcome flex + ผูกเมนู 2. ส่ง `activate:ACT001` ซ้ำ → "รหัสนี้ถูกใช้ไปแล้ว" 3. ส่ง `activate:WRONG` → "ไม่พบรหัส activate" 4. ส่ง `renew` → ยืนยันต่ออายุ +1 ปี 5. (CI) รัน `testActivateViaApi`/`testRenewal` — spy `Api.ApiService.handleRequest` |
| ผลที่คาดหวัง | 1. Flex ต้อนรับมีชื่อจริง + `line_user_id`/`mem_status='active'` ถูกเขียนผ่าน API 2–3. ข้อความ error เหมือนเดิม (มาจาก API error code) 4. `mem_exp_dt` ขยาย +1 ปี (deterministic — seam `ctx.internal.now`) 5. CI: เรียก `POST /api/member/activate`/`renew` — ไม่ทำ find+write เอง |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.19 TC-19: Flex Component Library (การ์ด MT-33)

> **รันได้กับโค้ดปัจจุบัน** — เป็นการทดสอบใน CI (`testFlexComponents` + `flex-theme-scan`); สำหรับมือตรวจพฤติกรรมผู้ใช้:

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่า Flex Message ทั้งหมดสร้างจาก **Component Library มาตรฐานเดียวกัน** (`FlexTheme` design tokens + atoms + molecules + `bubbleFrame`) · สีไม่ hardcode ในโค้ด · refactor แล้ว **payload เหมือนเดิม** (พฤติกรรมผู้ใช้ไม่เปลี่ยน) |
| ข้อมูลตั้งต้น | รหัสปัจจุบัน (หลังการ์ด MT-33) · สมาชิก activate แล้ว |
| ขั้นตอน | 1. (CI) รัน `testFlexComponents` — ตรวจ FlexTheme/atoms/molecules/bubbleFrame + template ครบโครงสร้าง 2. (CI) `flex-theme-scan` — scan `FlexBuilder.js` ไม่ให้มี hex color · `flex-usage-scan` — ไม่ให้มี raw flex object (`type:'flex'`/`'bubble'`) นอก `FlexBuilder.js` 3. (มือ) คลิกเมนู → เห็น Flex "คุณเลือกเมนู..." เหมือนเดิม 4. (มือ) activate สมาชิกใหม่ → เห็น Flex ต้อนรับเหมือนเดิม |
| ผลที่คาดหวัง | 1. CI: `testFlexComponents OK` — component ทั้งหมด + `menuClicked`/`welcomeMember`/`messageBox` ครบโครงสร้างเดิม 2. CI: `PASS flex-theme-scan` + `PASS flex-usage-scan` 3–4. หน้าจอผู้ใช้ไม่เปลี่ยน (มีแต่โครงสร้างโค้ดที่รวมมาตรฐาน) |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.20 TC-20: Flex Card ข้อมูลสมาชิก/การเงิน (การ์ด MT-34)

> **รันได้กับโค้ดปัจจุบัน** — เป็นการทดสอบใน CI (`testFinanceCards` + `testBotUsesApi`); สำหรับมือตรวจพฤติกรรมผู้ใช้:

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่าเมนู "ข้อมูลส่วนตัว" / เมนูการเงิน (เงินฝาก/เช็คยอด/หนี้/ปันผล/หุ้น) ตอบเป็น **Flex Card** แสดงข้อมูลเหมือนเดิม (ไม่หาย/ไม่ปลอมตัวเลข) — ยังเรียกผ่าน API เดียวกัน (MT-17) |
| ข้อมูลตั้งต้น | สมาชิก activate แล้ว (มีข้อมูลการเงินจาก `createDummyTables()`) · สมาชิกไม่มีข้อมูลบางเมนู (เช่น `MEM003` ยอดหนี้) |
| ขั้นตอน | 1. คลิก "ข้อมูลส่วนตัว" 2. คลิก "บัญชีเงินฝาก" 3. คลิก "ยอดหนี้" (ผู้ใช้ไม่มีข้อมูล) 4. (CI) รัน `testFinanceCards` + `testBotUsesApi` |
| ผลที่คาดหวัง | 1. การ์ดโปรไฟล์: ชื่อ/รหัส/สถานะ badge/บทบาท/ตำแหน่ง+คะแนน/คะแนนสมาชิก/คะแนนความดี/เงินกู้คงค้าง/เงินหุ้น/สิทธิ์ใช้งาน (ข้อมูลเดียวกับข้อความเดิม) 2. การ์ดเงินฝาก: รายการบัญชี + `รวมเงินฝาก` + ยอดรวม 3. การ์ด "ไม่พบข้อมูลยอดหนี้..." (ไม่ปลอมตัวเลข) 4. CI: EventHandler ตอบ `replyFlex` การ์ดผ่าน `/api/member/profile` + `/api/member/savings` — ถ้าการ์ดส่งไม่ได้ → fallback ข้อความเดิม |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.21 TC-21: Alert/Confirm Card + ต่ออายุ 2 ขั้น (การ์ด MT-35)

> **รันได้กับโค้ดปัจจุบัน** — เป็นการทดสอบใน CI (`testAlertConfirmCards` + `testActivateViaApi`); สำหรับมือตรวจพฤติกรรมผู้ใช้:

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่าผลลัพธ์ activate/renew แสดงเป็น **alertCard** (success ✅/warning ⚠️/error ❌) และการต่ออายุมีขั้น **ยืนยัน** ก่อนดำเนินการ (confirmCard — ป้องกันกดพลาด) |
| ข้อมูลตั้งต้น | สมาชิก activate แล้ว (มี activate code) · สมาชิกยังไม่ activate 1 คน |
| ขั้นตอน | 1. ส่ง `activate:WRONG` → error alert (❌ ไม่พบรหัส) 2. ส่ง `activate:ACT001` ซ้ำ → warning alert (⚠️ รหัสถูกใช้ไปแล้ว) 3. ส่ง `renew` → เห็น **confirmCard** (ยังไม่ต่ออายุ — ตรวจชีทวันหมดอายุเดิม) 4. กด "ยืนยันต่ออายุ" → success alert (✅ ต่ออายุสำเร็จ + วันใหม่) 5. ส่ง `renew:WRONG` → กดยืนยัน → error alert 6. กด "ยกเลิก" → ข้อความยกเลิก 7. (CI) รัน `testAlertConfirmCards`/`testActivateViaApi` |
| ผลที่คาดหวัง | 1–2. alertCard ระดับถูกต้อง (สี/ไอคอนจาก FlexTheme) 3. confirmCard มีปุ่ม [ยกเลิก] [ยืนยันต่ออายุ] + `mem_exp_dt` ยังไม่เปลี่ยน 4. `mem_exp_dt` ขยาย +1 ปี + alertCard เขียว 5. alertCard แดง "ไม่พบรหัสต่ออายุนี้ในระบบ" 6. ข้อความ "ยกเลิกการต่ออายุสมาชิกแล้ว" 7. CI: `PASS testAlertConfirmCards` + `PASS testActivateViaApi` |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.22 TC-22: Flex Card ประกาศ/เตือนชำระ (การ์ด MT-36)

> **รันได้กับโค้ดปัจจุบัน** — เป็นการทดสอบใน CI (`testNoticeLoanCards` + `testNoticeBroadcast` + `testLoanReminders`); สำหรับมือตรวจพฤติกรรมผู้ใช้:

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่าประกาศจาก `t_notice` และเตือนชำระจาก `t_loan_acct` ถูก push เป็น **Flex Card** (`noticeCard` / `loanReminderCard`) ตามมาตรฐานบท 3.4 — ข้อมูลเหมือนข้อความ text เดิม |
| ข้อมูลตั้งต้น | ประกาศที่พร้อมส่ง (`status='published'` + ยังไม่มี `sent_dt`) · สัญญากู้ `due_dt` ภายใน `PAYMENT_REMINDER_DAYS` (14 วัน) ของสมาชิกที่ activate แล้ว |
| ขั้นตอน | 1. รัน `runNoticeBroadcast` (หรือรอ trigger รายวัน) → สมาชิก active ได้รับ **การ์ด 📢** 2. รัน `runLoanReminders` (หรือรอ trigger) → สมาชิกที่สัญญาถึงรอบได้รับ **การ์ด 💳** 3. ตรวจ `t_notice` ถูก mark `sent` · `t_reminder_log` ถูกบันทึก 4. (CI) รัน `testNoticeLoanCards`/`testNoticeBroadcast`/`testLoanReminders` |
| ผลที่คาดหวัง | 1. การ์ดประกาศ: header "📢 ประกาศสหกรณ์" + หัวข้อ/เนื้อหา/ประกาศเมื่อ (ข้อมูลเดียวกับ `buildNoticeText`) 2. การ์ดเตือนชำระ: header "💳 เตือนชำระหนี้" + ชื่อสมาชิก/สัญญา/ยอดคงค้าง/ครบกำหนด+วันเหลือ (ข้อมูลเดียวกับ `buildLoanReminderText`) 3. audit trail เหมือนเดิม 4. CI: `PASS testNoticeLoanCards` + `PASS testNoticeBroadcast` + `PASS testLoanReminders` |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.23 TC-23: Flex Card เนื้อหาเมนูข้อมูล (การ์ด MT-37)

> **รันได้กับโค้ดปัจจุบัน** — เป็นการทดสอบใน CI (`testContentCards` + `testContentReply`); สำหรับมือตรวจพฤติกรรมผู้ใช้:

| หัวข้อ | รายละเอียด |
|--------|-----------|
| วัตถุประสงค์ | ยืนยันว่าเมนูข้อมูลจาก `t_content` (สวัสดิการ/กองทุนฉุกเฉิน/ติดต่อ/คู่มือ) ตอบเป็น **Flex Card** (`contentCard`) ตามมาตรฐานบท 3.4 — ข้อมูลเหมือนข้อความ text เดิม |
| ข้อมูลตั้งต้น | มีข้อมูลใน `t_content` สำหรับ item ที่ทดสอบ (เช่น welfare/emergency) · สมาชิก activate แล้ว |
| ขั้นตอน | 1. สมาชิกคลิกเมนูข้อมูล (สวัสดิการ/กองทุนฉุกเฉิน/ติดต่อ/คู่มือ) 2. ตรวจว่าตอบเป็น **การ์ด 📄** (header caption ไทย + เนื้อหา + ปรับปรุงล่าสุด + ปุ่มตกลง) 3. (CI) รัน `testContentCards`/`testContentReply` |
| ผลที่คาดหวัง | 1. การ์ด: header "📄 สวัสดิการสมาชิก" + เนื้อหา wrap + กล่อง "ปรับปรุงล่าสุด" (ถ้ามี) — ข้อมูลเดียวกับข้อความ text เดิม 2. fallback: ถ้าการ์ดส่งไม่ได้ → ตอบข้อความ text เดิม (พฤติกรรมไม่พัง) 3. CI: `PASS testContentCards` + `PASS testContentReply` |
| ผ่าน/ไม่ผ่าน | ☐ |

## 6.3 การตรวจสอบ Log (Log Inspection)

Log ทั้งหมดอยู่ใน **Apps Script Editor → Executions** (หรือ Stackdriver Logging)

### 6.3.1 Log ตามปกติ

```text
=== doPost started ===
events count: 1
event[0] type: postback
postback received: action=menu_item&item=saving_acct
postback params: {"action":"menu_item","item":"saving_acct"}
Financial menu replied with data: saving_acct   ← (MT-27: ดึงจาก t_savings_acct ผ่าน repository)
reply success: 200 {}
=== doPost completed ===
```

หมายเหตุ: เมนูอื่น (เช่น `loan_calc`) ยังตอบ Flex Message เหมือนเดิม (`Replying flex message for menu: ...`)

### 6.3.2 Log ระบบ Activate

```text
[Activation] Processing activation for code: ABC123, LINE user: U1234...
[Activation] findByActivateCode returned: found
[Activation] Activating member at row 2
[Activation] Activation result: {"memEffDt":"2026-08-12 ...","memExpDt":"2027-08-12 ...","memStatus":"active",...}
[Activation] Welcome flex message sent successfully for member: M001
```

## 6.4 การแก้ไขปัญหา (Troubleshooting)

### 6.4.1 ไม่มี `doPost started` ใน Log

| สาเหตุที่เป็นไปได้ | วิธีแก้ |
|-------------------|--------|
| LINE ไม่ได้เรียก Webhook URL นี้ | ตรวจ Webhook URL ใน LINE Console ให้ตรงกับ deployment ล่าสุด |
| Webhook ยังไม่ถูกเปิด (Enable) | เปิด Webhook settings ใน LINE Console |
| Web App deployment เป็น version เก่า | Deploy version ใหม่ (บทที่ 5.4.2) |

### 6.4.2 มี `postback received` แต่ไม่มี `reply success`

| สาเหตุที่เป็นไปได้ | วิธีแก้ |
|-------------------|--------|
| Token ไม่ถูกต้อง | ตรวจ `CHANNEL_ACCESS_TOKEN` ใน Script Properties |
| replyToken หมดอายุ/ใช้ซ้ำ | ตอบกลับครั้งเดียวต่อ event ภายในเวลาที่กำหนด |
| Flex payload ไม่ถูก schema | ตรวจ log `reply error: 400 ...` และเทียบกับเอกสาร LINE |

### 6.4.3 มี `reply success: 200` แต่สมาชิกไม่เห็นข้อความ

| สาเหตุที่เป็นไปได้ | วิธีแก้ |
|-------------------|--------|
| Event เป็น `switch_tab` / `stay_tab` | โดย design ไม่ตอบข้อความ (ตรวจ event type) |
| Bot ถูก Block โดยสมาชิก | ตรวจว่า Bot ยังเป็นเพื่อนกับผู้ใช้ |
| ปัญหา client/network | ทดสอบกับเครื่องอื่น/บัญชีอื่น |

### 6.4.4 คลิกเมนูแล้วได้ข้อความ "ไม่รู้จักเมนู"

| สาเหตุที่เป็นไปได้ | วิธีแก้ |
|-------------------|--------|
| Rich Menu ที่ Deploy อยู่เป็น version เก่า | รัน `main()` ใหม่เพื่อ Deploy Rich Menu ล่าสุด |
| `item` ไม่ตรงกับ `CAPTIONS` | เพิ่ม key ใน `ReplyStore.CAPTIONS` |

### 6.4.5 Checklist การตรวจสอบโดยรวม

- [ ] Webhook URL ชี้ไป deployment ล่าสุด
- [ ] Web App ถูก deploy เป็น version ใหม่หลังแก้โค้ด
- [ ] Rich Menu ถูก deploy ใหม่หลังแก้ `MenuData.js`
- [ ] Script Properties มี `CHANNEL_ACCESS_TOKEN` ที่ถูกต้อง
- [ ] ภาพใน Google Drive พร้อมใช้งาน (File ID ถูกต้อง)
- [ ] Google Sheets มีสิทธิ์ให้ Apps Script เข้าถึง
- [ ] ตรวจ Log ทุกขั้นตอน (doPost → event → reply)

## สรุปท้ายบท

บทนี้นำเสนอกลยุทธ์การทดสอบ 3 ระดับ Test Cases หลัก 23 กรณี (TC-01–23) แนวทางการตรวจสอบ Log และการแก้ไขปัญหาที่พบบ่อย บทที่ 7 กล่าวถึงการบำรุงรักษาและแผนการพัฒนาในอนาคต
