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

- หมุน (Rotate) Channel Access Token ตามนโยบายหรือเมื่อสงสัยว่ารั่วไหล — ดู Runbook บทที่ 5.5.1
- ตรวจสอบว่าไม่มีการ commit token/secret ลง Git (CI secret scan ใน `.github/workflows/ci.yml` จะ fail ถ้าพบ — บทที่ 8.1.3)
- ตรวจสอบ `X-Line-Signature` ทุก request เพื่อยืนยันว่า Webhook มาจาก LINE จริง (ขั้นตอนบังคับ — บทที่ 3.6)

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
| ควบคุมเมนูตามสิทธิ์ (Per-User Rich Menu) | Welcome Menu เป็น default; ผูกเมนูสมาชิกหลัง Activate; ยกเลิกเมื่อหมดอายุ (บทที่ 3.3.6) |
| ตรวจสอบ X-Line-Signature | ยืนยันว่า Webhook มาจาก LINE จริงก่อนประมวลผล (บทที่ 3.6) |
| Gate ตรวจสิทธิ์ใน EventHandler | ค้นหา member ด้วย `line_user_id` + ตรวจ `isActiveMember`/`hasRole` ก่อนตอบสนองทุกคำขอ |
| ดึงข้อมูลสมาชิกจริงตามเมนู | คิวรี `t_member_mast` ด้วย `line_user_id` แล้วตอบยอดเงินฝาก/หนี้/ปันผลจริง |
| ตรวจสอบวันหมดอายุสมาชิก | ตอบกลับเมื่อสมาชิกหมดอายุ / แจ้งเตือนก่อนหมดอายุ |
| Renew / ต่ออายุสมาชิก | เพิ่มคำสั่งหรือ trigger ต่ออายุ `mem_exp_dt` |
| แจ้งเตือนตามเวลา | ใช้ Time-driven Trigger ส่งข่าวสาร/ประกาศ/เตือนชำระเป็นกลุ่ม |
| ปรับปรุงข้อความตอบกลับ | แทนที่ Placeholder ใน `ReplyStore` ด้วยข้อมูลจากฐานข้อมูล |

### ระยะที่ 3 — สถาปัตยกรรม API-First และ LIFF

**เป้าหมาย:** เปลี่ยนจาก Bot-centric เป็น API-First เพื่อรองรับหลาย UI (สถาปัตยกรรมในบทที่ 3.1.1)

| ฟีเจอร์ | รายละเอียด |
|---------|-----------|
| แยก Core Business Logic | ย้ายตรรกะ (validity, role, loan calculation) เป็น pure functions ใน `app/Core/` + unit tests ใน node |
| API Layer (Router + Responder) | สร้าง `app/Api/` — registry routing + JSON envelope `{ok, error, data}` (บทที่ 3.1.1) |
| LINE Bot เป็น UI Adapter | ให้ Bot เรียกผ่าน API เดียวกัน โดยพฤติกรรมผู้ใช้ไม่เปลี่ยน |
| LIFF (LINE Frontend Framework) | เปิดฟอร์ม/ตารางภายใน LINE แทนการเปิดเว็บภายนอก ใช้ LINE Login ยืนยันตัวตน |
| ตรวจสอบ ID Token (JWT) | ตรวจสอบ ID token จาก LIFF ด้วย Channel Secret ก่อนเชื่อถือ `sub` = userId (บทที่ 3.1.1) |
| รองรับหลาย UI | Admin Dashboard / แอปมือถือในอนาคต เรียกใช้ API เดียวกัน |
| แยก Data Layer (Repository Pattern) | สร้าง `MemberRepository` interface + `SheetsMemberRepository` ห่อ `SheetService` เดิม — สลับฐานข้อมูล (Firestore/PostgreSQL) ได้โดยเปลี่ยน factory จุดเดียว (บทที่ 3.2.4) |

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
