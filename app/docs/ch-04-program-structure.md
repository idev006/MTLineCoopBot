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
    ├── DataDict.js              # SSOT โครงสร้างข้อมูล (t_member_mast)
    ├── Util.js                  # ฟังก์ชันอรรถประโยชน์
    ├── WebApp.js                # Entry point doPost(e)
    ├── Test.js                  # ฟังก์ชันทดสอบระบบ (verifyMenuContract ฯลฯ)
    ├── Dashboard.js             # สร้าง KPI Dashboard ของทีม (createDashboard)
    ├── LineBot/                 # ตรรกะการทำงานของ Bot
    │   ├── ActivationService.js # Activate สมาชิก
    │   ├── EventHandler.js      # Router จัดการ event
    │   ├── FlexBuilder.js       # สร้าง Flex Message
    │   ├── MessageService.js    # เรียก LINE Reply API
    │   ├── ReplyStore.js        # ข้อความ/ชื่อเมนูของแต่ละ item
    │   └── SheetService.js      # ติดต่อ Google Sheets
    ├── RichMenu/                # การจัดการ Rich Menu
    │   ├── ApiService.js        # เรียก LINE Rich Menu API (รวม linkUser/unlinkUser)
    │   ├── Deployer.js          # ขั้นตอน deploy 5 แท็บ + Welcome Menu (default)
    │   ├── Gating.js            # Per-User Gating: ผูก/ยกเลิกเมนูรายบุคคล (บทที่ 3.3.6)
    │   └── MenuData.js          # โครงสร้าง/พิกัดเมนู 5 แท็บ + Welcome
    ├── assets/line_menu/        # ภาพ Rich Menu (tab1-5 .png/.jpg)
    └── docs/                    # เอกสารโครงการ (เล่มนี้)
```

## 4.2 คำอธิบายโมดูล

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
- `checkTokenHealth()` — **ตรวจสุขภาพ Channel Access Token** เรียก LINE `GET /v2/bot/info` → รายงาน `ok/status` + ข้อมูล Bot (ใช้หลังหมุน token บทที่ 5.5.1 หรือตรวจรายเดือน) · **ไม่รันใน CI** (ต้องใช้ token จริง + network)

### 4.2.7 `LineBot/` — โมดูลการทำงานของ Bot

**`EventHandler.js`** — Router กลาง
- `handlePostback(event, token)` — แยก `params` ด้วย `Util.parseQueryString` แล้วตัดสินใจตามตารางในบทที่ 3.5.3
- `handleTextMessage(event, token)` — ตรวจ `activate:...` และ `คำนวณ...`
- `getAuthorizedMember(lineUserId)` — Gate ตรวจสิทธิ์: `findByLineUserId` + `isActiveMember` + บทบาทที่รู้จัก ก่อนตอบสนองเมนู/คำสั่งสมาชิก (ยกเว้น `activate:` — เป็นขั้นตอนลงทะเบียน)
- ใช้ `getDependencies()` resolve บริการตอน runtime (กันปัญหา Apps Script load order)

**`ActivationService.js`** — ตรรกะ Activate สมาชิก
- `handleActivate(activateCode, lineUserId, replyToken, token)`
- ขั้นตอน: ค้นหา → ตรวจซ้ำ → activate → สร้าง/ส่ง Flex ต้อนรับ
- คืนค่า `{ success, reason, ... }` เพื่อให้ผู้เรียกตรวจสอบผลลัพธ์

**`FlexBuilder.js`** — ตัวสร้าง Flex Message
- `menuClicked(caption)` / `welcomeMember(member)` / `messageBox(options)`

**`MessageService.js`** — ส่งข้อความผ่าน LINE Reply API
- `reply()` / `replyFlex()` / `send()`
- `send()` คืนค่า `{ ok, statusCode, body }` เพื่อการ debug

**`ReplyStore.js`** — คลังข้อความและชื่อเมนู
- `TAB_1`…`TAB_5` — ข้อความตอบกลับแยกตามแท็บ (key ต้องตรงกับ item id ใน MenuData)
- `CAPTIONS` — ชื่อเมนูภาษาไทยที่ใช้แสดงใน Flex (key ต้องตรงกับ item id ใน MenuData)
- `get(item)` / `getCaption(item)` / `set(item, text)`
- ⚠️ **Contract:** หากเพิ่มเมนูใน `MenuData.js` ต้องเพิ่ม key ให้ครบทั้ง `CAPTIONS` และข้อความตอบกลับด้วย ไม่เช่นนั้น Flex จะแสดง id ภาษาอังกฤษแทนชื่อไทย

**`SheetService.js`** — ติดต่อ Google Sheets + ตรวจสอบสถานะสมาชิก
- `getSheet(tableKey)` — ดึง sheet หรือสร้างให้อัตโนมัติจาก DataDict
- `findByActivateCode(activateCode)` — ค้นหาสมาชิกจากรหัส activate
- `activateMember(rowIndex, lineUserId)` — เขียน `mem_eff_dt`/`mem_exp_dt`/`mem_status`/`line_user_id`
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
2. สร้าง builder หรือใช้ `FlexBuilder.messageBox()` ในการตอบกลับ
3. Deploy Web App version ใหม่

### 4.5.3 เพิ่มตารางข้อมูลใหม่ใน Google Sheets

1. เพิ่มคำนิยามตารางใน `DataDict.TABLES`
2. เรียกใช้งานผ่าน `LineBot.SheetService.getSheet('<TABLE_KEY>')` — ระบบจะสร้าง sheet ให้อัตโนมัติ

## สรุปท้ายบท

บทนี้อธิบายโครงสร้างโปรแกรมทั้งหมด ตั้งแต่แผนผังไฟล์ หน้าที่ของแต่ละโมดูล มาตรฐานการเขียนโค้ด การตั้งค่า และคู่มือการแก้ไข บทที่ 5 จะอธิบายการติดตั้งและการ Deploy ระบบจริง
