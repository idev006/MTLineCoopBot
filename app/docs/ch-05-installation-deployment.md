# บทที่ 5 การติดตั้งและการใช้งาน (Installation & Deployment)

## 5.1 สิ่งที่ต้องเตรียม (Prerequisites)

| รายการ | รายละเอียด |
|--------|-----------|
| บัญชี Google | สำหรับ Google Sheets และ Apps Script |
| บัญชี LINE Developers | สำหรับสร้าง Messaging API Channel และรับ Channel Access Token |
| บัญชี GitHub | โฮสต์โค้ดต้นฉบับโครงการ (https://github.com/idev006/MTLineCoopBot.git, owner `idev006`) + โฮสต์เครื่องคำนวณสินเชื่อ (GitHub Pages) |
| Node.js + npm | สำหรับติดตั้ง clasp |
| Google Sheets | ไฟล์ Spreadsheet สำหรับข้อมูลสมาชิก (สร้าง sheet `t_member_mast` อัตโนมัติได้) |
| Google Drive | ไฟล์ภาพ Rich Menu 5 แท็บ (ต้องให้ Apps Script เข้าถึงได้) |

## 5.2 การเตรียม LINE Developers Console

1. เข้า [developers.line.biz](https://developers.line.biz) → สร้าง/เลือก Provider
2. สร้าง Channel ประเภท **Messaging API**
3. บันทึกค่า:
   - **Channel ID**
   - **Channel Secret**
   - **Channel Access Token (Long-lived)** — กด Issue
4. เปิดใช้งาน Webhook และกรอก Webhook URL (จะได้ค่าหลัง Deploy Web App ในหัวข้อ 5.4)

## 5.3 การติดตั้งและใช้งาน clasp

### 5.3.1 ติดตั้ง

```bash
npm install -g @google/clasp
clasp login
```

### 5.3.2 ตั้งค่าโครงการ

ไฟล์ `.clasp.json` ที่ root ของโครงการ:

```json
{
  "scriptId": "<SCRIPT_ID ของ Apps Script project>",
  "rootDir": "app",
  "scriptExtensions": [".js", ".gs"],
  "htmlExtensions": [".html"],
  "jsonExtensions": [".json"],
  "skipSubdirectories": false
}
```

> `scriptId` ดูได้จาก Apps Script Editor → Project Settings → Script ID หรือจาก URL ของโครงการ

### 5.3.3 Push / Pull โค้ด

```bash
clasp push        # อัปโหลดโค้ดจากเครื่องขึ้น Apps Script
clasp pull        # ดาวน์โหลดโค้ดจาก Apps Script ลงเครื่อง
clasp status      # ตรวจสอบไฟล์ที่ต่างกัน
```

### 5.3.4 Workflow: GitHub (Source of Truth) → clasp → Apps Script

โค้ดโครงการจัดเก็บที่ **GitHub** เป็นหลัก (`https://github.com/idev006/MTLineCoopBot.git` — owner `idev006`) ส่วน Apps Script เป็นปลายทางที่รับโค้ดผ่าน clasp ตามลำดับ:

```text
แก้โค้ด → git commit + git push (GitHub) → clasp push (Apps Script) → Deploy Web App ใหม่
```

ขั้นตอนเมื่อเริ่มทำงานในเครื่องใหม่:

```bash
# 1) โคลนโค้ดจาก GitHub
cd D:/dev
git clone https://github.com/idev006/MTLineCoopBot.git

# 2) ตั้งค่า clasp (มี .clasp.json ใน repo แล้ว — ตรวจ scriptId ให้ตรง)
clasp login
clasp pull    # ดึงโค้ด Apps Script ลงเครื่องครั้งแรก (ถ้าต้องการ)

# 3) แก้ไข → อัปโหลดขึ้น GitHub
git add . && git commit -m "..." && git push

# 4) ส่งขึ้น Apps Script + Deploy version ใหม่ (หัวข้อ 5.4.2)
clasp push
```

> **ข้อควรระวัง:** `clasp pull` จะเขียนทับไฟล์ในเครื่อง — ให้ใช้เฉพาะครั้งแรกหรือเมื่อต้องการซิงค์จาก Apps Script กลับมา ไม่ควรสลับใช้บ่อยระหว่าง Git กับ clasp pull เพื่อป้องกันความขัดแย้งของโค้ด

## 5.4 การ Deploy Web App (Webhook Endpoint)

### 5.4.1 Deploy ครั้งแรก

1. Push โค้ดขึ้น Apps Script (`clasp push`)
2. เปิด Apps Script Editor → **Deploy → New deployment**
3. เลือกประเภท **Web app**
4. ตั้งค่า:
   - Execute as: **Me (ผู้ deploy)**
   - Who has access: **Anyone** (LINE webhook ต้องเข้าถึงได้แบบไม่ล็อกอิน)
5. กด **Deploy** → คัดลอก **Web App URL**
6. ผูก `webhook_secret` ท้าย URL: `https://script.google.com/macros/s/.../exec?webhook_secret=<ค่า WEBHOOK_SECRET>` (ใช้ค่าที่ตั้งในหัวข้อ 5.5)
7. นำ URL ฉบับที่มี secret ไปกรอกใน LINE Developers Console (Webhook settings)

### 5.4.2 Deploy หลังแก้โค้ดทุกครั้ง

```text
1. clasp push
2. Apps Script → Deploy → Manage deployments
3. เลือก deployment ปัจจุบัน → Edit (ดินสอ)
4. เลือก Version: New version
5. Deploy
```

> ⚠️ หากไม่สร้าง version ใหม่ LINE จะยังเรียกโค้ดเวอร์ชันเก่าอยู่

## 5.5 การตั้งค่า Script Properties

ตั้งค่า 3 ค่าผ่าน Script Properties Editor:

```text
Project Settings (⚙) → Script Properties → Add property
```

| Key | ค่า | หมายเหตุ |
|-----|-----|----------|
| `CHANNEL_ACCESS_TOKEN` | Channel Access Token (จาก LINE Console) | จำเป็น — ยืนยันตัวตน Bot ในการเรียก LINE API |
| `CHANNEL_SECRET` | Channel Secret (จาก LINE Console) | จำเป็น — ใช้ตรวจความถูกต้อง (HMAC) และ verify LIFF ID Token ในอนาคต |
| `WEBHOOK_SECRET` | รหัสยาวสุ่มที่ทีมสร้างเอง (เช่น `opaque 32+ ตัวอักษร`) | จำเป็น — ผูกท้าย Webhook URL กันคนนอกเรียก Web App |

หรือผ่านโค้ด (ควรลบ token ที่ hardcode ออกก่อน):

```javascript
function setupConfig() {
  Config.setup({
    'CHANNEL_ACCESS_TOKEN': '<CHANNEL_ACCESS_TOKEN>',
    'CHANNEL_SECRET': '<CHANNEL_SECRET>',
    'WEBHOOK_SECRET': '<รหัสยาวสุ่ม>'
  });
}
```

> ⚠️ หลังตั้งค่า `WEBHOOK_SECRET` ต้องอัปเดต Webhook URL ใน LINE Console ให้มี `?webhook_secret=<ค่าที่ตั้ง>` ต่อท้ายทุกครั้ง มิฉะนั้น `doPost` จะปฏิเสธ request ทั้งหมด (ดูหัวข้อ 5.4.1)

> แนะนำตั้งค่าผ่าน Script Properties UI เพื่อไม่ให้ secret หลุดลงซอร์สโค้ด/Git

### 5.5.1 Runbook: หมุน (Rotate) Channel Access Token เมื่อสงสัยว่ารั่วไหล

> **เมื่อไหร่ต้องทำ:** token ถูก commit ลง Git (แม้ลบออกแล้ว ยังอยู่ใน history) · สงสัยว่าหลุดสู่บุคคลภายนอก · เปลี่ยนทีม/ผู้ดูแล · ตามรอบนโยบายความปลอดภัย

**1. ออก token ใหม่ที่ LINE Console**

```text
developers.line.biz → เลือก Provider → เลือก Channel (Messaging API) →
Messaging API tab → หัวข้อ Channel access token → กด Issue
```

- LINE อนุญาตให้มี long-lived token หลายตัวพร้อมกัน — **ยังไม่ต้องลบ token เก่า** ตอนนี้
- คัดลอก token ใหม่เก็บไว้ชั่วคราว (ห้ามวางลงโค้ด/Git)

**2. อัปเดต Script Properties (ผ่าน UI เท่านั้น — ห้าม commit)**

```text
Apps Script Editor → Project Settings (⚙) → Script Properties →
แก้ค่า CHANNEL_ACCESS_TOKEN ให้เป็น token ใหม่ → Save
```

> ระบบอ่านค่า Script Properties ทุกครั้งที่มี request — **การแก้ Script Properties มีผลทันที ไม่ต้อง Deploy ใหม่** (ยกเว้นโค้ดมีการแก้ด้วย ถึงต้อง `clasp push` + Deploy version ใหม่ ตามหัวข้อ 5.4.2)

**3. ทดสอบว่าระบบทำงานกับ token ใหม่**

1. **รัน `checkTokenHealth()`** ใน Apps Script Editor (ฟังก์ชันใน `Test.js`) → ต้องเห็น `✅ Token ถูกต้อง (HTTP 200)` + ข้อมูล Bot (displayName/userId/basicId)
2. ส่งข้อความ/คลิกเมนูใน LINE ไปที่ Bot
3. ตรวจ Log: Apps Script Editor → Executions → ต้องเห็น `reply success: 200`
4. ถ้า `checkTokenHealth()` แจ้ง `401` หรือ Log เห็น `401 Unauthorized` → token ใหม่ใส่ผิดหรือยังไม่บันทึก → กลับไปข้อ 2

**4. ยกเลิก (Deactivate) token เก่า** — หลังยืนยันว่าระบบทำงานปกติกับ token ใหม่แล้วเท่านั้น

```text
LINE Console → Channel access token → ที่ token เก่า → Deactivate
```

> ⚠️ Token ที่รั่วไหลถือว่า compromised — ห้ามเก็บไว้ใช้ต่อเด็ดขาด

**สิ่งที่เปลี่ยนและไม่เปลี่ยน:**

| รายการ | ต้องเปลี่ยน? | หมายเหตุ |
|---------|------------|----------|
| `CHANNEL_ACCESS_TOKEN` | ✅ เปลี่ยน (rotate) | ตัวหลักที่ต้องหมุน |
| `WEBHOOK_SECRET` | เฉพาะถ้าสงสัยว่ารั่วด้วย | ถ้าเปลี่ยน ต้องอัปเดต Webhook URL ใน LINE Console (หัวข้อ 5.4.1) |
| `CHANNEL_SECRET` | ❌ ไม่เปลี่ยนได้ | เป็นค่าประจำ Channel เปลี่ยนไม่ได้ใน LINE Console |

**การป้องกันซ้ำ:** CI (`.github/workflows/ci.yml`) มี secret scan — จะ **fail** ทันทีถ้ามี token/secret hardcode ลงโค้ดอีก (ดูบทที่ 8.1.3)

## 5.6 การ Deploy Rich Menu (5 แท็บ + Welcome Menu)

### 5.6.1 เตรียมภาพ

- ภาพ 5 แท็บต้องถูกอัปโหลดขึ้น Google Drive และมีสิทธิ์ให้ Apps Script อ่านได้
- บันทึก File ID ของแต่ละภาพลงใน `Config.IMAGE_FILE_IDS`
- **(เลือกได้)** ภาพ Welcome Menu — ใส่ File ID ใน `Config.IMAGE_FILE_IDS.WELCOME`; ถ้าว่าง ระบบจะข้ามการอัปโหลดภาพ Welcome (เมนูยังทำงานได้)

### 5.6.2 รัน Deploy

1. ตรวจว่า `CHANNEL_ACCESS_TOKEN` ถูกตั้งค่าแล้ว
2. (แนะนำ) รัน `verifyMenuContract()` + `testWelcomeMenu()` ใน `app/Test.js` เพื่อตรวจว่า item id ใน MenuData ตรงกับ CAPTIONS ใน ReplyStore ครบทุกเมนู (หัวข้อ 3.3.7 / TC-12)
3. ใน Apps Script Editor เลือกฟังก์ชัน `main` แล้วกด **Run**
4. ตรวจ Log ว่า:
   - สร้าง Rich Menu ทั้ง 6 สำเร็จ (Welcome + 5 แท็บ) ได้ richMenuId
   - อัปโหลดภาพสำเร็จ (Welcome ถ้ามี File ID)
   - Alias ทั้ง 6 ถูกสร้าง (`alias-welcome` + 5 แท็บ)
   - **Welcome ถูกตั้งเป็น Default** (ผู้ไม่ Activate เห็น Welcome; สมาชิกถูกผูก Tab 1 เป็นรายบุคคลผ่าน `Gating`)
5. ตรวจสอบด้วยฟังก์ชัน `checkRichMenuStatus`

### 5.6.3 ตรวจสอบสถานะ

```javascript
function checkRichMenuStatus() {
  const status = RichMenu.ApiService.checkStatus(Config.validate().CHANNEL_ACCESS_TOKEN);
  Logger.log(JSON.stringify(status, null, 2));
}
```

### 5.6.4 สร้างตารางข้อมูล + dummy data (SeedData — การ์ด MT-27)

สร้างตารางตาม use case (naming: lower case + ขึ้นต้น `t_`) พร้อมข้อมูลตัวอย่างสำหรับพัฒนา/ทดสอบ:

```javascript
// ใน Apps Script Editor เลือกฟังก์ชัน แล้วกด Run
createDummyTables(); // สร้าง t_savings_acct / t_loan_acct / t_dividend / t_activation_log / t_expiry_log + dummy data
// resetDummyTables(); // (dev เท่านั้น) ล้างข้อมูลแล้วใส่ dummy ใหม่
```

- **Non-destructive:** ถ้าชีทมีข้อมูลอยู่แล้วจะข้าม — ไม่ทับข้อมูลจริง
- ข้อมูลตัวอย่างใช้รหัสสมาชิก `MEM001`–`MEM003` — **ต้องมีรหัสเหล่านี้ใน `t_member_mast`** ถึงจะเห็นข้อมูลการเงินในเมนู (หรือแก้ `mem_code` ในชีทให้ตรงกับสมาชิกจริง)
- ไม่แตะ `t_member_mast` (เป็นข้อมูลจริงของสมาชิก)
- หลังสร้างตารางแล้ว คลิกเมนูการเงินใน LINE → เห็นข้อมูลตัวอย่าง (ดู Smoke Test 5.8)
- `t_expiry_log` ถูกเขียนโดยอัตโนมัติทุกครั้งที่ `runExpiryCheck` รัน (การ์ด MT-32) — SeedData มี dummy ตัวอย่างให้ดูรูปแบบ

## 5.7 การ Deploy เครื่องคำนวณสินเชื่อ (GitHub Pages)

1. อัปโหลดไฟล์ `loan_calculator.html` ขึ้น repository (เช่น `MTP6LineCoopBot`)
2. เปิดใช้งาน **Settings → Pages** → เลือก branch ที่ต้องการ
3. เข้าถึงผ่าน URL: `https://<username>.github.io/<repo>/loan_calculator.html`
4. ตรวจสอบว่าลิงก์ใน `MenuData.js` (Tab 2 เมนู `loan_calc`) ชี้ไป URL ที่ถูกต้อง

## 5.8 การทดสอบหลังติดตั้ง (Smoke Test)

| ลำดับ | ขั้นตอน | ผลที่คาดหวัง |
|-------|---------|-------------|
| 1 | เพิ่ม Bot เป็นเพื่อน | เห็น Rich Menu แท็บ 1 (ข้อมูลส่วนตัว) เป็น default |
| 2 | คลิกเมนู "บัญชีเงินฝาก" | (หลังรัน `createDummyTables()` แล้ว) เห็นยอดเงินฝากจริง/รวมยอดจาก `t_savings_acct` — ถ้ายังไม่ seed จะเห็น "ไม่พบข้อมูลบัญชีเงินฝาก" |
| 3 | สลับไปแท็บ 2 แล้วคลิก "เครื่องคำนวณเงินกู้" | เปิดหน้า loan_calculator.html |
| 4 | พิมพ์ `activate:ABC123` (รหัสที่เตรียมไว้) | ได้ Flex "🎉 ยินดีต้อนรับ..." และข้อมูลใน Sheets อัปเดต |
| 5 | พิมพ์ `activate:ABC123` ซ้ำ | ได้ข้อความ "รหัสนี้ถูกใช้ไปแล้ว..." |
| 6 | พิมพ์ `activate:WRONG` | ได้ข้อความ "ไม่พบรหัส activate นี้ในระบบ..." |
| 7 | (หลังตั้ง trigger — ข้อ 5.9) สมาชิกที่เหลือเวลา ≤ `EXPIRY_WARNING_DAYS` วัน | ได้ Push ข้อความเตือน "สิทธิ์จะหมดอายุในอีก X วัน" |
| 8 | (หลังตั้ง trigger — ข้อ 5.9) สมาชิกที่หมดอายุแล้ว | ได้ Push "สิทธิ์หมดอายุแล้ว" + เมนูสมาชิกถูกยกเลิก (กลับไป Welcome) |

## 5.9 ตั้ง Time-driven Trigger — ตรวจวันหมดอายุอัตโนมัติ (การ์ด MT-11)

ระบบตรวจวันหมดอายุสมาชิก (push เตือนก่อนหมดอายุ + แจ้ง expired และยกเลิกเมนู) ต้องมี **Time-driven Trigger**:

1. `clasp push` ให้โค้ดใหม่ขึ้น Apps Script
2. **Apps Script Editor → (⏰ ปุ่มนาฬิกา) Triggers → Add Trigger**:
   - **Function:** `runExpiryCheck`
   - **Event source:** Time-driven
   - **Type:** Day timer · **Time:** 09:00 (หรือเวลาที่ต้องการ)
   - **Failure notification settings:** รับอีเมลแจ้งเตือนเมื่อล้มเหลว
3. หรือรัน `setupExpiryTrigger(9)` ครั้งเดียวใน Editor เพื่อสร้าง trigger ด้วยโค้ด (ดู `app/LineBot/ExpiryService.js`)
4. ตั้งค่า (ไม่บังคับ): Script Properties → `EXPIRY_WARNING_DAYS` = จำนวนวันก่อนหมดอายุที่ถือว่า "ใกล้หมด" (ค่า default 30)
5. ทดสอบ: รัน `runExpiryCheck` ด้วยมือ → ตรวจ Log `[ExpiryCheck] checked=... expiring=... expired=... pushed=...`

> ⚠️ Push API ต้องใช้ `CHANNEL_ACCESS_TOKEN` — ถ้าส่งไม่ได้ ให้ตรวจ `push error: 4xx` ใน Log (เช่น 403 = bot ถูกบล็อก, 400 = userId ไม่ถูกต้อง)

## สรุปท้ายบท

บทนี้เป็นคู่มือการติดตั้งและ Deploy ระบบครบทุกส่วน ตั้งแต่การเตรียมบัญชี LINE การตั้งค่า clasp การ Deploy Web App และ Rich Menu ไปจนถึงการโฮสต์เครื่องคำนวณสินเชื่อ บทที่ 6 จะกล่าวถึงการทดสอบระบบอย่างเป็นระบบและแนวทางการแก้ไขปัญหา
