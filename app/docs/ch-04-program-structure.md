# บทที่ 4 โครงสร้างโปรแกรม (Program Structure)

## 4.1 โครงสร้างไฟล์และไดเรกทอรี

```text
MTLineCoopBot/
├── .clasp.json                  # กำหนดค่า clasp (scriptId, rootDir = app)
├── loan_calculator.html         # เครื่องคำนวณสินเชื่อ (สำเนาใช้งาน)
├── loan_calculator - Copy.html  # สำเนาสำรอง
└── app/                         # rootDir ของ Apps Script project
    ├── appsscript.json          # manifest: timezone, runtime, webapp settings
    ├── Config.js                # ค่าคอนฟิก + Script Properties
    ├── DataDict.js              # SSOT โครงสร้างข้อมูล (8 ตาราง: t_member_mast + 7 ตาราง MT-27/32/13/13b/14)
    ├── Util.js                  # ฟังก์ชันอรรถประโยชน์
    ├── Core/                    # Business Logic ล้วน (pure — เทสต์ได้ไม่ต้อง mock, การ์ด MT-15)
    │   ├── MemberRules.js       # กฎความ valid สมาชิก (parseDate/isActiveMember/hasRole)
    │   ├── LoanCalculator.js    # สูตรคำนวณสินเชื่อ Actual/365 (ลดต้นลดดอก)
    │   └── DateConverter.js     # แปลงวันที่ชีท <-> Firestore TIMESTAMP (เฟส 3, MT-31)
    ├── Data/                    # Data Access Layer (Repository Pattern — บทที่ 3.2.4)
    │   ├── MemberRepository.js  # สัญญา (interface) + factory เลือก DB ตาม DB_TYPE
    │   └── SheetsMemberRepository.js  # repository สมาชิกบน Google Sheets (ห่อ SheetService)
    ├── WebApp.js                # Entry point doPost(e)
    ├── Test.js                  # ฟังก์ชันทดสอบระบบ (verifyMenuContract ฯลฯ)
    ├── Dashboard.js             # สร้าง KPI Dashboard ของทีม (createDashboard)
    ├── SeedData.js              # สร้างตาราง 8 ตาราง + dummy data (MT-27/32/13/13b/14)
    ├── LineBot/                 # ตรรกะการทำงานของ Bot
    │   ├── ActivationService.js # Activate สมาชิก
    │   ├── ExpiryService.js     # ตรวจวันหมดอายุอัตโนมัติ (MT-11) — scan + push + unlink
    │   ├── RenewalService.js    # ต่ออายุสมาชิก (MT-12) — renew:CODE / renew ตัวเอง
    │   ├── NoticeService.js     # Broadcast ประกาศ (MT-13) — t_notice → push สมาชิก active
    │   ├── LoanReminderService.js # เตือนชำระหนี้ (MT-13b) — t_loan_acct → push รายบุคคล
    │   ├── EventHandler.js      # Router จัดการ event
    │   ├── MemberDataService.js # จัดรูปแบบข้อมูลสมาชิกจริง (MT-10) — profile/เมนูการเงิน
    │   ├── FlexTheme.js         # Design tokens ของ Flex Message (MT-33) — สี/ขนาด/รัศมี SSOT
    │   ├── FlexBuilder.js       # Flex Component Library + สร้าง Flex Message (MT-33)
    │   ├── MessageService.js    # เรียก LINE Reply API
    │   ├── ReplyStore.js        # ข้อความ/ชื่อเมนูของแต่ละ item
    │   └── SheetService.js      # ติดต่อ Google Sheets
    ├── RichMenu/                # การจัดการ Rich Menu
    │   ├── ApiService.js        # เรียก LINE Rich Menu API (รวม linkUser/unlinkUser)
    │   ├── Deployer.js          # ขั้นตอน deploy 5 แท็บ + Welcome Menu (default)
    │   ├── Gating.js            # Per-User Gating: ผูก/ยกเลิกเมนูรายบุคคล (บทที่ 3.3.6)
    │   └── MenuData.js          # โครงสร้าง/พิกัดเมนู 5 แท็บ + Welcome
    ├── Api/                     # API Layer (เฟส 3 — บทที่ 3.1.1, การ์ด MT-16)
    │   ├── ApiService.js        # จุดเข้า handleRequest(method, path, options)
    │   ├── ApiRegistry.js       # ตาราง route (registry) + dispatch
    │   ├── ApiHandlers.js       # implementation ของ endpoint (ใช้ Core + Repository)
    │   ├── ApiResponse.js       # JSON envelope { ok, data } / { ok, error }
    │   └── ApiError.js          # error ที่มี code (throw ใน handler)
    ├── assets/line_menu/        # ภาพ Rich Menu (tab1-5 .png/.jpg)
    └── docs/                    # เอกสารโครงการ (เล่มนี้)
```

## 4.2 คำอธิบายโมดูล

### 4.2.0 `Core/` — Business Logic ล้วน (Pure Functions)

**`MemberRules.js`** — กฎความ valid ของสมาชิก (ย้ายจาก SheetService)
- `parseDate(value)` — แปลง `yyyy-mm-dd[ HH:mm:ss]` เป็น Date (manual parse กัน timezone)
- `isActiveMember(member, now?)` — สถานะ active + ช่วงวันครอบคลุม `now` (รับ `now` เป็น parameter เพื่อ test deterministic)
- `hasRole(member, role, now?)` — valid + บทบาทตรง
- `getExpiryStatus(member, now?, warningDays?)` — สถานะหมดอายุ: `valid`/`expiring` (เหลือ ≤ warningDays)/`expired` + `daysLeft` (การ์ด MT-11)
- `computeRenewal(member, now?)` — วันหมดอายุใหม่หลังต่ออายุ: `max(now, exp เดิม) + 1 ปี` → `{ newExpDt, fromDt, years }` (การ์ด MT-12)
- `SheetService` delegate มาที่นี่ (API เดิมไม่เปลี่ยน — Gate/Repository ทำงานเหมือนเดิม)

**`LoanCalculator.js`** — เครื่องคำนวณสินเชื่อ (ย้ายสูตรจาก `loan_calculator.html`)
- `getDaysDiff(d1, d2)` / `getNextMonthEnd(startStr, period)` / `round2(n)`
- `calculateLoanSchedule({loanAmount, interestRatePercent, calcMode, calcValue, paymentType, startDate})`
  → `{ schedule, totalInterest, totalPrincipal, totalPayment }` หรือ `{ error }`
- สูตร: ดอกเบี้ย = เงินต้นคงเหลือ × อัตรารายปี × จำนวนวันจริง ÷ 365 (Actual/365 ลดต้นลดดอก)
- หมายเหตุ: `loan_calculator.html` (Vue/GitHub Pages) ยังมีสูตรสำเนาของตัวเอง — จะรวมใช้ Core เดียวกันในเฟส 3 (API-first)

**`DateConverter.js`** — แปลงวันที่ระหว่างรูปแบบชีท (`yyyy-mm-dd` / `yyyy-mm-dd HH:mm:ss`) กับ Firestore TIMESTAMP (เฟส 3 — บทที่ 3.1.1, การ์ด MT-31)
- `toFirestoreTimestamp(value, type)` → `{ seconds, nanos }` (REST Timestamp) — ตีความ wall-clock เป็น UTC เพื่อให้ round-trip ตรงเป๊ะ
- `fromFirestoreTimestamp(ts, type)` → string มาตรฐานชีท — รองรับ Date / `{seconds,nanos}` / RFC3339 string

**`NoticeRules.js`** — กฎ Broadcast ประกาศ (การ์ด MT-13) — pure
- `getPendingNotices(notices, now?)` — กรองประกาศที่พร้อมส่ง: `status='published'` + ยังไม่มี `sent_dt` + `published_dt <= now` (เปรียบเทียบ string ตามมาตรฐาน yyyy-mm-dd HH:mm:ss)
- `buildNoticeText(notice)` — ข้อความ push ประกาศ (📢 ประกาศสหกรณ์ + title + message + published_dt)
- `getBroadcastTargets(members)` — สมาชิกที่ควรได้รับ: active + มี `line_user_id`

**`LoanRules.js`** — กฎเตือนชำระหนี้ (การ์ด MT-13b) — pure
- `getDueLoans(loans, now?, reminderDays?)` — สัญญาที่ถึงรอบเตือน: `due_dt ∈ [now, now + reminderDays]` (ไม่รวมเลยกำหนด/ไม่มี due) → `[{ loan, daysLeft }]`
- `buildLoanReminderText(loan, member, daysLeft)` — ข้อความเตือน**รายบุคคล** (💳 + ชื่อสมาชิกจริง + สัญญา + ยอดคงค้าง + ครบกำหนด)
- `isReminderTarget(member)` — ส่งได้หรือไม่: active + มี `line_user_id`
- `toEpochMillis` / `epochMillisToSheetString` / `timestampToMillis` — helper
- หมายเหตุ: offset timezone ไทย (+07:00) เป็นจุดตัดสินใจเฟส 3 — ดู data-dictionary.md

### 4.2.0b `Data/` — Data Access Layer (Repository Pattern)

**`MemberRepository.js`** — สัญญาและ factory (บทที่ 3.2.4)
- `INTERFACE` — รายการฟังก์ชันที่ทุก repository ต้องมี: `findByLineUserId` · `findByActivateCode` · `activateMember` · `isActiveMember` · `hasRole`
- `assertImplemented(repo)` — ตรวจว่า repository ครบตามสัญญา (throw ถ้าขาด)
- `getRepository()` — เลือก repository ตาม `Config.DB_TYPE` (`sheets` = default / `firestore` = ยังไม่ implement — throw ชัดเจน)

**`SheetsMemberRepository.js`** — repository สมาชิกบน Google Sheets
- ห่อ `LineBot.SheetService` ทั้ง 5 ฟังก์ชัน — **`SpreadsheetApp` ถูกจำกัดอยู่ใน layer นี้เท่านั้น**
- อนาคต: เขียน `FirestoreMemberRepository` แล้วเปลี่ยน `DB_TYPE` → สลับฐานข้อมูลได้โดยไม่แตะ Core/Handler

### 4.2.1 `appsscript.json` (Manifest)

| ฟิลด์ | ค่า | ความหมาย |
|-------|-----|----------|
| `timeZone` | `Asia/Bangkok` | โซนเวลาไทย |
| `runtimeVersion` | `V8` | Runtime สมัยใหม่ของ Apps Script |
| `exceptionLogging` | `STACKDRIVER` | บันทึก exception ไปยัง Stackdriver |
| `webapp.executeAs` | `USER_DEPLOYING` | รันด้วยสิทธิ์ผู้ deploy |
| `webapp.access` | `ANYONE_ANONYMOUS` | เปิดให้เข้าถึงโดยไม่ต้องล็อกอิน (LINE webhook ต้องใช้) |

### 4.2.2 `Config.js`

จัดการค่าคอนฟิกทั้งหมดของระบบ

- `Config.API` — endpoint ของ LINE API (BASE, UPLOAD_BASE, REPLY, DEFAULT)
- `Config.ALIAS` — rich menu alias ทั้ง 5 แท็บ
- `Config.IMAGE_FILE_IDS` — Google Drive File ID ของภาพแต่ละแท็บ
- `Config.RICH_MENU_SIZE` — ขนาด 2500 × 1686 px
- `Config.get()` — อ่านค่า Script Properties (`CHANNEL_ACCESS_TOKEN`, `CHANNEL_SECRET`, `WEBHOOK_SECRET`)
- `Config.setup(values)` — บันทึกค่าเข้่า Script Properties
- `Config.validate()` — ตรวจว่าค่าที่จำเป็นครบ (token + secret + webhook secret)

> **หมายเหตุความปลอดภัย:** token ที่ hardcode ใน `setupConfig()` ถูกย้ายออกแล้ว (2026-08-12) — ตั้งค่าผ่าน Script Properties UI เท่านั้น · CI มี secret scan ที่จะ fail ถ้า token/secret กลับมา hardcode ในโค้ดอีก (บทที่ 8.1.3) · Runbook การหมุน token ดูบทที่ 5.5.1

### 4.2.3 `DataDict.js`

Single Source of Truth สำหรับโครงสร้างข้อมูล (รายละเอียดในบทที่ 3.2)

### 4.2.4 `Util.js`

ฟังก์ชันอรรถประโยชน์กลาง

```javascript
Util.parseQueryString('action=menu_item&item=saving_acct');
// → { action: 'menu_item', item: 'saving_acct' }
```

- `Util.verifyWebhookSecret(e, secret)` — ตรวจ `webhook_secret` จาก query parameter (กันคนนอกเรียก Web App) ✅ ทำแล้ว
- `Util.verifyLineSignature(body, signature, channelSecret)` — ตรวจ X-Line-Signature (HMAC-SHA256) พร้อมใช้เมื่อมี proxy รองรับ (Apps Script อ่าน header ไม่ได้ — Issue #67764685)

### 4.2.5 `WebApp.js`

Entry point ของ LINE webhook

- ตรวจ `e` / `e.postData` / `e.postData.contents` ว่าไม่เป็น undefined
- Parse JSON body และวนลูป `events`
- Dispatch ตามประเภท event: `postback` / `message` (text)
- ตอบ `{status:'ok'}` หลังรับ event; ตอบ `{status:'error'}` เมื่อเกิดข้อผิดพลาด

### 4.2.6 `Test.js`

ฟังก์ชันทดสอบระบบที่รันใน Apps Script Editor (เลือกฟังก์ชันแล้วกด Run)

- `verifyMenuContract()` — ตรวจว่าทุก item id จาก `RichMenu.MenuData.listItemIds()` มี key ใน `ReplyStore.CAPTIONS` และมีข้อความตอบกลับครบ (รายละเอียดบทที่ 3.3.7, TC-12)
- `verifyThaiCaptions()` — ตรวจว่า caption ทุกตัวเป็นภาษาไทย
- `testVerifyLineSignature()` — ทดสอบ `Util.verifyLineSignature` (HMAC-SHA256) ด้วย test vector
- `testVerifyWebhookSecret()` — ทดสอบ `Util.verifyWebhookSecret` (token ใน URL)
- `testMemberValidity()` — ทดสอบ `isActiveMember`/`hasRole`: ช่วงวัน, สถานะ, บทบาท, fail-safe (บทที่ 3.7.2)
- `testMemberRepository()` — ทดสอบ interface + factory ตาม `DB_TYPE` (บทที่ 3.2.4)
- `testMemberDataService()` — ทดสอบ profile ข้อมูลจริง + เมนูการเงินตอบสถานะจริง (MT-10)
- `testSeedData()` — ทดสอบ dummy rows ตรงคอลัมน์ DataDict + ครบ 8 ตาราง (MT-27/32/13/13b/14)
- `testNoPlaceholders()` — ทดสอบว่าไม่มี placeholder คงเหลือใน `ReplyStore`/`WELCOME`/`t_content` (ยังไม่มีข้อมูล/XXX-/กำลังดึง/placeholder/เริ่มขั้นตอน) + ครบทุกรายการ (MT-14)
- `testContentReply()` — ทดสอบเมนูข้อมูลผ่าน EventHandler: มี `t_content` → ตอบ **Flex Card** จากตาราง · ไม่มี → fallback ข้อความจริงใน ReplyStore (ไม่ใช่ flex "คุณเลือกเมนู...") (MT-14/MT-37)
- `testFinanceData()` — ทดสอบ Data Layer เต็ม path: seed → repository → `buildFinanceText` ข้อมูลจริง (ผ่าน Fake SpreadsheetApp ใน CI — MT-27)
- `testColumnReordering()` — ทดสอบ **สลับตำแหน่งคอลัมน์** ใน `t_member_mast`/`t_savings_acct` แล้วอ่าน/เขียนยังถูกต้อง (Header-driven — MT-28)
- `testDateValidator()` — ทดสอบตัวตรวจรูปแบบวันที่: ปฏิเสธ `dd-mm-yyyy`/`T`/`Z`/mixed · ยอมรับ `yyyy-mm-dd` + ค่าว่าง/Date object · `objectToRow` throw พร้อมชื่อคอลัมน์ (MT-29)
- `testDateConverter()` — ทดสอบ Core.DateConverter: round-trip ตรงเป๊ะ · รองรับ Date/`{seconds,nanos}`/RFC3339 · ปฏิเสธรูปแบบผิด (MT-31)
- `testExpiryStatus()` — ทดสอบ `getExpiryStatus`: valid/expiring/expired + daysLeft + ข้อความเตือน (deterministic now — MT-11)
- `testExpiryService()` — ทดสอบ `runExpiryCheck` เต็ม path (Fake Sheets + fake sender): push expiring/expired · unlink เฉพาะ expired · ข้าม inactive/ไม่มี userId · **ตรวจ t_expiry_log** (3 แถว: expiring/expired/valid + days_left ถูกต้อง — MT-32)
- `testApiLayer()` — ทดสอบ Api Layer: registry routing (health/profile/savings/validity/activate/**renew**) · envelope `{ok,error,data}` · error codes (VALIDATION/MEMBER_NOT_FOUND/ALREADY_ACTIVATED/NOT_FOUND/METHOD_NOT_ALLOWED) · ผ่าน Fake Sheets (MT-16/MT-12)
- `testBotUsesApi()` — ทดสอบ Bot เป็น UI Adapter (MT-17): **spy `Api.ApiService.handleRequest`** + fake `MessageService.reply` — postback profile/saving_acct → เรียกผ่าน `/api/member/profile` + `/api/member/savings` (GET) → ข้อความตอบกลับเหมือนเดิมทุกประการ (ชื่อ/คะแนนตำแหน่ง/formatMoney)
- `testActivateViaApi()` — ทดสอบ activate ผ่าน API (MT-17 ครบสโคป): spy `Api.ApiService.handleRequest` — `performActivate`/`handleActivate` เรียก `POST /api/member/activate` (ตรรกะอยู่ที่ API handler · เขียนชีทผ่าน API) · UI work (welcome flex + ผูกเมนู) อยู่ที่ Bot layer · ข้อความ error เหมือนเดิม (ไม่พบรหัส/ถูกใช้ไปแล้ว) · `testRenewal` ผ่าน API เหมือนกัน (seam `ctx.internal.now` — deterministic)
- `testApiMount()` — ทดสอบ API Mount ใน WebApp (บทที่ 5.10): `/api/health` เปิดสาธารณะ · path อื่นไม่มี/ผิด api_key → `UNAUTHORIZED` · profile/activate ผ่าน mount (key จาก query/body) · **LINE webhook (ไม่มี pathInfo) ยังทำงานเหมือนเดิม** (webhook_secret ตรวจเหมือนเดิม)
- `testRenewal()` — ทดสอบต่ออายุ: `computeRenewal` (ต่อจาก exp เดิม/วันนี้) + `performRenew` (รหัส/ตัวเอง · เขียนชีท · active · gater ผูกเมนู · log renewed) · รหัสผิด/ไม่พบสมาชิก (MT-12)
- `testNoticeRules()` — ทดสอบ `Core.NoticeRules` (pure): pending filter (published + ยังไม่ส่ง + ถึงเวลา · ข้ามส่งแล้ว/draft/ยังไม่ถึงเวลา) · buildNoticeText · getBroadcastTargets (MT-13)
- `testNoticeBroadcast()` — ทดสอบ `runNoticeBroadcast` เต็ม path (Fake Sheets + fake sender): broadcast **Flex Card (`noticeCard`)** ถึง active ทุกคน · ข้าม inactive/ไม่มี userId · mark sent (`sent_dt` + status) · **รันรอบ 2 ไม่ส่งซ้ำ** (MT-13/MT-36)
- `testLoanRules()` — ทดสอบ `Core.LoanRules` (pure): due filter (`due_dt ∈ [now, now+days]` · ข้ามเลยกำหนด/ไกลเกิน/ไม่มี due) · daysLeft · buildLoanReminderText รายบุคคล · isReminderTarget (MT-13b)
- `testLoanReminders()` — ทดสอบ `runLoanReminders` เต็ม path (Fake Sheets + fake sender): เตือนเฉพาะสัญญาที่ถึงรอบ · **Flex Card รายบุคคล (`loanReminderCard`)** · skipped (ไม่มี userId) · **ตรวจ t_reminder_log** (reminded/skipped) (MT-13b/MT-36)
- `testNoticeLoanCards()` — ทดสอบ `FlexBuilder.noticeCard`/`loanReminderCard` (การ์ด MT-36): โครงสร้างตามมาตรฐาน 3.4 (altText ไทย · header/sีจาก FlexTheme · ข้อมูลครบเหมือน buildNoticeText/buildLoanReminderText · ไม่ hardcode hex)
- `testContentCards()` — ทดสอบ `FlexBuilder.contentCard` (การ์ด MT-37): โครงสร้างตามมาตรฐาน 3.4 (header caption ไทย · เนื้อหา wrap · กล่องปรับปรุงล่าสุด · altText ไทย · ไม่ hardcode hex) + `replyContentItem` ตอบการ์ดผ่าน `replyFlex` · **fallback ข้อความ text เดิมถ้าการ์ดส่งไม่ได้**
- `checkTokenHealth()` — **ตรวจสุขภาพ Channel Access Token** เรียก LINE `GET /v2/bot/info` → รายงาน `ok/status` + ข้อมูล Bot (ใช้หลังหมุน token บทที่ 5.5.1 หรือตรวจรายเดือน) · **ไม่รันใน CI** (ต้องใช้ token จริง + network)

### 4.2.6b `SeedData.js` — สร้างตาราง + dummy data (การ์ด MT-27)

สร้างตารางตาม use case (naming: lower case + ขึ้นต้น `t_`) พร้อมข้อมูลตัวอย่างสำหรับพัฒนา/ทดสอบ:

- `createDummyTables()` — สร้างชีท 8 ตาราง + dummy data (**non-destructive** — ถ้ามีข้อมูลอยู่แล้วจะข้าม ไม่ทับ): `t_savings_acct` · `t_loan_acct` · `t_dividend` · `t_activation_log` · `t_expiry_log` · `t_notice` · `t_reminder_log` · `t_content`
- `resetDummyTables()` — ล้างข้อมูลแล้วใส่ dummy ใหม่ (ใช้ใน dev/test เท่านั้น)
- `getDummyRows()` — ข้อมูลตัวอย่าง (pure — ทดสอบโครงสร้างใน CI ได้)
- ข้อมูลตัวอย่างใช้รหัสสมาชิก `MEM001`–`MEM003` — ต้องมีใน `t_member_mast` ถึงจะเห็นข้อมูลการเงินในเมนู (บทที่ 5.6.4)
- **ไม่แตะ `t_member_mast`** (เป็นข้อมูลจริงของสมาชิก)

### 4.2.6c `Api/` — API Layer (การ์ด MT-16 — เฟส 3, บทที่ 3.1.1)

สถาปัตยกรรม API-First — UI Adapter ใด ๆ (LINE Bot / LIFF / Admin) เรียกผ่าน `Api.ApiService.handleRequest(method, path, options)` และได้ **JSON envelope** เดียวกันเสมอ:

```json
{ "ok": true,  "data": { ... } }
{ "ok": false, "error": { "code": "MEMBER_NOT_FOUND", "message": "..." } }
```

| ไฟล์ | บทบาท |
|------|--------|
| **`ApiService.js`** | จุดเข้า — รับ method/path/options → สร้าง ctx (query/body/headers/auth) → ส่ง Registry |
| **`ApiRegistry.js`** | ตาราง route (lazy) + `dispatch()` — เพิ่ม endpoint = เพิ่ม 1 รายการในตาราง · จับ Api.ApiError → envelope |
| **`ApiHandlers.js`** | 8 endpoints: `GET /api/health` · `/api/member/profile` · `/savings` · `/loans` · `/dividends` · `/validity` · `POST /api/member/activate` · `POST /api/member/renew` (ต่ออายุ — MT-12) — ใช้ Core + Repository เท่านั้น (ไม่แตะ SpreadsheetApp ตรง ๆ) |
| **`ApiResponse.js`** | ok() / error() / notFound() / methodNotAllowed() / validation() / internal() / toHttp() |
| **`ApiError.js`** | `Api.ApiError.create(code, message, status?)` — throw แล้ว Registry แปลงเป็น envelope |

**Error codes:** `VALIDATION` · `MEMBER_NOT_FOUND` · `ALREADY_ACTIVATED` · `NOT_FOUND` · `METHOD_NOT_ALLOWED` · `INTERNAL`

**สถานะ (การ์ด MT-17):** ✅ **Bot เรียกผ่าน API แล้ว — ครบ reads + commands** — `EventHandler` ใช้ `Api.ApiService.handleRequest` สำหรับข้อมูลสมาชิก (profile/savings/loans/dividends) · `ActivationService`/`RenewalService` เรียก `POST /api/member/activate`/`renew` (ตรรกะ find/check/เขียนชีท อยู่ที่ API handler — UI work อยู่ที่ Bot layer) · seam `ctx.internal` (เช่น `now`) + error `detail` เพื่อ deterministic test/แยกสาเหตุ error · ✅ **Mount ใน WebApp แล้ว** — `doGet`/`doPost` แยก `/api/*` → `Api.ApiService` + ตรวจ **API key** (`?api_key=`/body, `/api/health` เปิดสาธารณะ — บทที่ 5.10) · **ยังไม่ได้ทำ (เฟส 3):** Auth per-channel — X-Line-Signature / ID Token JWT (`ctx.auth` เตรียมไว้แล้ว) · LIFF/Admin เรียกผ่าน API เดียวกัน (การ์ด MT-18–19, MT-21)

### 4.2.7 `LineBot/` — โมดูลการทำงานของ Bot

**`EventHandler.js`** — Router กลาง (การ์ด MT-17: Bot เป็น UI Adapter)
- `getAuthorizedMember(lineUserId)` — **Gate ตรวจสิทธิ์ (auth)** ผ่าน repository (`findByLineUserId` + `isActiveMember` + บทบาท) — ยกเว้น `activate:`/Welcome items
- `apiGet(path, lineUserId)` — เรียกข้อมูลสมาชิกผ่าน **`Api.ApiService.handleRequest`** (endpoint เดียวกับ UI อื่น ๆ): profile → `/api/member/profile` · เมนูการเงิน → `/api/member/savings` | `/loans` | `/dividends` (ตาม `FINANCIAL_API` map — ดึงเฉพาะตารางที่เมนูนั้นใช้) · ถ้า API คืน error → `replyApiDataError` (ข้อความแจ้งเตือน ไม่พัง)
- `replyContentItem(item, replyToken, token)` — ตอบเนื้อหาเมนูข้อมูล/เอกสาร/ติดต่อ (การ์ด MT-14/MT-37): ① อ่านจาก `t_content` (data-driven — แก้ไขในชีทได้) ② fallback ข้อความจริงใน ReplyStore → ตอบ **`contentCard` ผ่าน `replyFlex`** (fallback ข้อความ text เดิมถ้าการ์ดส่งไม่ได้)
- จัดรูปแบบข้อความ (MemberDataService) ยังอยู่ใน UI layer — พฤติกรรมผู้ใช้ไม่เปลี่ยน
- `handlePostback(event, token)` — postback: switch_tab/stay_tab/menu_item (Welcome ผ่านก่อน Gate → profile/finance ผ่าน API → flex อื่น ๆ) + fallback Rich Menu เดิม
- `handlePostback(event, token)` — แยก `params` ด้วย `Util.parseQueryString` แล้วตัดสินใจตามตารางในบทที่ 3.5.3
- ใช้ `getDependencies()` resolve บริการตอน runtime (กันปัญหา Apps Script load order)

**`ActivationService.js`** — Activate สมาชิก (การ์ด MT-17: ตรรกะอยู่ที่ API)
- `performActivate(activateCode, lineUserId, opts?)` — เรียก **`POST /api/member/activate`** (find/check/เขียนชีท อยู่ใน API handler) → `{ success, reason, memberCode?, data? }` (DI: api — ทดสอบใน node ได้)
- `handleActivate(activateCode, lineUserId, replyToken, token)` — เรียก performActivate → สร้าง/ส่ง Flex ต้อนรับ (ข้อมูลชื่อจาก API response) + fallback text + ผูกเมนูสมาชิก
- การ์ด MT-35: error states → **`alertCard`** (warning: รหัสถูกใช้แล้ว/กรอกไม่ครบ · error: ไม่พบรหัส) — fallback ข้อความเดิมถ้าการ์ดส่งไม่ได้ (`sendAlertCard`)
- คืนค่า `{ success, reason, ... }` เพื่อให้ผู้เรียกตรวจสอบผลลัพธ์

**`RenewalService.js`** — ต่ออายุสมาชิก (การ์ด MT-12 + MT-17: ตรรกะอยู่ที่ API)
- `performRenew(activateCode, lineUserId, opts?)` — เรียก **`POST /api/member/renew`** (find → `computeRenewal` → เขียนชีท อยู่ใน API handler · `ctx.internal.now` = seam สำหรับ deterministic test) → log `renewed` ใน t_activation_log → `Gating.linkMemberMenu` (ผูกเมนูกลับ) · error `detail` แยก code_not_found/member_not_found (DI: api/gater/logger/now)
- `handleRenew(activateCode, lineUserId, replyToken, token)` — **ขั้น 1 (การ์ด MT-35): ส่ง `confirmCard` ขอยืนยัน** (ปุ่ม [ยกเลิก `action=cancel_renew`] [ยืนยันต่ออายุ `action=confirm_renew&code=...`]) — ยังไม่ต่ออายุ
- `handleConfirmRenew(activateCode, lineUserId, replyToken, token)` — **ขั้น 2: หลังกดยืนยัน** (postback `action=confirm_renew`) → เรียก performRenew → **`alertCard`** (success: ต่ออายุสำเร็จ + วันใหม่ · error: ไม่พบรหัส/สมาชิก) — fallback ข้อความเดิมถ้าการ์ดส่งไม่ได้

**`ExpiryService.js`** — ตรวจวันหมดอายุสมาชิกอัตโนมัติ (การ์ด MT-11/MT-32)
- `runExpiryCheck(token, opts?)` — scan สมาชิกทั้งหมดผ่าน repository (`listMembers`):
  - **log ทุกการตรวจ** ลง `t_expiry_log` (audit trail — การ์ด MT-32): 1 แถวต่อสมาชิกที่ถูกตรวจ (valid/expiring/expired + days_left)
  - `expiring` (เหลือ ≤ `EXPIRY_WARNING_DAYS` วัน) → push คำเตือนก่อนหมดอายุ
  - `expired` → push แจ้งหมดอายุ + `Gating.unlinkMemberMenu` (กลับไป Welcome)
  - ข้าม inactive / ไม่มี `line_user_id` · รับ `opts.sender/unlinker/logger/now/warningDays` เพื่อทดสอบใน node
- `setupExpiryTrigger(hour?)` — สร้าง Time-driven Trigger รายวัน (รันครั้งเดียวใน Editor — ดูบทที่ 5.9)
- ฟังก์ชันระดับบนสุด `runExpiryCheck()` = entry point ของ trigger (ส่งต่อให้ ExpiryService)

**`NoticeService.js`** — Broadcast ประกาศ/ข่าวสารถึงสมาชิก (การ์ด MT-13/MT-36)
- `runNoticeBroadcast(token, opts?)` — อ่านประกาศจาก `t_notice` ผ่าน repository (`listNotices`) → `Core.NoticeRules.getPendingNotices` (published + ยังไม่ส่ง + ถึงเวลา) → **push Flex Card (`FlexBuilder.noticeCard`) ผ่าน `MessageService.pushFlex`** ถึงสมาชิก active ทุกคนที่มี `line_user_id` (`getBroadcastTargets`) → `markNoticeSent` (เขียน `sent_dt` + `status='sent'` กันส่งซ้ำรอบถัดไป)
  - รับ `opts.repo/sender/now/builder` เพื่อทดสอบใน node · คืน summary `{ notices, pending, sent, targets, pushed }`
- `setupNoticeTrigger(hour?)` — สร้าง Time-driven Trigger รายวัน (รันครั้งเดียวใน Editor — ดูบทที่ 5.9)
- ฟังก์ชันระดับบนสุด `runNoticeBroadcast()` = entry point ของ trigger (ส่งต่อให้ NoticeService)

**`LoanReminderService.js`** — เตือนชำระหนี้ (การ์ด MT-13b/MT-36) — pattern เดียวกับ ExpiryService/NoticeService
- `runLoanReminders(token, opts?)` — อ่านสัญญา (`repo.listLoans`) + สมาชิก (`listMembers`) → `Core.LoanRules.getDueLoans` (due_dt ในหน้าต่าง `PAYMENT_REMINDER_DAYS`) → **push Flex Card รายบุคคล (`FlexBuilder.loanReminderCard`) ผ่าน `MessageService.pushFlex`** (ชื่อสมาชิกจริง — ต่างจาก broadcast) → บันทึก `t_reminder_log` (status `reminded`/`skipped` — skipped = สมาชิกไม่มี userId/ไม่ active)
  - รับ `opts.repo/sender/now/reminderDays/builder/logger` เพื่อทดสอบใน node · คืน summary `{ loans, due, reminded, skipped, pushed }`
- `setupReminderTrigger(hour?)` — สร้าง Time-driven Trigger รายวัน (ดูบทที่ 5.9.3)
- ฟังก์ชันระดับบนสุด `runLoanReminders()` = entry point ของ trigger

**`MemberDataService.js`** — จัดรูปแบบข้อมูลสมาชิกจริง (การ์ด MT-10/MT-27/MT-34)
- `buildProfileText(member)` — โปรไฟล์จริงจาก `t_member_mast`: ชื่อ/รหัส/บทบาท/ตำแหน่ง+คะแนน/ช่วงวันสิทธิ์ (ใช้เป็น fallback เมื่อส่งการ์ดไม่ได้)
- `buildFinanceText(item, member, financeData)` — เมนูการเงินแสดง**ข้อมูลจริง**จาก `t_savings_acct`/`t_loan_acct`/`t_dividend` (ผ่าน `financeData` ที่ EventHandler ดึงจาก repository — pure ฟังก์ชัน ทดสอบใน node ได้) · ถ้าไม่มีข้อมูล → ตอบ "ไม่พบข้อมูล" (ไม่ปลอมตัวเลข) (ใช้เป็น fallback)
- `buildFinanceCardData(item, member, financeData)` — สร้างข้อมูลสำหรับ **Flex Card** (การ์ด MT-34): `{ title, icon, memberCode, rows: [{label,value}], total, noData }` — ข้อมูลเหมือน `buildFinanceText` ไม่หาย
- `formatMoney(value)` — จัดรูปแบบตัวเลขเป็นเงินไทย (เช่น `25,000.00`)
- `buildExpiryWarning(member, expiry)` / `appendExpiryWarning(text, member, expiry)` — ข้อความเตือนวันหมดอายุ (การ์ด MT-11) — ใช้ใน ExpiryService (push) + EventHandler (แนบท้ายคำตอบ)
- `isFinancialItem(item)` / `FINANCIAL_ITEMS` — กลุ่มเมนูการเงิน (saving_acct, chk_balance, dividends, share_capital, loan_balance)

**`FlexTheme.js`** — Design Tokens ของ Flex Message (การ์ด MT-33 — SSOT)
- `brandColor`/`white`/`textPrimary`/`textMuted`/`textSecondary`/`boxBg` — สีมาตรฐาน
- `statusColors` — สีตามสถานะ (active/paid/sent/expiring/expired/draft) ใช้กับ `statusBadge`
- `bubbleSize`/`paddingMd`/`paddingLg`/`radiusMd` — ขนาดมาตรฐาน
- 🚫 **ห้าม hardcode สี hex ในโค้ดอื่น** — อ่านจากที่นี่ (กันด้วย CI `flex-theme-scan` + `testFlexComponents`)

**`FlexBuilder.js`** — Flex Component Library (การ์ด MT-33/MT-34) — สร้าง Flex Message ด้วยมาตรฐานเดียวกัน ไม่ duplicate code
- **Templates:** `menuClicked(caption)` / `welcomeMember(member)` / `messageBox(options)` — payload เหมือนเดิมหลัง refactor (ไม่เปลี่ยนพฤติกรรมผู้ใช้) · **`profileCard(member, {warning})`** / **`financeCard(data)`** — การ์ดข้อมูลสมาชิก/การเงิน (การ์ด MT-34 — ข้อมูลเหมือน text เดิม) · **`alertCard({level, title, message})`** (success/warning/error — การ์ด MT-35) · **`confirmCard({message, okLabel, okData, cancelData})`** (ปุ่มยืนยัน/ยกเลิก — การ์ด MT-35) · **`noticeCard(notice)`** / **`loanReminderCard(loan, member, daysLeft)`** — การ์ดประกาศ/เตือนชำระ (การ์ด MT-36 — ข้อมูลเหมือน text เดิม) · **`contentCard({title, text, updatedDt?})`** — การ์ดเนื้อหาเมนูข้อมูล t_content (การ์ด MT-37 — header caption ไทย + เนื้อหา wrap)
- **Atoms:** `text()` / `button()` / `separator()` / `labelValueRow(label, value)` / `statusBadge(status)`
- **Molecules:** `header(title, opts?)` / `bodyBox(contents, opts?)` / `infoBox(rows, opts?)` / `footerButton(label, data, opts?)` / `buttonRow(buttons, opts?)` (ปุ่มแนวนอนหลายปุ่ม)
- **Frame:** `bubbleFrame({header, body, footer, size})` — ประกอบ bubble จากส่วนประกอบ
- กฎ: ฟังก์ชันเป็น pure + สีจาก `FlexTheme` เท่านั้น · **ห้ามสร้าง raw flex object (`type:'flex'`/`'bubble'`) นอกไฟล์นี้** (กันด้วย CI `flex-usage-scan`) · เทสต์ `testFlexComponents`/`testFinanceCards`/`testNoticeLoanCards`/`testContentCards`

**`MessageService.js`** — ส่งข้อความผ่าน LINE Messaging API
- `reply()` / `replyFlex()` / `send()` — ตอบกลับ (ต้องมี replyToken)
- `push(to, text, token)` — **Push API** ใช้ใน scheduled trigger (MT-11) — ส่งด้วย userId ได้ทุกเวลา (ต่างจาก reply ที่จำกัด 60 วินาที)
- `pushFlex(to, flexMessage, token)` — **Push API แบบ Flex** (การ์ด MT-36) — ใช้ส่งประกาศ/เตือนชำระเป็น Flex Card
- ทุกฟังก์ชันคืนค่า `{ ok, statusCode, body }` เพื่อการ debug

**`ReplyStore.js`** — คลังข้อความและชื่อเมนู (การ์ด MT-14: ไม่มี placeholder คงเหลือ)
- `TAB_1`…`TAB_5` — ข้อความตอบกลับแยกตามแท็บ (key ต้องตรงกับ item id ใน MenuData) — **เป็นข้อความภาษาไทยจริงทุกเมนู** (ทำหน้าที่เป็น static fallback ถ้าไม่มีเนื้อหาใน `t_content`)
- `WELCOME` — ข้อความเมนูสาธารณะ (เปิดใช้งาน/วิธีใช้/ติดต่อ/ข่าวสาร)
- `CAPTIONS` — ชื่อเมนูภาษาไทยที่ใช้แสดงใน Flex (key ต้องตรงกับ item id ใน MenuData)
- `get(item)` / `getCaption(item)` / `set(item, text)`
- ⚠️ **Contract:** หากเพิ่มเมนูใน `MenuData.js` ต้องเพิ่ม key ให้ครบทั้ง `CAPTIONS` และข้อความตอบกลับด้วย ไม่เช่นนั้น Flex จะแสดง id ภาษาอังกฤษแทนชื่อไทย
- 🚫 **ห้ามใส่ placeholder** (`(ยังไม่มีข้อมูล)` / `XXX-` / `กำลังดึง...`) — ป้องกันด้วย `testNoPlaceholders`

**`SheetService.js`** — ติดต่อ Google Sheets + ตรวจสอบสถานะสมาชิก
- `getSheet(tableKey)` — ดึง sheet หรือสร้างให้อัตโนมัติจาก DataDict
- `getHeaderRow(sheet)` / `getHeaderMap(sheet)` / `readRowsAsObjects(tableKey, sheet)` — อ่าน/แมปคอลัมน์จาก **header row จริง** (การ์ด MT-28: รองรับการสลับตำแหน่งฟิลด์ในตาราง)
- `findAllMembers()` — ดึงสมาชิกทั้งหมด (สำหรับ `ExpiryService` scan วันหมดอายุ — MT-11)
- `renewMember(rowIndex, newExpDt, lineUserId?)` — เขียน `mem_exp_dt` ใหม่ + ตั้ง `mem_status='active'` (+ อัปเดต line_user_id ถ้าให้) — การ์ด MT-12
- `listNotices()` — ดึงประกาศทั้งหมดจาก `t_notice` (สำหรับ `NoticeService` broadcast — MT-13)
- `markNoticeSent(noticeId, sentDt)` — เขียน `sent_dt` + `status='sent'` ตาม header จริง (กัน broadcast ซ้ำ — MT-13)
- `findAllLoans()` — ดึงสัญญากู้ทั้งหมดจาก `t_loan_acct` (สำหรับ `LoanReminderService` เตือนชำระ — MT-13b)
- `appendReminderLog(entry)` — บันทึกการเตือนชำระลง `t_reminder_log` (audit trail — MT-13b)
- `findByActivateCode(activateCode)` — ค้นหาสมาชิกจากรหัส activate (map ตาม header)
- `findByLineUserId(lineUserId)` — ค้นหาสมาชิกจาก LINE User ID (map ตาม header)
- `activateMember(rowIndex, lineUserId)` — เขียน `mem_eff_dt`/`mem_exp_dt`/`mem_status`/`line_user_id` ตรงคอลัมน์ตาม header (สลับตำแหน่งได้)
- `findSavingsByMember(memCode)` / `findLoansByMember(memCode)` / `findDividendsByMember(memCode)` — อ่านข้อมูลการเงินจากตารางใหม่ (MT-27) ผ่าน `findAllByColumn()` (map ตาม header)
- `logActivation(entry)` — บันทึก audit trail ลง `t_activation_log` (MT-27) · `appendExpiryLog(entry)` — บันทึกผลตรวจวันหมดอายุลง `t_expiry_log` (MT-32) — เขียนตามลำดับ header จริง
- `isActiveMember(member)` — ตรวจว่าสมาชิก valid: ช่วงวัน `[mem_eff_dt, mem_exp_dt]` + `mem_status='active'` (fail-safe เมื่อวันที่ไม่ครบ)
- `hasRole(member, role)` — ตรวจว่า valid และมีบทบาทตรงตามที่กำหนด (`member`/`staff`/`admin`)
- `parseDate(value)` — แปลงวันที่จาก string (กันปัญหา timezone ของ `new Date(string)`)
- `isActivated(member)` — ตรวจว่า activate แล้วหรือยัง
- `findByLineUserId(lineUserId)` — ค้นหาสมาชิกจาก LINE User ID ✅ ทำแล้ว (ใช้ใน Gate ตรวจสิทธิ์ของ EventHandler)

### 4.2.8 `RichMenu/` — โมดูลจัดการ Rich Menu

**`MenuData.js`** — นิยามโครงสร้างเมนู 5 แท็บ + Welcome Menu
- พิกัดแท็บ (`TAB_1_COORDS` … `TAB_5_COORDS`) และพิกัดเมนูย่อยแต่ละแท็บ
- ตัวช่วยสร้าง action: `postback()`, `uriAction()`, `switchTab()`, `stayTab()`
- `calcBounds(coords)` — แปลง polygon เป็น `{x, y, width, height}`
- `buildTab1()` … `buildTab5()` — สร้าง payload รายแท็บ
- `buildWelcomeTab()` — สร้าง Welcome Menu (default) 4 ปุ่ม: เปิดใช้งาน / วิธีใช้ / ติดต่อ / ข่าวสาร
- `listItemIds()` — รวบรวม item id ของเมนูย่อย (postback) เพื่อใช้ตรวจสัญญา Item ID กับ ReplyStore
  (หมายเหตุ: welcome items `welcome_*` ไม่นับรวม — เป็นเมนูสาธารณะ)

**`ApiService.js`** — เรียก LINE Rich Menu API
- `create(payload, token)` / `uploadImage(id, driveFileId, token)` / `upsertAlias(aliasId, richMenuId, token)` / `setDefault(richMenuId, token)`
- `linkUser(userId, richMenuId, token)` / `unlinkUser(userId, token)` — ผูก/ยกเลิกเมนูรายบุคคล (Per-User Gating)
- `getRichMenuIdByAlias(aliasId, token)` / `getUserRichMenu(userId, token)` — หา id / ตรวจเมนูปัจจุบัน
- `deleteAll(token)` / `checkStatus(token)` — ล้างทั้งหมด / ตรวจสถานะ

**`Gating.js`** — Per-User Rich Menu Gating (บทที่ 3.3.6)
- `linkMemberMenu(lineUserId, token)` — หา Tab 1 id ผ่าน alias แล้วผูกให้สมาชิก (เรียกหลัง Activate สำเร็จ)
- `unlinkMemberMenu(lineUserId, token)` — ยกเลิกผูก → กลับไป Welcome (เมื่อหมดอายุ/ถูกเพิกถอน)
- `hasMemberMenu(lineUserId, token)` — ตรวจว่าเมนูปัจจุบันเป็นเมนูสมาชิกหรือไม่

**`Deployer.js`** — กระบวนการ deploy ทั้งหมด
- `deploy()` — ลบของเก่า → สร้าง Welcome + 5 เมนู → อัปโหลดภาพ → สร้าง alias → **ตั้ง Welcome เป็น default**
- `main()` — ฟังก์ชันที่กดรันใน Apps Script
- `checkRichMenuStatus()` — ตรวจรายงานสถานะ

## 4.3 มาตรฐานการเขียนโค้ด (Coding Standards)

| ข้อ | มาตรฐาน |
|-----|---------|
| 1 | ใช้ `'use strict'` ทุกโมดูล (IIFE pattern) |
| 2 | ใช้ namespace `var LineBot = LineBot || {}` / `var RichMenu = RichMenu || {}` |
| 3 | แสดงความคิดเห็นเป็นภาษาไทย อธิบาย "ทำไม" ไม่ใช่แค่ "อะไร" |
| 4 | ใช้ `Logger.log()` ในการบันทึกขั้นตอนสำคัญทุกจุด (โดยเฉพาะ webhook flow) |
| 5 | ฟังก์ชันที่เรียก API ภายนอกต้องคืนค่า result object (`{ok, ...}`) |
| 6 | ห้าม hardcode secret/token ลงในซอร์สโค้ด ใช้ Script Properties |
| 7 | ชื่อไฟล์/ฟังก์ชันใช้ camelCase; ชื่อตาราง/คอลัมน์ใช้ snake_case |
| 8 | หลีกเลี่ยง dependency ที่ top-level ข้ามไฟล์ — resolve ตอน runtime |
| 9 | ทุก Flex Message ประกอบจาก `FlexBuilder` components เท่านั้น — 🚫 **ห้ามสร้าง raw flex object นอก `FlexBuilder.js`** · สีจาก `FlexTheme` (บทที่ 3.4 — กันด้วย CI `flex-usage-scan` + `flex-theme-scan`) |

## 4.4 การตั้งค่า Configuration

### 4.4.1 Script Properties

| Key | ค่า | หมายเหตุ |
|-----|-----|----------|
| `CHANNEL_ACCESS_TOKEN` | `<LINE Channel Access Token>` | จำเป็นต้องมี ใช้ยืนยันตัวตน Bot |

### 4.4.2 ค่าคงที่ในโค้ด (Config.js)

| รายการ | ค่า |
|--------|-----|
| Rich Menu ขนาด | 2500 × 1686 |
| Alias Tab 1–5 | `alias-tab-1-profile` … `alias-tab-5-contact` |
| Image File ID Tab 1–5 | ตามตารางบทที่ 3.3.2 |
| วันหมดอายุสมาชิก | now() + 365 วัน (ใน `SheetService.activateMember`) |

## 4.5 คู่มือการแก้ไข/เพิ่มเมนู (How-to)

### 4.5.1 เพิ่มเมนูใหม่ใน Rich Menu

1. แก้ `RichMenu/MenuData.js` — เพิ่มรายการใน `TAB_X_MENUS` พร้อมพิกัด `coords`
2. แก้ `LineBot/ReplyStore.js` — เพิ่ม `CAPTIONS[item]` (ชื่อเมนูภาษาไทย)
3. รัน `main()` ใน Apps Script เพื่อ Deploy Rich Menu ใหม่
4. ทดสอบคลิกเมนูจาก LINE

### 4.5.2 เพิ่มฟังก์ชันการตอบกลับเฉพาะเมนู

1. ใน `EventHandler.handlePostback` เพิ่มเงื่อนไข `if (params.item === 'new_item') { ... }`
2. สร้าง builder หรือใช้ `FlexBuilder.messageBox()` ในการตอบกลับ (หรือประกอบการ์ดจาก component: `header`/`infoBox`/`footerButton` + `bubbleFrame` — การ์ด MT-33)
3. Deploy Web App version ใหม่

### 4.5.3 เพิ่มตารางข้อมูลใหม่ใน Google Sheets

1. เพิ่มคำนิยามตารางใน `DataDict.TABLES`
2. เรียกใช้งานผ่าน `LineBot.SheetService.getSheet('<TABLE_KEY>')` — ระบบจะสร้าง sheet ให้อัตโนมัติ

## สรุปท้ายบท

บทนี้อธิบายโครงสร้างโปรแกรมทั้งหมด ตั้งแต่แผนผังไฟล์ หน้าที่ของแต่ละโมดูล มาตรฐานการเขียนโค้ด การตั้งค่า และคู่มือการแก้ไข บทที่ 5 จะอธิบายการติดตั้งและการ Deploy ระบบจริง
