# MTLineCoopBot

LINE Bot บริการสมาชิกสหกรณ์ — Frontend/UI ผ่าน LINE Messaging API (Rich Menu + Flex Message) · Backend บน Google Apps Script · ข้อมูลใน Google Sheets

![CI — Contract Tests & Lint](https://github.com/idev006/MTLineCoopBot/actions/workflows/ci.yml/badge.svg)

## 📚 เอกสารโครงการ (Project Book)

เอกสารฉบับสมบูรณ์ (ปกหน้า · คำนำ · สารบัญ · 8 บท · บรรณานุกรม) อยู่ที่:

👉 **[app/docs/README.md](./app/docs/README.md)** — เริ่มอ่านที่นี่

| เอกสาร | คำอธิบาย |
|--------|----------|
| [KANBAN.md](./app/docs/KANBAN.md) | บอร์ดงานทีม (Backlog / To Do / In Progress / Done) |
| [data-dictionary.md](./app/docs/data-dictionary.md) | พจนานุกรมข้อมูล (SSOT — ตาราง `t_member_mast` 16 คอลัมน์) |
| [foundation-readiness.md](./app/docs/foundation-readiness.md) | Checklist ความพร้อมรากฐาน — เมทริกซ์เสาหลัก ↔ หลักฐานการทดสอบ |
| [metrics-dashboard-template.md](./app/docs/metrics-dashboard-template.md) | เทมเพลต Dashboard KPI ของทีม |
| [use-case-member-activation.md](./app/docs/use-case-member-activation.md) | Use Case ระบบ Activate สมาชิก |

## 🧰 เทคโนโลยี

| ส่วน | เทคโนโลยี |
|------|-----------|
| UI | LINE Messaging API (Rich Menu 5 แท็บ · Flex Message) |
| Backend | Google Apps Script (Runtime V8) |
| ฐานข้อมูล | Google Sheets (`t_member_mast`) |
| รูปภาพ | Google Drive |
| เครื่องคำนวณสินเชื่อ | `loan_calculator.html` (GitHub Pages + Vue 3 + Tailwind/DaisyUI) |
| จัดการโค้ด Apps Script | [clasp](https://github.com/google/clasp) |

## 📁 โครงสร้าง repo

```
MTLineCoopBot/
├── app/                        ← rootDir ของ clasp (push ขึ้น Apps Script)
│   ├── WebApp.js               ← entry point (doGet / doPost)
│   ├── Config.js               ← Script Properties (channel token / secret)
│   ├── DataDict.js             ← SSOT นิยามตาราง/คอลัมน์
│   ├── Util.js                 ← verifyWebhookSecret / verifyLineSignature
│   ├── Test.js                 ← ฟังก์ชันทดสอบ (รันใน Apps Script Editor)
│   ├── Dashboard.js            ← สร้างชีท KPI ของทีมอัตโนมัติ
│   ├── LineBot/                ← EventHandler · SheetService · ReplyStore · FlexBuilder ...
│   ├── RichMenu/               ← MenuData · Deployer · ApiService
│   ├── docs/                   ← เอกสารโครงการ (เล่มหลัก)
│   └── assets/                 ← รูป Rich Menu (เฉพาะในเครื่อง — ไม่ push ขึ้น Apps Script)
├── loan_calculator.html        ← เครื่องคำนวณสินเชื่อ
├── .clasp.json                 ← scriptId + rootDir ของ clasp
└── README.md                   ← ไฟล์นี้
```

## 🔁 Workflow: GitHub → clasp → Apps Script

GitHub เป็น **source of truth** ของโค้ด ส่วน Apps Script เป็นปลายทางที่รับโค้ดผ่าน clasp:

```text
แก้โค้ด → git commit + git push (GitHub) → clasp push (Apps Script) → Deploy Web App ใหม่
```

### เริ่มทำงานในเครื่องใหม่

```bash
# 1) โคลนโค้ด
git clone https://github.com/idev006/MTLineCoopBot.git

# 2) ตั้งค่า clasp (มี .clasp.json ใน repo แล้ว — ตรวจ scriptId ให้ตรง)
clasp login
clasp pull      # ดึงโค้ด Apps Script ลงเครื่องครั้งแรก (ถ้าต้องการ)

# 3) แก้ไข → อัปโหลดขึ้น GitHub
git add . && git commit -m "..." && git push

# 4) ส่งขึ้น Apps Script + Deploy version ใหม่ (รายละเอียดในบทที่ 5.4.2)
clasp push
```

> ⚠️ `clasp pull` เขียนทับไฟล์ในเครื่อง — ใช้เฉพาะครั้งแรกหรือเมื่อซิงค์จาก Apps Script กลับมา ไม่ควรสลับใช้บ่อยระหว่าง Git กับ `clasp pull`

> ⚠️ **ห้าม commit ความลับลง repo:** Channel Access Token, Channel Secret, Webhook Secret เก็บใน **Script Properties** เท่านั้น (`Config.js` จัดการให้) · `~/.clasprc.json` (credential ของ clasp) ถูก gitignore แล้ว

## 🧪 ทดสอบ

**CI (GitHub Actions)** รันอัตโนมัติทุก push ขึ้น `main` — mirror DoD บทที่ 8.1.3:

1. `node --check` ทุกไฟล์ `app/*.js` — ตรวจ syntax
2. `node scripts/ci-test.js` — รันชุดทดสอบสัญญา (จำลอง Apps Script runtime ด้วย vm + mock services):
   - `verifyMenuContract()` — item id ครบใน CAPTIONS (ห้าม Deploy ถ้า fail)
   - `verifyThaiCaptions()` — caption เป็นภาษาไทย
   - `testVerifyLineSignature()` · `testVerifyWebhookSecret()` · `testMemberValidity()`
3. **Secret scan (regex)** — ห้าม hardcoded token/secret ในโค้ด (fail ถ้าพบ)
4. **gitleaks** (job แยก) — ตรวจ API keys / private keys / generic secrets ครอบคลุม pattern กว้างกว่า + ตรวจ**ประวัติ git ทั้งหมด** (config: `.gitleaks.toml`)

รันในเครื่องได้ด้วย: `node scripts/ci-test.js` · และรันใน **Apps Script Editor → เลือกฟังก์ชัน → Run** (รายละเอียด: บทที่ 6 + `app/Test.js`)

ฟังก์ชันใน `Test.js`: `verifyMenuContract()` · `verifyThaiCaptions()` · `testVerifyLineSignature()` · `testVerifyWebhookSecret()` · `testMemberValidity()` — รันใน CI · `checkTokenHealth()` — ตรวจสุขภาพ Channel Access Token (ต้องใช้ token จริง จึงรันมือใน Apps Script Editor เท่านั้น)

## 📌 สถานะโครงการ

ดูตารางสถานะล่าสุด (✅ ทำแล้ว / 📌 ออกแบบไว้ — เฟส 2/3) ได้ที่ [app/docs/README.md](./app/docs/README.md) และบอร์ดงานที่ [KANBAN.md](./app/docs/KANBAN.md)
