# บทที่ 3 การออกแบบระบบ (System Design)

## 3.1 การออกแบบสถาปัตยกรรมโดยรวม (Architecture Design)

ระบบแบ่งออกเป็น 3 ชั้น (Layers) ดังนี้

```text
┌─────────────────────────────────────────────────────────┐
│ Presentation Layer (ช่องทางติดต่อผู้ใช้)                  │
│  - LINE Chat (Rich Menu, Flex Message, Text)            │
│  - Web Browser (เครื่องคำนวณสินเชื่อบน GitHub Pages)      │
├─────────────────────────────────────────────────────────┤
│ Application Layer (Google Apps Script)                  │
│  - WebApp (Entry Point / doPost)                        │
│  - EventHandler (Router)                                │
│  - ActivationService / ReplyStore / FlexBuilder         │
│  - MessageService (LINE Reply API)                      │
│  - RichMenu (ApiService / Deployer / MenuData)          │
├─────────────────────────────────────────────────────────┤
│ Data Layer                                              │
│  - Google Sheets (t_member_mast) ← DataDict (SSOT)      │
│  - Google Drive (ภาพ Rich Menu)                         │
│  - Script Properties (Configuration/Secrets)            │
└─────────────────────────────────────────────────────────┘
```

**หลักการออกแบบที่สำคัญ**

1. **Separation of Concerns** — แต่ละไฟล์มีหน้าที่เดียวชัดเจน (Config / Util / Service / Builder)
2. **Single Source of Truth** — โครงสร้างข้อมูลถูกกำหนดที่ `DataDict.js` เพียงจุดเดียว
3. **Namespace Pattern** — ใช้ `var LineBot = LineBot || {}` เพื่อให้ไฟล์หลายไฟล์แชร์ namespace เดียวกัน และกันปัญหาการโหลดไฟล์สลับลำดับ
4. **Runtime Dependency Resolution** — handler resolve ตัวบริการตอน runtime แทนการจับค่า top-level
5. **Config-driven** — ค่าที่เปลี่ยนบ่อย (endpoint, alias, image id) อยู่รวมที่ `Config.js`

### 3.1.1 สถาปัตยกรรม API-First และ Multi-UI 📌 ออกแบบไว้ — เฟส 3

> เป้าหมายระยะยาว (เฟส 3) — สถาปัตยกรรมปัจจุบันในหัวข้อ 3.1 ยังเป็นแบบ Bot-centric จะค่อยๆ เปลี่ยนเป็น API-First ตามแผนในบทที่ 7

**หลักการ:** แยก "แกนระบบ" (API + Business Logic + Data) ออกจาก "UI Adapter" ให้สมบูรณ์ เพื่อรองรับการเปลี่ยน/เพิ่ม UI ได้โดยไม่แตะแกน

```text
┌────────────────────────────────────────────────────┐
│  UI Adapters (หลายชนิด เปลี่ยน/เพิ่มได้ตลอด)         │
│  ┌──────────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ LINE Bot     │ │ LIFF Web │ │ Admin Dashboard│  │
│  │ (Rich Menu,  │ │ (ฟอร์ม/   │ │ (Web App)     │  │
│  │  Flex, Chat) │ │  ตาราง)   │ │               │  │
│  └──────┬───────┘ └────┬─────┘ └───────┬────────┘  │
│         │ Auth แต่ละช่องทาง             │           │
│  X-Line-Signature │ ID Token (JWT) │ API Key      │
└─────────┼──────────────┼───────────────┼───────────┘
          ▼              ▼               ▼
┌────────────────────────────────────────────────────┐
│  API Layer (Apps Script WebApp)                    │
│  Router (registry) → Auth → Handler → Responder    │
│  ตอบ JSON envelope: { ok, error, data }            │
├────────────────────────────────────────────────────┤
│  Core / Business Logic (pure functions, testable)  │
│  MemberService · LoanService · ActivationService   │
├────────────────────────────────────────────────────┤
│  Data Layer: DataDict (SSOT) + SheetService        │
└────────────────────────────────────────────────────┘
```

**สัญญา API (JSON Envelope):**

```json
{ "ok": true,  "data": { ... } }
{ "ok": false, "error": { "code": "MEMBER_INVALID", "message": "..." } }
```

> ✅ **API Layer เริ่ม implement แล้ว (การ์ด MT-16)** — `app/Api/`: `ApiService` (จุดเข้า) → `ApiRegistry` (ตาราง route) → `ApiHandlers` (ใช้ Core + Repository เท่านั้น) → `ApiResponse` (envelope `{ok, data}` / `{ok, error:{code,message}}`) · endpoint 8 ตัว: health · profile · savings · loans · dividends · validity · activate · renew (ต่ออายุ — การ์ด MT-12) · error codes: `VALIDATION` / `MEMBER_NOT_FOUND` / `ALREADY_ACTIVATED` / `NOT_FOUND` / `METHOD_NOT_ALLOWED` / `INTERNAL` · ทดสอบ `testApiLayer` (34/34) · ✅ **Bot เรียกผ่าน API แล้ว (การ์ด MT-17 — ครบ reads + commands)** — EventHandler ใช้ `Api.ApiService.handleRequest` สำหรับข้อมูลสมาชิก (profile/savings/loans/dividends) · `ActivationService`/`RenewalService` เรียก `POST /api/member/activate`/`renew` (ตรรกะอยู่ที่ API handler — UI work อยู่ที่ Bot) · ✅ **Mount ใน WebApp แล้ว** — `doGet`/`doPost` แยก `/api/*` → `Api.ApiService` + ตรวจ API key (`?api_key=`/body, `/api/health` เปิดสาธารณะ — บทที่ 5.10) · **เหลือ:** Auth per-channel (X-Line-Signature / ID Token JWT — เฟส 3) + LIFF/Admin เรียกผ่าน API (การ์ด MT-18–19, MT-21)

**การยืนยันตัวตนรายช่องทาง (Per-Request Auth):**

| ช่องทาง | กลไกยืนยันตัวตน |
|---------|----------------|
| LINE Bot (Webhook) | `X-Line-Signature` (HMAC-SHA256 + Channel Secret) |
| LIFF | **ID Token (JWT)** จาก LINE Login — ตรวจสอบ signature ด้วย Channel Secret แล้วใช้ `sub` = userId |
| Admin Dashboard | API Key / เซสชันของระบบเอง (เฟสถัดไป) |

**หลักการที่ทำให้ Test / แก้ / อ่าน / ต่อยอดง่าย:**
1. **Core เป็น pure functions** — ไม่แตะ SpreadsheetApp/UrlFetchApp → เทสต์ใน node ได้ทันทีโดยไม่ต้อง mock
2. **Registry routing** — เพิ่ม endpoint = เพิ่ม 1 รายการในตาราง route (แทน if/else ยาว)
3. **Response format มาตรฐาน** — ทุก client ตรวจผลด้วย `{ok, error, data}` เหมือนกัน
4. **UI ไม่ผูกกับแกน** — เปลี่ยนจาก Bot → LIFF → แอปมือถือ โดยไม่แตะ business logic

**ตัวอย่างการใช้งาน:** เครื่องคำนวณสินเชื่อ — ย้ายสูตรขึ้น `Core/LoanService` แล้วให้ทั้งหน้าเว็บ, LIFF, และ Bot (คำสั่ง `คำนวณ 100000`) เรียกใช้สูตรเดียวกัน ควบคุมสูตรเดียวที่จุดเดียว
> ✅ สูตร Actual/365 ถูกย้ายขึ้น `Core/LoanCalculator.js` แล้ว (การ์ด MT-15) — เหลือการเชื่อม UI ทั้งหมด (หน้าเว็บ/Bot) ให้ใช้ Core เดียวกันในเฟส 3
>
> ✅ **แปลงวันที่ชีท ↔ Firestore TIMESTAMP:** `Core/DateConverter.js` (การ์ด MT-31) — pure functions + เทสต์ใน node (15/15) พร้อมใช้ใน `FirestoreMemberRepository` เมื่อถึงเฟส 3 (ดู data-dictionary.md)

## 3.2 การออกแบบข้อมูล (Data Design)

### 3.2.1 หลักการ

- ใช้ Google Sheets เป็นฐานข้อมูลหลัก (ไม่ต้องมีเซิร์ฟเวอร์)
- โครงสร้างตาราง/คอลัมน์ถูกนิยามใน `DataDict.js` (SSOT) เพียงที่เดียว
- เมื่อเปิดระบบครั้งแรก `SheetService.getSheet()` จะสร้าง Sheet และ Header ให้อัตโนมัติหากยังไม่มี
- **ตำแหน่งคอลัมน์ไม่สำคัญ (Header-driven)** — ระบบอ่าน/เขียนโดย map จาก **header row จริงของชีท** (การ์ด MT-28) จึง**สลับตำแหน่งฟิลด์ในตารางได้** โดยไม่พัง: `DataDict.rowToObjectByHeaders` / `objectToRowByHeaders` + `SheetService.getHeaderMap` — DataDict ใช้เป็น SSOT สำหรับสร้างชีทใหม่และเป็น "ชื่อมาตรฐาน" ของคอลัมน์เท่านั้น
  - ข้อควรระวัง: ถ้าคอลัมน์ที่จำเป็น (เช่น `activate_code`) **หายไป** จาก header → ระบบ throw error ชัดเจน (ไม่ทำงานผิดเงียบ ๆ)

### 3.2.2 ตาราง `t_member_mast` (MEMBER_MASTER)

ตารางหลักข้อมูลสมาชิก มีคอลัมน์ 16 รายการ

| # | คอลัมน์ | ประเภท | บังคับ | ค่าเริ่มต้น | คำอธิบาย |
|---|---------|--------|--------|------------|----------|
| 1 | `mem_code` | string | ✅ | - | รหัสสมาชิก (Primary Key) |
| 2 | `mem_title` | string | - | - | คำนำหน้า (นาย/นาง/นางสาว) |
| 3 | `mem_fname` | string | ✅ | - | ชื่อ |
| 4 | `mem_lname` | string | ✅ | - | นามสกุล |
| 5 | `mem_rank_score` | number | - | - | คะแนนชั้น/ตำแหน่ง |
| 6 | `mem_position` | string | - | - | ตำแหน่ง |
| 7 | `mem_position_score` | number | - | - | คะแนนตำแหน่ง |
| 8 | `mem_eff_dt` | date | - | - | วันที่มีผล (ใช้เป็นตัวชี้ว่า activate แล้ว) |
| 9 | `mem_exp_dt` | date | - | - | วันหมดอายุ (activate = now + 365 วัน) |
| 10 | `mem_status` | string | - | `inactive` | สถานะสมาชิก |
| 11 | `activate_code` | string | - | - | รหัส Activate (Unique) |
| 12 | `line_user_id` | string | - | - | LINE User ID |
| 13 | `mem_role` | string | - | `member` | บทบาท (member / staff / admin) |
| 14 | `mem_kk` | number | - | - | คะแนนความดี |
| 15 | `mem_bk` | number | - | - | เงินกู้คงค้าง (บาท) |
| 16 | `mem_bh` | number | - | - | เงินหุ้น (บาท) |

**รูปแบบวันที่:** เก็บเป็นข้อความ
- date → `yyyy-mm-dd` เช่น `2026-08-12`
- datetime → `yyyy-mm-dd HH:mm:ss` เช่น `2026-08-12 14:30:00`

**ตัวอย่างข้อมูล**

| mem_code | mem_title | mem_fname | mem_lname | mem_eff_dt | mem_exp_dt | mem_status | activate_code | line_user_id | mem_role |
|----------|-----------|-----------|-----------|------------|------------|------------|---------------|--------------|----------|
| M001 | นาย | สมชาย | ใจดี | | | inactive | ABC123 | | member |
| M002 | นางสาว | สมหญิง | รักเรียน | 2026-08-06 09:15:00 | 2027-08-06 09:15:00 | active | XYZ789 | U1234567890abcdef | member |

> เอกสารฉบับเต็มของ Data Dictionary ดูได้ที่ [data-dictionary.md](./data-dictionary.md)

### 3.2.2b ตารางเพิ่มเติมตาม use case (การ์ด MT-27) ✅ ทำแล้ว (dummy data)

สร้างตารางใหม่ตาม use case/กลุ่มเมนู โดยใช้หลักการตั้งชื่อ **lower case + ขึ้นต้น `t_`** (ขยายได้ในอนาคต — บทที่ 2.4.3):

| ตาราง | ใช้กับเมนู/use case | ข้อมูล |
|-------|--------------------|--------|
| `t_savings_acct` | saving_acct / chk_balance | บัญชีเงินฝาก + ยอดคงเหลือ |
| `t_loan_acct` | loan_balance | ยอดหนี้เงินกู้ (เลขสัญญา/วงเงิน/คงค้าง/ครบกำหนด) |
| `t_dividend` | dividends / share_capital | เงินปันผล + เงินหุ้นรายปี |
| `t_activation_log` | audit trail (Activate) — เตรียม Actor staff/admin | บันทึกการ Activate (log_id/mem_code/status/เวลา) |

- โครงสร้างคอลัมน์นิยามใน `DataDict.js` (SSOT) — ดูรายละเอียด [data-dictionary.md](./data-dictionary.md)
- สร้างตาราง + ข้อมูลตัวอย่าง (dummy) ด้วย `SeedData.createDummyTables()` (บทที่ 5.6.4) — ไม่ทับข้อมูลเดิม
- เมนูการเงินอ่านข้อมูลจริงผ่าน repository (`findSavingsByMember`/`findLoansByMember`/`findDividendsByMember`)

### 3.2.3 ฟังก์ชันหลักของ DataDict

| ฟังก์ชัน | หน้าที่ |
|---------|--------|
| `getTable(key)` / `getColumns(key)` | ดึงคำนิยามตาราง/คอลัมน์ |
| `getColumnIndex(key, col)` | หา index ของคอลัมน์ (0-based) |
| `rowToObject` / `objectToRow` | แปลงระหว่าง array กับ object พร้อมแปลงชนิดข้อมูล |
| `validate(key, data)` | ตรวจสอบความถูกต้อง (required/type) |
| `query(key)` | สร้างตัวช่วยค้นหา (`where`, `findBy`) |
| `formatDate` / `formatDateTime` | จัดรูปแบบวันที่ |

### 3.2.4 การออกแบบ Data Layer เพื่อรองรับการเปลี่ยนฐานข้อมูลในอนาคต (Repository Pattern) ✅ ฐาน Sheets ทำแล้ว · Firestore 📌 เฟส 3

> หลักการ: **ธุรกิจ (Business Logic) ต้องไม่รู้ว่าข้อมูลถูกเก็บไว้ที่ไหน** — เก็บไว้ใน Google Sheets วันนี้ แต่ในอนาคตอาจเปลี่ยนเป็น Firestore / PostgreSQL / ฐานข้อมูลอื่นได้โดยไม่ต้องแก้โค้ดธุรกิจ

**สถานะ implement (การ์ด MT-20):**
- ✅ `Data/MemberRepository.js` — สัญญา (interface) + `getRepository()` factory อ่าน `Config.DB_TYPE` (ค่า default `sheets`)
- ✅ `Data/SheetsMemberRepository.js` — ห่อ `LineBot.SheetService` (SpreadsheetApp ถูกจำกัดใน layer นี้)
- ✅ `ActivationService` + Gate ใน `EventHandler` เรียกผ่าน repository แล้ว
- 📌 `FirestoreMemberRepository` — อนาคต (เฟส 3) — factory จะ throw อย่างชัดเจนถ้าเลือก `DB_TYPE=firestore` ยังไม่ implement

**แนวคิด: Repository Pattern (แยก Data Access Layer)**

```text
Core / Business Logic (pure — validity, role, loan calc)
        │  เรียกผ่าน interface เท่านั้น ไม่รู้ว่าข้อมูลมาจากไหน
        ▼
MemberRepository (สัญญา/interface)
   findByLineUserId · findByActivateCode · activate · ...
        ▲
   ┌────┴───────────────┐
   ▼                    ▼
SheetsRepository       FirestoreRepository (อนาคต)
(SpreadsheetApp)       (FirebaseApp) / PostgreSQL / Airtable
```

**กฎเหล็ก 4 ข้อ**

| # | กฎ | เหตุผล |
|---|-----|--------|
| 1 | **ห้าม `SpreadsheetApp`/`UrlFetchApp` หลุดนอก repository** | โค้ดธุรกิจต้องไม่รู้ว่าข้อมูลเก็บที่ไหน |
| 2 | **ข้อมูลส่งผ่านเป็น object ธรรมดา** (member object) — ไม่มี `rowIndex`, `getRange` | interface เป็นกลาง ไม่ผูกกับชีท |
| 3 | **เปลี่ยน DB = เขียน repository ใหม่ + เปลี่ยน factory 1 จุด** | Config เก็บ `DB_TYPE=sheets` → `firestore` |
| 4 | **ธุรกิจล้วน (validity/role) อยู่ Core ไม่ใช่ data layer** | `isActiveMember`/`hasRole` ต้องย้ายไป Core — เทสต์ได้โดยไม่ต้องแตะชีท |

**โค้ดเป้าหมาย**

```javascript
// 1) interface — Core เรียกผ่านฟังก์ชันเหล่านี้เท่านั้น
const MemberRepository = {
  findByLineUserId(id),
  findByActivateCode(code),
  activate(memCode, lineUserId),
  isActive(member)          // ← จริงๆ ย้ายไป Core
};

// 2) factory — เปลี่ยนฐานข้อมูล แก้บรรทัดเดียว
function getMemberRepository() {
  const type = Config.get().DB_TYPE || 'sheets';
  return type === 'firestore'
    ? FirestoreMemberRepository      // อนาคต: เขียนใหม่ ไม่แตะ Core
    : SheetsMemberRepository;        // ปัจจุบัน: ห่อ SheetService เดิม
}
```

**ลำดับการทำ (incremental — ไม่กระทบผู้ใช้)**

1. สร้าง interface + `SheetsMemberRepository` — ห่อ `SheetService` เดิม พฤติกรรมเหมือนเดิม
2. ไล่แก้ผู้ใช้ (`ActivationService`, Gate ใน EventHandler) ให้เรียกผ่าน repository — ไม่มี `SpreadsheetApp` นอก layer
3. รันชุดทดสอบ — ต้องผ่านเหมือนเดิม (behavior ไม่เปลี่ยน)
4. อนาคต: เขียน `FirestoreMemberRepository` + เปลี่ยน `DB_TYPE` → เสร็จ

**ผลพลอยได้ที่สำคัญ:** เทสต์ง่ายขึ้นมาก — unit test ใช้ **fake repository** ได้โดยไม่ต้องพึ่งชีทจริง (สอดคล้องกับหลัก API-First/Core ในหัวข้อ 3.1.1)

## 3.3 การออกแบบ Rich Menu (UI/UX Design)

### 3.3.1 ภาพรวม

- ขนาดภาพ: **2500 × 1686 px** (ขนาดที่ LINE รองรับ)
- แบ่งเป็น **5 แท็บ** แต่ละแท็บมีภาพพื้นหลังของตัวเอง (อัปโหลดจาก Google Drive)
- แต่ละแท็บมี 2 ส่วน:
  - **Tab Navigation Areas** — พื้นที่ 5 จุดด้านบนสำหรับสลับแท็บ
  - **Menu Areas** — พื้นที่คลิกเมนูย่อยในแต่ละแท็บ

### 3.3.2 ตาราง Alias และแท็บ

| แท็บ | ชื่อเมนู | Rich Menu Alias | ภาพ (Drive File ID) |
|------|----------|-----------------|---------------------|
| Tab 1 | ข้อมูลส่วนตัว | `alias-tab-1-profile` | `17hJFYQ_363NgPVqdSkqJpXmbwjkGsDXy` |
| Tab 2 | เงินกู้ & สวัสดิการ | `alias-tab-2-loan` | `1REoevCRTD9VOOWLUbDbigM_amfJV1RqY` |
| Tab 3 | ข่าวสารสหกรณ์ | `alias-tab-3-news` | `1ybW7O8YTI62pgsv9pjxGZMlI6xxp9L-0` |
| Tab 4 | เอกสาร & คู่มือ | `alias-tab-4-documents` | `12Zus-cTm5zbDa5OE5ulPCHep-Vmn7PRp` |
| Tab 5 | ติดต่อเรา | `alias-tab-5-contact` | `10po9Z-rzROkoMvJ9fblx7tV_0i4XF-71` |

### 3.3.3 เมนูย่อยในแต่ละแท็บ

**Tab 1: ข้อมูลส่วนตัว (6 เมนู)**

| item | ป้ายข้อความ | ประเภท Action |
|------|-------------|---------------|
| `saving_acct` | บัญชีเงินฝาก | postback |
| `chk_balance` | เช็คยอดเงิน | postback |
| `dividends` | เงินปันผล | postback |
| `share_capital` | ทุนเรือนหุ้น | postback |
| `profile` | ข้อมูลส่วนตัว | postback |
| `chg_password` | เปลี่ยนรหัสผ่าน | postback |

**Tab 2: เงินกู้ & สวัสดิการ (6 เมนู)**

| item | ป้ายข้อความ | ประเภท Action |
|------|-------------|---------------|
| `loan_apply` | ยื่นคำขอกู้ | postback |
| `loan_balance` | ยอดเงินกู้คงเหลือ | postback |
| `loan_calc` | เครื่องคำนวณเงินกู้ | **uri** → loan_calculator.html |
| `calc_install` | คำนวณเงินผ่อนชำระ | postback |
| `welfare` | สวัสดิการสมาชิก | postback |
| `emergency` | กองทุนฉุกเฉิน | postback |

**Tab 3: ข่าวสารสหกรณ์ (5 เมนู)**

| item | ป้ายข้อความ | ประเภท Action |
|------|-------------|---------------|
| `news_pr` | ข่าวประชาสัมพันธ์ | postback |
| `activities` | ข่าวกิจกรรม | postback |
| `announce` | ประกาศสหกรณ์ | postback |
| `about_coop` | เกี่ยวกับสหกรณ์ | postback |
| `perf_report` | ผลการดำเนินงาน | postback |

**Tab 4: เอกสาร & คู่มือ (4 เมนู)**

| item | ป้ายข้อความ | ประเภท Action |
|------|-------------|---------------|
| `manual` | คู่มือสมาชิก | postback |
| `dl_forms` | ดาวน์โหลดแบบฟอร์ม | postback |
| `rules` | ระเบียบและข้อบังคับ | postback |
| `annual_report` | รายงานประจำปี | postback |

**Tab 5: ติดต่อเรา (5 เมนู)**

| item | ป้ายข้อความ | ประเภท Action |
|------|-------------|---------------|
| `contact_coop` | ติดต่อสหกรณ์ | postback |
| `contact_staff` | ติดต่อเจ้าหน้าที่ | postback |
| `office_loc` | ที่ตั้งสำนักงาน | postback |
| `faq` | คำถามที่พบบ่อย | postback |
| `feedback` | แจ้งปัญหา/ร้องเรียน | postback |

### 3.3.4 รูปแบบ Action (Contract)

**Postback (คลิกเมนูย่อย):**

```json
{
  "type": "postback",
  "label": "บัญชีเงินฝาก",
  "data": "action=menu_item&item=saving_acct",
  "displayText": "บัญชีเงินฝาก"
}
```

**สลับแท็บ:**

```json
{
  "type": "richmenuswitch",
  "richMenuAliasId": "alias-tab-2-loan",
  "data": "action=switch_tab&to=tab_2"
}
```

**URI (เปิดลิงก์ภายนอก):**

```json
{
  "type": "uri",
  "label": "เครื่องคำนวณเงินกู้",
  "uri": "https://idev006.github.io/MTP6LineCoopBot/loan_calculator.html"
}
```

### 3.3.5 พิกัดพื้นที่คลิก (Areas)

แต่ละ Area ใช้ `calcBounds(coords)` คำนวณจากพิกัด polygon เป็น `{x, y, width, height}` ตัวอย่างพิกัดแท็บด้านบน:

```javascript
// Tab 1: ข้อมูลส่วนตัว
const TAB_1_COORDS = [
  { x: 82,  y: 97  },
  { x: 494, y: 91  },
  { x: 491, y: 398 },
  { x: 76,  y: 398 }
];
```

> พิกัดทั้งหมดถูกนิยามใน `app/RichMenu/MenuData.js`

### 3.3.6 การควบคุมเมนูตามสิทธิ์สมาชิก (Per-User Rich Menu Gating) ✅ ทำแล้ว

สมาชิกที่ยังไม่ได้ Activate หรือหมดอายุ จะ**ไม่เห็นเมนูของสมาชิก** โดยใช้กลไก Rich Menu แบบรายบุคคล (Individual Rich Menu) ของ LINE

**หลักการ:**

| ผู้ใช้ | Rich Menu ที่เห็น |
|-------|------------------|
| ยังไม่ได้ Activate / หมดอายุ / ไม่มีสิทธิ์ | **Welcome Menu** (เมนูต้อนรับ — เป็นค่า default) แสดงขั้นตอน Activate และข้อมูลติดต่อ |
| Activate แล้วและ valid | **Member Menu** (Tab 1–5) — ถูกผูกเป็นรายบุคคล |

**API ของ LINE ที่ใช้ (implement ใน `RichMenu/ApiService.js`):**

```text
POST   /v2/bot/user/{userId}/richmenu/{richMenuId}   # ผูกเมนูสมาชิกให้ผู้ใช้คนนี้ (แทนที่ default) — ApiService.linkUser
DELETE /v2/bot/user/{userId}/richmenu                # คืนค่าไปใช้ default (Welcome Menu) — ApiService.unlinkUser
GET    /v2/bot/richmenu/alias/{aliasId}              # หา richMenuId จาก alias — ApiService.getRichMenuIdByAlias
GET    /v2/bot/user/{userId}/richmenu                # ตรวจเมนูปัจจุบันของผู้ใช้ — ApiService.getUserRichMenu
```

**Flow หลัง Activate สำเร็จ (implement แล้ว):**
1. เขียนข้อมูลสมาชิกใน `t_member_mast` (`mem_eff_dt` / `mem_exp_dt` / `mem_status` / `line_user_id`)
2. ผูก Member Menu (Tab 1) ให้กับ `line_user_id` — `RichMenu.Gating.linkMemberMenu()` (เรียกจาก `ActivationService`)
3. ส่ง Flex Message ต้อนรับ → สมาชิกเห็นเมนูสมาชิก (5 แท็บ) ทันที

**Flow เมื่อหมดอายุ / ถูกเพิกถอน (implement แล้ว):**
1. ตรวจพบสมาชิกไม่ valid (ช่วงวันหมด / `mem_status` ไม่ใช่ `active`) — ที่ Gate ใน `EventHandler`
2. ยกเลิกการผูกเมนู (unlink) → กลับไปเห็น Welcome Menu — `RichMenu.Gating.unlinkMemberMenu()`
3. (อนาคต) แจ้งเตือนสมาชิกให้ต่ออายุ

**หมายเหตุ:** กลไกนี้ควบคุมเฉพาะ UI — การอนุญาตจริงต้องตรวจที่ Server เสมอ (ดูบทที่ 3.6–3.7) · **การ Deploy:** `Deployer.deploy()` สร้าง Welcome Menu + ตั้งเป็น default แล้ว (ผู้ไม่ Activate เห็น Welcome อัตโนมัติ)

### 3.3.7 สัญญา Item ID และ Checklist ก่อน Deploy (Menu Item ID Contract)

**กฎของสัญญา:** item id ที่กำหนดใน `RichMenu/MenuData.js` (ผ่าน `postback('id', label)`) ต้องมี key ตรงกันใน `LineBot/ReplyStore.js` ทั้งใน `CAPTIONS` (ชื่อเมนูภาษาไทย) และข้อความตอบกลับ (`TAB_1`–`TAB_5`) ครบทุกเมนู

```text
MenuData.js (RichMenu)                  ReplyStore.js (LineBot)
postback('saving_acct', 'บัญชีเงินฝาก')  ←───▶  CAPTIONS.saving_acct = 'บัญชีเงินฝาก'
                                                    TAB_1.saving_acct = 'กำลังดึงข้อมูล...'
```

**เส้นทางการทำงาน (ทำไมสัญญานี้ถึงสำคัญ):**

```text
คลิกเมนู → postback data: action=menu_item&item=saving_acct
        → EventHandler.getCaption('saving_acct')
        → CAPTIONS['saving_acct'] หรือคืน id กลับมา (ถ้าไม่พบ key)
        → ถ้าตรงกัน: Flex แสดง "คุณเลือกเมนู บัญชีเงินฝาก" ✅
        → ถ้าไม่ตรงกัน: Flex แสดง "คุณเลือกเมนู saving_acct" ❌ (id ภาษาอังกฤษหลุดไปให้สมาชิก)
```

**จุดกำหนด id (SSOT):** `MenuData.js` เป็นตัวกำหนด item id ของเมนู ส่วน `ReplyStore.js` กำหนด caption/ข้อความตอบกลับ — ทั้งสองไฟล์ต้องแก้คู่กันเสมอ

**Checklist ก่อน Deploy Rich Menu:**

- [ ] ทุก `postback('id', ...)` ใน `MenuData.js` มี key ตรงกันใน `ReplyStore.CAPTIONS`
- [ ] ทุก id มีข้อความตอบกลับใน `TAB_1`–`TAB_5` (ไม่คืน "ไม่พบข้อมูลสำหรับรายการนี้")
- [ ] caption ทุกตัวเป็นภาษาไทย ไม่มี id ภาษาอังกฤษหลุดไปแสดงแก่สมาชิก
- [ ] รันสคริปต์ตรวจสอบ contract (ตัวอย่างด้านล่าง) หรือทดสอบคลิกเมนูจริงจาก LINE หลัง Deploy
- [ ] หลังแก้ `MenuData.js` ต้องรัน `main()` เพื่อ Deploy Rich Menu ใหม่ (บทที่ 5.6)

**ฟังก์ชันตรวจสอบจริง (อยู่ใน `app/Test.js` — รันใน Apps Script Editor ก่อน Deploy):**

- `verifyMenuContract()` — ตรวจว่าทุก item id จาก `MenuData.listItemIds()` มี key ใน `ReplyStore.CAPTIONS` และมีข้อความตอบกลับครบ → ผ่าน: `Contract OK — ครบ 25 เมนู` / ไม่ผ่าน: throw error
- `verifyThaiCaptions()` — ตรวจว่า caption ทุกตัวเป็นภาษาไทย

จุดสำคัญ: `RichMenu.MenuData.listItemIds()` อ่าน item id **จากเมนูจริง** ใน `MenuData.js` โดยตรง (ไม่ใช่ลิสต์ที่ต้องอัปเดตมือ) ดังนั้นเมื่อเพิ่มเมนูใหม่ ฟังก์ชันตรวจจะครอบคลุมให้อัตโนมัติ

## 3.4 การออกแบบ Flex Message (Message Design)

### 3.4.0 Flex Component Standard (มาตรฐานกลาง — การ์ด MT-33/MT-34)

ระบบมี **Flex Component Library** ใน `FlexBuilder.js` + `FlexTheme.js` เป็น **มาตรฐานเดียวในการสร้าง Flex Message ทั้งหมด** — การ์ดทุกใบประกอบจาก component เดียวกัน ไม่มีใครสร้างโครงสร้าง flex ซ้ำเอง

#### ก. Design Tokens (`FlexTheme.js` — SSOT)

ค่าสี/ขนาด/รัศมี/สถานะทั้งหมดกำหนดไว้ที่เดียว `LineBot.FlexTheme` — เปลี่ยนธีม = แก้ไฟล์นี้ไฟล์เดียว:

| Token | ค่า | ใช้กับ |
|-------|-----|-------|
| `brandColor` | `#1DB446` | header / ปุ่มหลัก (สีสหกรณ์) |
| `white` | `#FFFFFF` | ตัวอักษรบนสีเข้ม / พื้นหลัง body มาตรฐาน |
| `textPrimary` | `#333333` | ตัวอักษรหลัก |
| `textMuted` | `#666666` | ตัวอักษรรอง (เช่น รหัสสมาชิก) |
| `textSecondary` | `#888888` | ตัวอักษรอธิบาย / เชิงอรรถ |
| `boxBg` | `#F0F8F0` | พื้นหลังกล่องข้อมูล (เขียวอ่อน) |
| `statusColors.active/paid/sent` | `#1DB446` | สถานะใช้งานอยู่ / ชำระแล้ว / ส่งแล้ว |
| `statusColors.inactive` | `#95A5A6` | สถานะยังไม่เปิดใช้งาน |
| `statusColors.expiring` | `#E6A23C` | ใกล้หมดอายุ / เตือน |
| `statusColors.expired` | `#E74C3C` | หมดอายุ / ผิดพลาด |
| `statusColors.draft` | `#888888` | ร่าง / ยังไม่เผยแพร่ |
| `bubbleSize` | `'kilo'` | ขนาด bubble มาตรฐาน |
| `paddingMd` / `paddingLg` | `'md'` / `'lg'` | ระยะห่างมาตรฐาน |
| `radiusMd` | `'md'` | รัศมีมุมกล่องข้อมูล |

#### ข. แคตตาล็อก 3 ชั้น (Catalog)

| ชั้น | หน้าที่ | Component | ใช้สร้าง |
|-----|--------|-----------|---------|
| **1. Atoms** — องค์ประกอบย่อยที่สุดของ LINE Flex | `text()` · `button()` · `separator()` · `labelValueRow(label, value)` · `statusBadge(status)` | ทุกข้อความ / ปุ่ม / เส้นคั่น / แถวข้อมูล / ป้ายสถานะ |
| **2. Molecules** — กล่อง/ส่วนประกอบที่รวม atoms | `header(title, opts?)` · `bodyBox(contents, opts?)` · `infoBox(rows, opts?)` · `footerButton(label, data, opts?)` · `buttonRow(buttons, opts?)` (ปุ่มแนวนอนหลายปุ่ม) · **`bubbleFrame({header, body, footer, size})`** (ประกอบส่วนต่าง ๆ เป็น bubble) | โครงสร้าง header/body/footer ของการ์ดทุกใบ |
| **3. Templates** — การ์ดสำเร็จรูปตาม use case | `menuClicked(caption)` · `welcomeMember(member)` · `messageBox(options)` · `profileCard(member, {warning})` · `financeCard(data)` · **`alertCard({level, title, message})`** (success ✅ / warning ⚠️ / error ❌) · **`confirmCard({message, okLabel, okData, cancelData})`** (ปุ่มยืนยัน/ยกเลิก) · **`noticeCard(notice)`** (ประกาศ 📢) · **`loanReminderCard(loan, member, daysLeft)`** (เตือนชำระ 💳) · **`contentCard({title, text, updatedDt?})`** (เนื้อหาเมนูข้อมูล 📄) | ตอบเมนู · ต้อนรับ activate · กล่องข้อความ · โปรไฟล์ · การเงิน · แจ้งเตือน/ผลลัพธ์ · ยืนยันการกระทำ (ต่ออายุ) · ประกาศ · เตือนชำระหนี้ · เนื้อหาเมนูข้อมูล |

**หลักการจัดชั้น:** ชั้นต่ำ (atoms) ไม่รู้จักชั้นบน · ชั้นสูง (templates) ประกอบจากชั้นล่างเท่านั้น — เพิ่มการ์ดใหม่ = ประกอบจาก atoms/molecules ที่มี (ไม่สร้างโครงสร้างซ้ำ)

#### ค. กฎการตั้งชื่อ (Naming Rules)

| ประเภท | กฎ | ตัวอย่าง |
|--------|-----|---------|
| Atom / Molecule | ตั้งตาม**สิ่งที่สร้าง** (camelCase) — ไม่ลงท้ายด้วยอะไรพิเศษ | `text` / `button` / `infoBox` / `header` |
| Template | ตั้งตาม**การใช้งาน** · การ์ดข้อมูลลงท้ายด้วย `Card` | `profileCard` / `financeCard` / `noticeCard` / `loanReminderCard` / `contentCard` |
| Opts | ใช้ชื่อไทย-อังกฤษผสมตามฟิลด์ข้อมูลจริง · `opts?` ระบุว่าไม่บังคับ | `profileCard(member, { warning })` |

#### ง. กฎการใช้งาน (Usage Rules)

1. **ทุก Flex Message ต้องมาจาก `LineBot.FlexBuilder`** — 🚫 **ห้ามสร้าง raw flex object (`type:'flex'`/`type:'bubble'`) นอก `FlexBuilder.js`** · กันด้วย CI: `flex-usage-scan` (scan ทุกไฟล์ `.js` ยกเว้น FlexBuilder)
2. 🚫 **ห้าม hardcode สี hex** — สีทุกสีอ่านจาก `LineBot.FlexTheme` · กันด้วย CI: `flex-theme-scan` + `testFlexComponents`
3. Component เป็น **pure function** — รับ props → คืน Flex object ธรรมดา → เทสต์ใน node ได้ · ไม่เรียก API/ไม่แตะ SpreadsheetApp
4. **ทุก Template ต้องมี `altText` ภาษาไทย** (แสดงเมื่อ LINE ไม่รองรับ Flex)
5. สร้างการ์ดใหม่ = ประกอบจาก atoms/molecules ที่มี (เช่น `header` + `infoBox` + `footerButton` + `bubbleFrame`) — ไม่เขียนโครงสร้าง bubble ซ้ำเอง
6. ข้อมูล (ตัวเลข/วันที่/ชื่อ) จัดรูปแบบที่ **`MemberDataService`** (UI layer) แล้วส่งเข้าตัวการ์ด — FlexBuilder ไม่คำนวณเอง

#### จ. Checklist ก่อนเพิ่ม/แก้การ์ด Flex

- [ ] เพิ่ม template ใน `FlexBuilder.js` (ชั้น 3) — ประกอบจาก atoms/molecules เท่านั้น ไม่มี `type:'flex'` ซ้ำกันเอง
- [ ] สีทั้งหมดอ่านจาก `LineBot.FlexTheme` — ไม่มี hex hardcode
- [ ] มี `altText` ภาษาไทย · รับข้อมูลที่จัดรูปแบบแล้ว (ไม่คำนวณเอง)
- [ ] เพิ่มกรณีตรวจใน `testFlexComponents` (โครงสร้าง + ไม่มี hex) / `testFinanceCards` (ข้อมูลครบ ไม่ปลอมตัวเลข) / `testNoticeLoanCards` (ประกาศ/เตือนชำระ) / `testContentCards` (เมนูข้อมูล) — ตามประเภทการ์ด
- [ ] ใช้ template ที่ `EventHandler` (หรือ service) ผ่าน `replyFlex`/`pushFlex` — **ไม่สร้าง flex object ตรง ๆ ใน EventHandler/service**
- [ ] รัน `node scripts/ci-test.js` — ต้องผ่าน `flex-theme-scan` + `flex-usage-scan` + `ALL TESTS PASS`
- [ ] อัปเดตแคตตาล็อก 3 ชั้นในหัวข้อ ข. นี้ (ถ้าเพิ่ม component ใหม่)

#### ฉ. การบังคับด้วย CI (บทที่ 6 TC-19)

| กลไก | ตรวจอะไร | ไฟล์ |
|------|---------|------|
| `flex-theme-scan` | ไม่มี hex color ใน `FlexBuilder.js` (สีมาจาก FlexTheme) | `scripts/ci-test.js` |
| `flex-usage-scan` | ไม่มี `type:'flex'`/`type:'bubble'` นอก `FlexBuilder.js` | `scripts/ci-test.js` |
| `testFlexComponents` | tokens/atoms/molecules/frame + templates + ไม่มี hex ในฟังก์ชัน | `Test.js` |
| `testFinanceCards` | profileCard/financeCard ข้อมูลครบเหมือน text · noData ไม่ปลอมตัวเลข | `Test.js` |
| `testNoticeLoanCards` | noticeCard/loanReminderCard ข้อมูลครบเหมือน text (ประกาศ/เตือนชำระ) | `Test.js` |
| `testContentCards` | contentCard โครงสร้างตามมาตรฐาน + ตอบการ์ดผ่าน `replyContentItem` + fallback text ถ้าการ์ดส่งไม่ได้ | `Test.js` |

### 3.4.1 `menuClicked(menuCaption)` — ตอบเมื่อคลิกเมนู

- **altText:** `คุณเลือกเมนู <ชื่อเมนู>`
- **โครงสร้าง:** Header (สีเขียว `brandColor`) + Body (ชื่อเมนู + "ระบบกำลังดำเนินการตามคำขอของคุณ") + Footer (ปุ่ม "ตกลง")

### 3.4.2 `welcomeMember(member)` — ต้อนรับหลัง Activate สำเร็จ

- **altText:** `ยินดีต้อนรับ <ชื่อ> คุณได้ activate เรียบร้อยแล้ว`
- **โครงสร้าง:** Header "🎉 ยินดีต้อนรับ" + Body (ชื่อ-นามสกุล, รหัสสมาชิก, ✅ Activate สำเร็จ, วันที่ activate, วันหมดอายุ) + Footer (ปุ่ม "เข้าสู่เมนูหลัก")

### 3.4.3 `messageBox(options)` — กล่องข้อความอเนกประสงค์

พารามิเตอร์ที่ปรับได้: `title`, `message`, `headerColor`, `bodyTextColor`, `boxColor`, `icon`, `extraContents`, `footerButton`, `size` (ค่า default อ่านจาก `FlexTheme`)

**ตัวอย่างการใช้งาน:**

```javascript
LineBot.FlexBuilder.messageBox({
  title: 'ประกาศสหกรณ์',
  message: 'สหกรณ์ปิดทำการวันที่ 12 ส.ค. 2569',
  icon: '📢',
  footerButton: { label: 'ตกลง', data: 'action=ack_announce' }
});
```

> **หมายเหตุ:** ทั้ง 3 template refactor มาใช้ component library เดียวกัน (การ์ด MT-33) — payload ที่ผู้ใช้เห็น**เหมือนเดิมทุกประการ** (ยืนยันด้วย `testFlexComponents`)

### 3.4.4 `alertCard({level, title, message, footerData?})` — แจ้งเตือนตามระดับ (การ์ด MT-35)

- **level:** `success` (เขียว ✅) · `warning` (เหลือง ⚠️) · `error` (แดง ❌) — สี/ไอคอนมาจาก `FlexTheme.statusColors` + `ALERT_LEVELS` (ไม่ hardcode)
- **ใช้กับ:** ผลลัพธ์การกระทำ — activate/renew สำเร็จ (success) · รหัสถูกใช้ไปแล้ว/กรอกไม่ครบ (warning) · ไม่พบรหัส/ผิดพลาด (error)
- โครงสร้าง: Header สีตามระดับ + Body (ข้อความ) + Footer (ปุ่ม "ตกลง")
- ตัวอย่าง:

```javascript
LineBot.FlexBuilder.alertCard({
  level: 'success',
  title: 'ต่ออายุสำเร็จ',
  message: 'ต่ออายุสมาชิกสำเร็จ (รหัส M001)\nสิทธิ์ใหม่ถึงวันที่: 2027-12-31'
});
```

### 3.4.5 `confirmCard({title?, message, info?, okLabel?, okData, cancelLabel?, cancelData?})` — ยืนยันการกระทำ (การ์ด MT-35)

- **ใช้ก่อนการกระทำสำคัญ** เช่น ต่ออายุสมาชิก (`renew`) — ผู้ใช้ต้องกด "ยืนยัน" ก่อนระบบดำเนินการ
- โครงสร้าง: Header "❓ ..." + Body (ข้อความ + กล่องข้อมูล `info`) + Footer **ปุ่ม 2 ปุ่มแนวนอน** (`buttonRow`): [ยกเลิก (secondary)] [ยืนยัน (primary)]
- `okData`/`cancelData` เป็น postback data — เช่น `action=confirm_renew&code=ACT001` / `action=cancel_renew`
- **Flow ต่ออายุ (2 ขั้น):** ① ผู้ใช้ส่ง `renew`/`renew:CODE` → `confirmCard` ② กด "ยืนยันต่ออายุ" → postback `action=confirm_renew` → `RenewalService.handleConfirmRenew` → `alertCard` (สำเร็จ/ผิดพลาด) · กด "ยกเลิก" → `action=cancel_renew` → ข้อความยกเลิก

### 3.4.6 `noticeCard(notice)` — การ์ดประกาศ/ข่าวสาร (การ์ด MT-36)

- **ใช้กับ:** broadcast ประกาศจาก `t_notice` (แทน `buildNoticeText` — `NoticeService.runNoticeBroadcast` push เป็นการ์ด)
- **ข้อมูล:** `title` (หัวข้อ) · `message` (เนื้อหา) · `published_dt` (ประกาศเมื่อ — กล่อง `labelValueRow`)
- **โครงสร้าง:** Header "📢 ประกาศสหกรณ์" (สี `brandColor`) + Body (หัวข้อ bold + เนื้อหา + เส้นคั่น + กล่อง "ประกาศเมื่อ") + Footer (ปุ่ม "ตกลง")
- **altText:** `📢 ประกาศสหกรณ์ — <title>`

### 3.4.7 `loanReminderCard(loan, member, daysLeft)` — การ์ดเตือนชำระหนี้ (การ์ด MT-36)

- **ใช้กับ:** เตือนชำระหนี้รายบุคคลจาก `t_loan_acct` (แทน `buildLoanReminderText` — `LoanReminderService.runLoanReminders` push เป็นการ์ด)
- **ข้อมูล:** ชื่อสมาชิก (จาก `member`) · `loan_no` (สัญญา) · `outstanding` (ยอดคงค้าง — `formatMoney`) · `due_dt` + `daysLeft` (ครบกำหนด + วันเหลือ)
- **โครงสร้าง:** Header "💳 เตือนชำระหนี้" + Body (ชื่อสมาชิก bold + กล่องข้อมูล `labelValueRow` + คำแนะนำชำระ) + Footer (ปุ่ม "ตกลง")
- **altText:** `💳 เตือนชำระหนี้ — คุณ<ชื่อ>` — สมาชิกเห็นการ์ด**รายบุคคล** (ต่างจากประกาศที่ทุกคนได้ข้อความเดียวกัน)

### 3.4.8 `contentCard({title, text, updatedDt?})` — การ์ดเนื้อหาเมนูข้อมูล (การ์ด MT-37)

- **ใช้กับ:** เมนูข้อมูลจาก `t_content` (สวัสดิการ/กองทุนฉุกเฉิน/ติดต่อ/คู่มือ) — `EventHandler.replyContentItem` ตอบการ์ดแทน text (รวม fallback `ReplyStore` เมื่อยังไม่มีข้อมูลในชีท)
- **ข้อมูล:** `title` (หัวการ์ด — caption ภาษาไทยของเมนู เช่น "สวัสดิการสมาชิก") · `text` (เนื้อหา — wrap) · `updatedDt?` (ปรับปรุงล่าสุด — กล่อง `labelValueRow` เฉพาะเมื่อมีค่า)
- **โครงสร้าง:** Header "📄 <title>" (สี `brandColor`) + Body (เนื้อหา wrap) + Footer (ปุ่ม "ตกลง")
- **altText:** `📄 <title>`
- **Fallback:** ถ้า `replyFlex` ส่งการ์ดไม่ได้ → ตอบข้อความ text เดิม (พฤติกรรมไม่พัง)

## 3.5 การออกแบบ Webhook และ Event Handling

### 3.5.1 ข้อกำหนด Webhook URL

| รายการ | ค่า |
|--------|-----|
| Method | POST |
| Content-Type | application/json |
| Response ที่คาดหวัง | `{"status":"ok"}` ภายใน 5 วินาที |

### 3.5.2 Event ที่รองรับ

| Event | จัดการโดย | หมายเหตุ |
|-------|----------|----------|
| `postback` | `handlePostback` | คลิกเมนู / ปุ่มใน Flex / สลับแท็บ |
| `message` (text) | `handleTextMessage` | คำสั่ง `activate:...`, คำสั่ง `คำนวณ...` |

### 3.5.3 ตารางการตัดสินใจของ Postback (Decision Table)

| เงื่อนไข (params) | การทำงาน |
|-------------------|----------|
| `action=switch_tab` | Log และ return (ไม่ตอบข้อความ) |
| `action=stay_tab` | return (ไม่ตอบข้อความ) |
| `action=menu_item&item=<id>` | ตอบ Flex `menuClicked` |
| fallback (`item`/`menu`/`action` ตรงกับ CAPTIONS) | ตอบ Flex `menuClicked` (รองรับ Rich Menu version เก่า) |
| ไม่ตรงเงื่อนไขใด | ตอบข้อความ "ได้รับ postback แล้ว แต่ยังไม่รู้จักเมนู..." |

### 3.5.4 ตารางการตัดสินใจของ Text Message

| ข้อความ | การทำงาน |
|---------|----------|
| ขึ้นต้นด้วย `activate:` | แยกโค้ด → `ActivationService.handleActivate` |
| ขึ้นต้นด้วย `renew:` / เท่ากับ `renew` | แยกโค้ด → `RenewalService.handleRenew` — ต่ออายุ `mem_exp_dt` +1 ปี (การ์ด MT-12) |
| ขึ้นต้นด้วย `คำนวณ` | ตอบ "ระบบกำลังคำนวณผลลัพธ์ให้..." (placeholder) |
| อื่น ๆ | ไม่ตอบ (รองรับการขยายภายหลัง) |

## 3.6 การออกแบบความปลอดภัย (Security Design)

| หัวข้อ | การออกแบบ |
|-------|-----------|
| การยืนยันตัวตนของ Bot | ใช้ `CHANNEL_ACCESS_TOKEN` ใน Header `Authorization: Bearer <token>` ทุกการเรียก LINE API |
| การเก็บ Secrets | Token เก็บใน **Script Properties** (ไม่ควร hardcode ในซอร์สโค้ด) |
| การยืนยันตัวตนสมาชิก | ใช้รหัส `activate_code` แบบใช้ครั้งเดียว (จับคู่ `mem_eff_dt` ว่างอยู่) |
| ข้อมูลส่วนบุคคล | เก็บเฉพาะข้อมูลจำเป็น (`mem_*`, `line_user_id`) ใน Google Sheets ที่ควบคุมสิทธิ์การเข้าถึง |
| สิทธิ์ Web App | `executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS` (LINE ต้องเรียกได้โดยไม่ต้องล็อกอิน) |
| การตรวจสอบ Webhook | ✅ ปฏิเสธ request ที่ไม่มี `webhook_secret` ถูกต้อง (token ผูกท้าย Webhook URL) — หมายเหตุ: Apps Script Web App อ่าน header `X-Line-Signature` ไม่ได้ (Issue #67764685) ฟังก์ชัน `Util.verifyLineSignature` (HMAC-SHA256) พร้อมใช้เมื่อมี proxy รองรับ |
| Rotation | ควรหมุนเปลี่ยน token เมื่อมีข้อสงสัยว่ารั่วไหล (กรณี token เดิมถูก hardcode ไว้ใน `Config.js` ต้องแก้และ rotate ทันที) |

### 3.6.1 ห่วงโซ่การพิสูจน์ตัวตนและการอนุญาต (Authentication & Authorization Chain)

> สถานะ: ขั้นที่ 1 ตรวจสอบแล้วผ่าน `webhook_secret` (หัวข้อ 3.6) · ขั้นที่ 2–4 (userId → lookup → valid) เชื่อมต่อกับ EventHandler แล้ว ✅ · ขั้นที่ 5 (ตารางสิทธิ์ PERMISSIONS รายละเอียด/คำสั่งเฉพาะบทบาท) ยังเป็นเฟส 2–3

```text
1. Request มาจาก LINE จริงหรือไม่  → ตรวจ X-Line-Signature (HMAC-SHA256 + Channel Secret)
2. ใครเป็นผู้ส่ง                → event.source.userId (LINE ยืนยันตัวตนแล้ว ปลอมแปลงไม่ได้)
3. ผูกกับสมาชิกคนไหน            → SheetService.findByLineUserId(userId) → t_member_mast
4. สมาชิกยัง valid หรือไม่      → isActiveMember: mem_eff_dt ≤ now ≤ mem_exp_dt + mem_status='active'
5. บทบาทมีสิทธิ์หรือไม่          → hasRole(member, role) + ตารางสิทธิ์ (หัวข้อ 3.7)
6. ผ่านทุกขั้นตอน → ตอบสนองคำขอ
```

| ขั้น | คำถาม | กลไก |
|-----|-------|------|
| 1 | Request มาจาก LINE จริง? | `X-Line-Signature` (HMAC-SHA256 + Channel Secret) |
| 2 | ใครส่ง? | `event.source.userId` — LINE ยืนยันตัวตนแล้ว |
| 3 | ผูกกับสมาชิกคนไหน? | `SheetService.findByLineUserId(userId)` → `t_member_mast` |
| 4 | ยัง valid? | `SheetService.isActiveMember(member)` |
| 5 | มีสิทธิ์? | `SheetService.hasRole(member, role)` + ตารางสิทธิ์ (หัวข้อ 3.7) |

**หลักการสำคัญ:** Client (LINE) บอกได้เพียง "คลิกอะไร" แต่ไม่ใช่ "เป็นใครที่มีสิทธิ" — ตัวตนมาจาก LINE Platform และสิทธิถูกตรวจที่ Server ทุก request ตรวจซ้ำเสมอ ไม่เชื่อข้อมูลจาก Client ฝ่ายเดียว และไม่ cache ผลการอนุญาต

## 3.7 การออกแบบการควบคุมสิทธิ์ตามบทบาท (Role-Based Access Control)

ฟิลด์ `mem_role` ใน `t_member_mast` ใช้กำหนดบทบาทของสมาชิก เพื่อควบคุมสิทธิ์การเข้าถึงเมนู/คำสั่งต่าง ๆ ที่ Server

### 3.7.1 ค่าบทบาทที่แนะนำ

| ค่า (เก็บในชีท) | ความหมาย | ตัวอย่างสิทธิ์ |
|----------------|-----------|---------------|
| `member` (ค่าเริ่มต้น) | สมาชิกทั่วไป | ดูยอดเงินฝาก หนี้สิน เอกสารของตัวเอง |
| `staff` | เจ้าหน้าที่สหกรณ์ | สิทธิ์สมาชิก + ดูข้อมูลสมาชิก ส่งข่าวสาร |
| `admin` | ผู้ดูแลระบบ/กรรมการ | สิทธิ์เจ้าหน้าที่ + จัดการบทบาท ตั้งค่าระบบ ส่งประกาศ (Broadcast) |

### 3.7.2 นิยามความ valid ของสมาชิก (Member Validity Rule)

สมาชิกจะถือว่า **valid** เมื่อเงื่อนไขครบทั้ง 3 ข้อ:

```text
valid member ⇔ (mem_eff_dt ≤ now ≤ mem_exp_dt)  AND  mem_status = 'active'  AND  mem_role = 'member'
```

รายละเอียดแต่ละเงื่อนไข:

| เงื่อนไข | คำอธิบาย |
|----------|----------|
| ช่วงวันที่มีผล | วันเวลาปัจจุบันอยู่ในช่วง `[mem_eff_dt, mem_exp_dt]` (ขอบเขตรวม) |
| สถานะ | `mem_status = 'active'` |
| บทบาท | `mem_role = 'member'` (กรณีตรวจบทบาทอื่น เช่น staff/admin ให้เปลี่ยนค่านี้ตามบทบาท) |

**Fail-safe:** หาก `mem_eff_dt` หรือ `mem_exp_dt` ไม่มีค่า ระบบจะถือว่าไม่ valid (ปฏิเสธการเข้าถึง) แม้ `mem_status` จะเป็น `active` ก็ตาม

การตรวจนี้อยู่ใน `LineBot.SheetService.isActiveMember(member)` (ช่วงวัน + สถานะ) และ `hasRole(member, role)` (บวกบทบาท) ซึ่งเรียกใช้ที่ Server ทุกครั้งก่อนตอบสนองคำขอ

### 3.7.3 หลักการใช้งาน

1. **บังคับที่ Server เสมอ** ✅ — ตรวจความ valid และบทบาทใน EventHandler (`getAuthorizedMember`) ก่อนตอบสนองคำขอทุกครั้ง อย่าพึ่งการซ่อนเมนูฝั่ง Client เพียงอย่างเดียว
2. **รวมการตรวจไว้ที่จุดเดียว** — ใช้ helper จาก `SheetService` (`isActiveMember` / `hasRole`) เพื่อให้การกำหนดนโยบายดูแลง่าย
3. **ไม่ให้สมาชิกเปลี่ยนบทบาทเอง** — `mem_role` ถูกกำหนด/แก้ไขโดยเจ้าหน้าที่หรือผู้ดูแลใน Google Sheets เท่านั้น ไม่มีคำสั่งจาก LINE ให้เปลี่ยนบทบาท
4. **ค่าเริ่มต้นเป็น `member`** — สมาชิกใหม่ที่ Activate จะได้บทบาท `member` เสมอ (กำหนดจาก default ใน DataDict)

### 3.7.4 ตัวอย่างการตรวจบทบาท

```javascript
// ตรวจว่าเป็นสมาชิกที่ valid (ช่วงวัน + status) และมีบทบาทตามที่กำหนด
const isMember = LineBot.SheetService.hasRole(member, 'member');
const isStaffOrAdmin = LineBot.SheetService.hasRole(member, 'staff')
  || LineBot.SheetService.hasRole(member, 'admin');

// ใน EventHandler — เฉพาะ staff/admin เท่านั้นที่สั่ง broadcast ได้
if (params.item === 'broadcast_news' && !isStaffOrAdmin) {
  deps.MessageService.reply(replyToken, 'คุณไม่มีสิทธิ์ใช้คำสั่งนี้', token);
  return;
}
```

## สรุปท้ายบท

บทนี้ออกแบบระบบครบทั้ง 3 ชั้น ได้แก่ สถาปัตยกรรม การออกแบบข้อมูล (DataDict + `t_member_mast`) การออกแบบ Rich Menu 5 แท็บ การออกแบบ Flex Message การออกแบบ Webhook/Event และความปลอดภัย บทที่ 4 จะอธิบายโครงสร้างโปรแกรมและโค้ดจริงในแต่ละโมดูล
