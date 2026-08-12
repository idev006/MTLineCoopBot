# เอกสารโครงการ (Project Documentation)

## ระบบ LINE Official Account บริการสมาชิกสหกรณ์ (MTLineCoopBot)

---

**ชื่อหนังสือ:** เอกสารโครงการระบบ LINE Bot บริการสมาชิกสหกรณ์

**โครงการ:** MTLineCoopBot

**ผู้จัดทำ:** ทีมพัฒนา MTLineCoopBot

**เวอร์ชันเอกสาร:** 1.0

**วันที่จัดทำ:** 12 สิงหาคม 2569

**เทคโนโลยีหลัก:** Google Apps Script (V8) · LINE Messaging API · Google Sheets · Google Drive · GitHub Pages

---

## คำนำ (Preface)

เอกสารโครงการฉบับนี้จัดทำขึ้นเพื่อใช้เป็น **เอกสารอ้างอิงกลาง** ของโครงการ MTLineCoopBot ซึ่งเป็นระบบ LINE Official Account สำหรับให้บริการสมาชิกสหกรณ์ผ่านช่องทาง LINE ประกอบด้วยการแสดงเมนูแบบ Rich Menu จำนวน 5 แท็บ การตอบกลับข้อความแบบ Flex Message การลงทะเบียนสมาชิกผ่านรหัส Activate (Member Activation) และเครื่องคำนวณสินเชื่อออนไลน์

การจัดทำเอกสารใช้แนวคิดของการเขียนหนังสือ โดยแบ่งเนื้อหาออกเป็นบทต่าง ๆ เพื่อให้ผู้อ่านสามารถศึกษาได้อย่างเป็นระบบ เริ่มตั้งแต่บทนำ การวิเคราะห์ระบบ การออกแบบระบบ โครงสร้างโปรแกรม การติดตั้งและใช้งาน การทดสอบระบบ ตลอดจนแนวทางการบำรุงรักษาและพัฒนาในอนาคต

เอกสารฉบับนี้เหมาะสำหรับ:
- **ผู้บริหารและผู้มีส่วนได้ส่วนเสีย** — ใช้ศึกษาภาพรวม วัตถุประสงค์ ขอบเขต และประโยชน์ของโครงการ (บทที่ 1)
- **นักวิเคราะห์ระบบ / นักออกแบบ** — ใช้ศึกษาสถาปัตยกรรม การออกแบบข้อมูล และการออกแบบส่วนติดต่อกับ LINE (บทที่ 2–3)
- **นักพัฒนาโปรแกรม** — ใช้เป็นคู่มืออ้างอิงโครงสร้างโค้ด มาตรฐานการเขียน และแนวทางแก้ไข (บทที่ 4–6)
- **ผู้ดูแลระบบ (Admin/Operation)** — ใช้เป็นคู่มือติดตั้ง ตั้งค่า และบำรุงรักษาระบบ (บทที่ 5, 7)

ผู้จัดทำหวังเป็นอย่างยิ่งว่าเอกสารฉบับนี้จะเป็นประโยชน์ต่อการพัฒนา การดูแลรักษา และการต่อยอดระบบในอนาคต หากพบข้อผิดพลาดหรือข้อเสนอแนะประการใด กรุณาแจ้งให้ทีมพัฒนาทราบเพื่อปรับปรุงเอกสารให้สมบูรณ์ยิ่งขึ้นต่อไป

---

## สารบัญ (Table of Contents)

| บท | ชื่อเรื่อง | รายละเอียด |
|----|----------|------------|
| — | [README.md](./README.md) | ปกหน้า · คำนำ · สารบัญ · ข้อมูลโครงการ |
| 1 | [บทที่ 1 บทนำ](./ch-01-introduction.md) | หลักการและเหตุผล · วัตถุประสงค์ · ขอบเขต · ประโยชน์ · นิยามศัพท์ |
| 2 | [บทที่ 2 การวิเคราะห์ระบบ](./ch-02-system-analysis.md) | สภาพปัจจุบัน · สถาปัตยกรรม · Flow · Use Case · ความสามารถในการขยาย · ข้อจำกัด · ความเสี่ยง |
| 3 | [บทที่ 3 การออกแบบระบบ](./ch-03-system-design.md) | ข้อมูล · Data Layer/Repository Pattern · Rich Menu + Per-User Gating · Item-ID Contract · Flex Message · Webhook · ความปลอดภัย/Auth Chain · RBAC · API-First/Multi-UI |
| 4 | [บทที่ 4 โครงสร้างโปรแกรม](./ch-04-program-structure.md) | โครงสร้างไฟล์ · คำอธิบายโมดูล · มาตรฐานโค้ด · Configuration |
| 5 | [บทที่ 5 การติดตั้งและการใช้งาน](./ch-05-installation-deployment.md) | clasp · GitHub Workflow (Git → clasp → Apps Script) · Script Properties · Deploy Web App · Deploy Rich Menu · LINE Console |
| 6 | [บทที่ 6 การทดสอบระบบ](./ch-06-testing.md) | กลยุทธ์การทดสอบ · Test Cases (TC-01–13) · การตรวจสอบ Log · Troubleshooting |
| 7 | [บทที่ 7 การบำรุงรักษาและการพัฒนาในอนาคต](./ch-07-maintenance-roadmap.md) | การบำรุงรักษา · Roadmap 4 ระยะ · แนวทางการขยายระบบ |
| 8 | [บทที่ 8 กระบวนการพัฒนา](./ch-08-process.md) | Document-Driven (เอกสารนำโค้ด) · Agile Kanban · Dashboard · DoD |
| — | [KANBAN.md](./KANBAN.md) | บอร์ดงานทีม (Backlog / To Do / In Progress / Done) |
| — | [บรรณานุกรม](./bibliography.md) | เอกสารอ้างอิงทางการและเอกสารภายในโครงการ |

---

## ข้อมูลโครงการ

| รายการ | รายละเอียด |
|--------|-----------|
| ชื่อโครงการ | MTLineCoopBot — LINE Bot บริการสมาชิกสหกรณ์ |
| แพลตฟอร์ม | Google Apps Script (Runtime V8) |
| ช่องทางติดต่อผู้ใช้ | LINE Messaging API (Official Account) |
| ฐานข้อมูล | Google Sheets (ตาราง `t_member_mast`) |
| ที่เก็บรูปภาพ | Google Drive |
| เว็บแอปพลิเคชันเสริม | เครื่องคำนวณสินเชื่อ (GitHub Pages + Vue 3 + Tailwind/DaisyUI) |
| GitHub Repository | https://github.com/idev006/MTLineCoopBot.git (owner: `idev006`) |
| โซนเวลา | Asia/Bangkok |
| โครงสร้างการจัดการโค้ด | **Git/GitHub (source of truth) → clasp push → Apps Script** (`app/` เป็น rootDir) |

## สถานะการดำเนินการ (Implementation Status)

| ฟีเจอร์ | สถานะ | อ้างอิง |
|---------|-------|--------|
| Rich Menu 5 แท็บ + Alias + Deploy | ✅ ทำแล้ว | บทที่ 3.3, 5.6 |
| Flex Message ตอบกลับเมนู (item-id ตรงกันทั้ง 26 เมนู) | ✅ ทำแล้ว | บทที่ 3.4, 4.2.6 |
| Welcome Menu (4 ปุ่ม) + ตอบกลับเมนูสาธารณะ (`welcome_*`) | ✅ ทำแล้ว | บทที่ 3.3.6, 4.2.8 |
| ระบบ Activate สมาชิก (`activate:CODE`) | ✅ ทำแล้ว | บทที่ 2.3.3 |
| DataDict SSOT (16 คอลัมน์ — รวม `mem_kk` คะแนนความดี / `mem_bk` เงินกู้คงค้าง / `mem_bh` เงินหุ้น) | ✅ ทำแล้ว | บทที่ 3.2, 4.2.7 |
| โปรไฟล์สมาชิกแสดงคะแนนความดี/เงินกู้คงค้าง/เงินหุ้น (formatMoney, ซ่อนเมื่อไม่มีค่า) | ✅ ทำแล้ว | บทที่ 4.2.7, KANBAN MT-30 |
| `isActiveMember` / `hasRole` / `parseDate` | ✅ ทำแล้ว | บทที่ 4.2.6 |
| ฟังก์ชันทดสอบสัญญา (`Test.js`: `verifyMenuContract` / `verifyThaiCaptions` / `MenuData.listItemIds`) | ✅ ทำแล้ว | บทที่ 3.3.7, TC-12 |
| เครื่องคำนวณสินเชื่อ Actual/365 (GitHub Pages) | ✅ ทำแล้ว | บทที่ 2.3.4 |
| Welcome Menu + Per-User Rich Menu Gating (link/unlink) | ✅ ทำแล้ว | บทที่ 3.3.6, 5.6 |
| ตรวจสอบ Webhook (`webhook_secret` token + ฟังก์ชัน HMAC-SHA256) | ✅ ทำแล้ว | บทที่ 3.6, 5.5 |
| หมุน Channel Access Token (SEC) — หมุนแล้ว + purge ประวัติ git + CI กันซ้ำ (regex + gitleaks) | ✅ ทำแล้ว | บทที่ 5.5.1, KANBAN MT-26 |
| `checkTokenHealth()` — ตรวจสุขภาพ token ผ่าน LINE Get Bot Info API (รันมือใน Apps Script Editor) | ✅ ทำแล้ว | บทที่ 5.5.1, 7.1.3 |
| Gate ตรวจสิทธิ์ Server (`findByLineUserId` + `isActiveMember` + บทบาท) | ✅ ทำแล้ว | บทที่ 3.7, 6 TC-10 |
| ดึงข้อมูลจริงตามเมนู — `profile` แสดงข้อมูลจริงจาก `t_member_mast` · **เมนูการเงินแสดงข้อมูลจริง** จาก `t_savings_acct`/`t_loan_acct`/`t_dividend` (dummy data ผ่าน `SeedData`) | ✅ ทำแล้ว (dummy) | บทที่ 7 ระยะ 2, 5.6.4, data-dictionary.md |
| ตารางข้อมูลตาม use case + dummy data — `t_savings_acct` · `t_loan_acct` · `t_dividend` · `t_activation_log` · `t_expiry_log` (naming: lower case + `t_`) | ✅ ทำแล้ว | บทที่ 5.6.4, 4.2.6b, data-dictionary.md |
| Audit trail ตรวจวันหมดอายุ — ทุกการตรวจบันทึกลง `t_expiry_log` (1 แถว/สมาชิก: valid/expiring/expired + days_left) | ✅ ทำแล้ว | บทที่ 7 ระยะ 2, KANBAN MT-32 |
| สลับตำแหน่งฟิลด์ในตารางได้ (Header-driven — อ่าน/เขียน map จาก header จริง, `getHeaderMap`/`rowToObjectByHeaders`) | ✅ ทำแล้ว | บทที่ 3.2.1, 4.2.7, data-dictionary.md |
| ตรวจรูปแบบวันที่ก่อนเขียน (`yyyy-mm-dd` / `yyyy-mm-dd HH:mm:ss` — ปฏิเสธ `dd-mm-yyyy`/`T`/`Z`/mixed) | ✅ ทำแล้ว | data-dictionary.md (มาตรฐาน), 4.2.6 |
| เลเยอร์แปลงวันที่ชีท ↔ Firestore TIMESTAMP (`Core/DateConverter` — round-trip ตรงเป๊ะ, พร้อมใช้เฟส 3) | ✅ ทำแล้ว (Core) | บทที่ 3.1.1, 4.2.0, data-dictionary.md |
| ตรวจวันหมดอายุสมาชิกอัตโนมัติ (Time-driven Trigger: push เตือนก่อนหมดอายุ + แจ้ง expired + unlink เมนู + คำเตือนในคำตอบ) | ✅ ทำแล้ว | บทที่ 7 ระยะ 2, 5.9, 4.2.7 |
| สถาปัตยกรรม API-First — **API Layer ทำแล้ว** (`app/Api/`: registry + envelope `{ok,error,data}` + 7 endpoints ใช้ Core/Repository) · เหลือ: Auth + Mount + LIFF/ID Token (เฟส 3) | ✅ บางส่วน (API Layer) | บทที่ 3.1.1, 4.2.6c, 7 ระยะที่ 3 |
| Data Layer แยกตาม Repository Pattern (`MemberRepository` interface + `SheetsMemberRepository`, factory ตาม `DB_TYPE`) | ✅ ทำแล้ว (Firestore 📌 เฟส 3) | บทที่ 3.2.4, 4.2.0b |
| Core Business Logic ล้วน (`Core/MemberRules` + `Core/LoanCalculator` — pure, เทสต์ใน node ได้) | ✅ ทำแล้ว | บทที่ 3.1.1, 4.2.0 |
| KPI Dashboard ทีม (`Dashboard.js` + เทมเพลต) | ✅ ทำแล้ว | บทที่ 8.3, metrics-dashboard-template.md |

> **สัญลักษณ์:** ✅ ทำแล้ว = มีในโค้ดแล้ว · 📌 ออกแบบไว้ — เฟส 2/3 = ระบุการออกแบบไว้ในเอกสาร ยังไม่ได้ implement (ดู Roadmap บทที่ 7)

## เอกสารประกอบภายในโครงการ (ที่เคยจัดทำไว้)

| เอกสาร | เนื้อหา |
|--------|--------|
| [KANBAN.md](./KANBAN.md) | บอร์ดงานทีม (Agile Kanban) — การ์ดงานตาม Roadmap |
| [metrics-dashboard-template.md](./metrics-dashboard-template.md) | เทมเพลต Dashboard KPI ทีม (โครงสร้างชีท + สูตร + วิธีใช้) |
| [project-line-bot-rich-menu.md](./project-line-bot-rich-menu.md) | โครงสร้าง Rich Menu และ Flex Reply เบื้องต้น |
| [data-dictionary.md](./data-dictionary.md) | พจนานุกรมข้อมูล (Data Dictionary / SSOT) |
| [foundation-readiness.md](./foundation-readiness.md) | **Checklist ความพร้อมรากฐาน** — เมทริกซ์เสาหลัก ↔ หลักฐานการทดสอบ (รันได้จริง) |
| [use-case-member-activation.md](./use-case-member-activation.md) | Use Case การ Activate สมาชิกผ่าน LINE Bot |
| [lesson-learned-rich-menu-flex-reply.md](./lesson-learned-rich-menu-flex-reply.md) | บทเรียนการแก้ไขปัญหา Rich Menu ไม่ตอบกลับ |
