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

### 6.2.10 TC-10: สมาชิกที่ยังไม่ Activate ไม่เห็นเมนูสมาชิก

> สถานะ: ส่วน "ถูกปฏิเสธที่ Server" (Gate ใน EventHandler) ทดสอบได้กับโค้ดปัจจุบันแล้ว ✅ · ส่วน Welcome Menu (UI) ยังเป็นเฟส 2 📌

| หัวข้อ | รายละเอียด |
|--------|-----------|
| ข้อมูลตั้งต้น | ผู้ใช้ LINE ใหม่ที่ยังไม่เคย Activate |
| ขั้นตอน | 1. เพิ่ม Bot เป็นเพื่อนและเปิดแชท 2. สังเกต Rich Menu ที่เห็น 3. พยายามเรียกคำสั่ง/เมนูของสมาชิก |
| ผลที่คาดหวัง | เห็นเฉพาะ **Welcome Menu** (ไม่เห็น 5 แท็บ); เมื่อพยายามใช้เมนูสมาชิก ระบบตอบข้อความปฏิเสธ เช่น "กรุณาลงทะเบียนเปิดสิทธิ์ด้วยรหัส activate ก่อนใช้งาน" |
| ผ่าน/ไม่ผ่าน | ☐ |

### 6.2.11 TC-11: สมาชิกหมดอายุถูกตัดสิทธิ์ 📌 ออกแบบไว้ — เฟส 2

> Test case นี้ทดสอบฟีเจอร์เฟส 2 ยังไม่สามารถทดสอบกับโค้ดปัจจุบันได้

| หัวข้อ | รายละเอียด |
|--------|-----------|
| ข้อมูลตั้งต้น | สมาชิกที่ `mem_exp_dt` ผ่านไปแล้ว (สถานะหมดอายุ) |
| ขั้นตอน | 1. ตรวจสอบ Rich Menu ที่สมาชิกเห็น 2. ส่งคำสั่งเมนูสมาชิก |
| ผลที่คาดหวัง | Rich Menu ถูกยกเลิกการผูก → เห็น Welcome Menu; คำสั่งเมนูสมาชิกถูกปฏิเสธที่ Server (`isActiveMember` = false) |
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

## 6.3 การตรวจสอบ Log (Log Inspection)

Log ทั้งหมดอยู่ใน **Apps Script Editor → Executions** (หรือ Stackdriver Logging)

### 6.3.1 Log ตามปกติ

```text
=== doPost started ===
events count: 1
event[0] type: postback
postback received: action=menu_item&item=saving_acct
postback params: {"action":"menu_item","item":"saving_acct"}
Replying flex message for menu: บัญชีเงินฝาก
reply success: 200 {}
=== doPost completed ===
```

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

บทนี้นำเสนอกลยุทธ์การทดสอบ 3 ระดับ Test Cases หลัก 12 กรณี (TC-01–12) แนวทางการตรวจสอบ Log และการแก้ไขปัญหาที่พบบ่อย บทที่ 7 กล่าวถึงการบำรุงรักษาและแผนการพัฒนาในอนาคต
