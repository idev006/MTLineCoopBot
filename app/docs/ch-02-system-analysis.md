# บทที่ 2 การวิเคราะห์ระบบ (System Analysis)

## 2.1 สภาพปัจจุบันของระบบงาน (As-Is)

ก่อนการพัฒนาระบบ สหกรณ์ให้บริการสมาชิกผ่านช่องทางหลักคือ สำนักงาน (Walk-in) และโทรศัพท์ ซึ่งมีข้อจำกัดดังนี้

1. **เวลาทำการจำกัด** — สมาชิกสามารถติดต่อได้เฉพาะเวลาทำการของสำนักงานเท่านั้น
2. **ภาระงานเจ้าหน้าที่สูง** — คำถามยอดนิยม (ยอดเงินฝาก ยอดหนี้ เงินปันผล เอกสาร) เกิดซ้ำจำนวนมากในแต่ละวัน
3. **การประชาสัมพันธ์ไม่ทั่วถึง** — ข่าวสารและประกาศต้องอาศัยแผ่นปิดประกาศหรือการส่งต่อข้อมูลด้วยตนเอง
4. **ข้อมูลไม่เป็นระบบ** — การผูกตัวตนสมาชิกกับช่องทางดิจิทัลยังไม่มีกลไกที่ชัดเจน

## 2.2 ภาพรวมระบบที่ต้องการ (To-Be)

ระบบใหม่ใช้ LINE เป็นช่องทางหลัก โดยมีองค์ประกอบสำคัญ 4 ส่วน

```text
┌──────────────┐        ┌─────────────────────────────┐
│ สมาชิก (LINE) │        │     Google Apps Script      │
│              │  Event  │                             │
│ Rich Menu /  │ ──────▶ │  WebApp.doPost()            │
│ ข้อความ /     │        │   ├─ EventHandler           │
│ Postback     │        │   │   ├─ ActivationService   │
│              │        │   │   ├─ ReplyStore          │
│              │        │   │   └─ FlexBuilder         │
│              │ ◀────── │   └─ MessageService (Reply) │
└──────────────┘  Reply  └───────────┬─────────────────┘
                                     │
                       ┌─────────────▼──────────────┐
                       │ Google Sheets (t_member_mast)│
                       │ Google Drive (รูปภาพ)        │
                       └────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ เครื่องคำนวณสินเชื่อ (GitHub Pages + Vue 3)           │
│ https://idev006.github.io/MTP6LineCoopBot/            │
│ loan_calculator.html                                  │
└──────────────────────────────────────────────────────┘
```

| องค์ประกอบ | บทบาท |
|-----------|-------|
| LINE Platform | ช่องทางติดต่อสมาชิก รับ/ส่งข้อความ Rich Menu Postback |
| Google Apps Script (Web App) | ตัวกลางรับ Webhook ประมวลผล และตอบกลับผ่าน LINE Messaging API |
| Google Sheets | จัดเก็บข้อมูลสมาชิก (ใช้ DataDict เป็นโครงสร้างกลาง) |
| Google Drive | เก็บภาพ Rich Menu แต่ละแท็บ |
| GitHub Pages | โฮสต์เครื่องคำนวณสินเชื่อ (Static Web) |

## 2.3 กระแสการทำงานหลัก (Core Flows)

### 2.3.1 Flow: รับ Webhook และกระจาย Event

```text
LINE ส่ง POST มาที่ Web App URL (Webhook)
        ↓
WebApp.doPost(e)
        ↓
โหลด CHANNEL_ACCESS_TOKEN จาก Config
        ↓
JSON.parse(e.postData.contents)
        ↓
วนลูป events[]
        ├─ postback  → LineBot.EventHandler.handlePostback(event, token)
        └─ message(text) → LineBot.EventHandler.handleTextMessage(event, token)
        ↓
คืนค่า { status: 'ok' } แก่ LINE ทันที
```

**จุดสำคัญ:** Web App ตอบ `{ status: 'ok' }` ให้ LINE ทันทีหลังรับ event (ไม่รอการประมวลผลเสร็จ) เพราะ LINE ต้องการ response ภายใน 5 วินาที ส่วนการตอบกลับสมาชิกทำผ่าน Reply API แยกต่างหาก

### 2.3.2 Flow: สมาชิกคลิกเมนูใน Rich Menu

```text
สมาชิกคลิกเมนูใน Rich Menu
        ↓
LINE ส่ง postback event (data = action=menu_item&item=<id>)
        ↓
EventHandler.handlePostback
        ↓
Util.parseQueryString(event.postback.data)
        ↓
ReplyStore.getCaption(item) → ชื่อเมนูภาษาไทย
        ↓
FlexBuilder.menuClicked(caption) → สร้าง Flex Message
        ↓
MessageService.replyFlex(replyToken, flexMessage, token)
        ↓
LINE Reply API → สมาชิกเห็น Flex Message
```

**หมายเหตุ:** การคลิกแท็บ (Tab) จะส่ง Action แบบ `richmenuswitch` (สลับแท็บ) หรือ `stay_tab` (อยู่แท็บเดิม) ซึ่งระบบตั้งใจไม่ตอบข้อความกลับ

### 2.3.3 Flow: Activate สมาชิก

```text
สมาชิกพิมพ์: activate:ABC123
        ↓
EventHandler.handleTextMessage
        ↓
ตรวจ text.startsWith('activate:') → ตัดรหัสออกมา
        ↓
ActivationService.handleActivate(รหัส, lineUserId, replyToken, token)
        ↓
SheetService.findByActivateCode(รหัส) → ค้นหาจาก sheet t_member_mast
        ├─ ไม่พบ → ตอบ "ไม่พบรหัส activate นี้ในระบบ..."
        ├─ mem_eff_dt มีค่าแล้ว → ตอบ "รหัสนี้ถูกใช้ไปแล้ว..."
        └─ พบและยังไม่ถูกใช้ → Data.MemberRepository.getRepository().activateMember(rowIndex, lineUserId)
                ├─ mem_eff_dt  = now()
                ├─ mem_exp_dt  = now() + 365 วัน
                ├─ mem_status  = 'active'
                ├─ line_user_id = LINE User ID
                └─ ผูก Member Menu ให้ผู้ใช้ (RichMenu.Gating.linkMemberMenu) ✅
        ↓
FlexBuilder.welcomeMember(...) → สร้าง Flex Message ต้อนรับ
        ↓
MessageService.replyFlex → สมาชิกเห็น "🎉 ยินดีต้อนรับ ... Activate สำเร็จ"
```

**หมายเหตุ:** สมาชิกที่ยังไม่ได้ Activate หรือหมดอายุ จะเห็นเพียง **Welcome Menu** (เมนูต้อนรับ) ไม่เห็นเมนูสมาชิก 5 แท็บ ✅ — รายละเอียดการออกแบบในบทที่ 3 หัวข้อ 3.3.6

### 2.3.4 Flow: เครื่องคำนวณสินเชื่อ (Web Application)

สมาชิกคลิกเมนู "เครื่องคำนวณเงินกู้" (Tab 2) ซึ่งเป็น Action ประเภท `uri` เปิดไปยัง `loan_calculator.html` บน GitHub Pages

```text
สมาชิกคลิกเมนู "เครื่องคำนวณเงินกู้" (uri action)
        ↓
เปิดเบราว์เซอร์ → loan_calculator.html (Vue 3)
        ↓
กรอก: วงเงินกู้ / อัตราดอกเบี้ย / จำนวนงวด หรือยอดผ่อน / วันที่เริ่มสัญญา / ประเภทการชำระ
        ↓
กด "คำนวณยอด"
        ↓
คำนวณแบบลดต้นลดดอก ใช้สูตร:
   ดอกเบี้ยงวด = ยอดเงินต้นคงเหลือ × อัตราดอกเบี้ยรายปี × จำนวนวันจริง ÷ 365
        ↓
แสดงตารางผ่อนชำระ + สรุปยอดรายปี + รวมตลอดสัญญา
```

## 2.4 การวิเคราะห์ Use Case (Use Case Analysis)

### 2.4.1 แผนภาพ Use Case ระดับสูง

```text
                    ┌─────────────────────────────┐
                    │        สมาชิก (Actor)       │
                    └──────────────┬──────────────┘
                                   │
   ┌───────────────┬───────────────┼───────────────┬────────────────┐
   ▼               ▼               ▼               ▼                ▼
┌─────────┐  ┌────────────┐  ┌───────────┐  ┌────────────┐  ┌─────────────┐
│UC-01    │  │UC-02      │  │UC-03      │  │UC-04       │  │UC-05        │
│ดูเมนู/  │  │Activate   │  │คำนวณสินเชื่อ│  │สลับแท็บ    │  │เปิดเอกสาร/  │
│ข้อมูล   │  │สมาชิก     │  │(Loan Calc)│  │Rich Menu   │  │ลิงก์ภายนอก  │
└─────────┘  └────────────┘  └───────────┘  └────────────┘  └─────────────┘
```

### 2.4.2 รายละเอียด Use Case หลัก

#### UC-01: สมาชิกดูข้อมูล/เลือกเมนูบริการ

| หัวข้อ | รายละเอียด |
|--------|-----------|
| Actor | สมาชิก |
| Pre-condition | Bot ถูกเพิ่มเป็นเพื่อน และ Rich Menu ถูก Deploy เรียบร้อย |
| Main Flow | 1. สมาชิกคลิกเมนู 2. ระบบรับ postback 3. ระบบตรวจสิทธิ์ (userId → member → valid → role) ✅ 4. ระบบตอบ Flex Message ตามเมนู |
| Post-condition | สมาชิกเห็น Flex Message ตามเมนูที่เลือก |
| หมายเหตุ | สมาชิกที่ยังไม่ Activate / หมดอายุ ถูกปฏิเสธที่ Server ✅ (Gate) + เห็นเฉพาะ Welcome Menu ✅ (Per-User Gating บทที่ 3.3.6) — ถูกผูกเมนูสมาชิกเมื่อ Activate แล้วเท่านั้น |

#### UC-02: Activate สมาชิก

| หัวข้อ | รายละเอียด |
|--------|-----------|
| Actor | สมาชิก |
| Pre-condition | สมาชิกมีรหัส `activate_code` จากสหกรณ์ และแถวข้อมูลใน `t_member_mast` ยังไม่ถูก activate |
| Main Flow | 1. พิมพ์ `activate:CODE` 2. ระบบค้นหารหัส 3. ตรวจสอบว่ายังไม่ถูกใช้ 4. เขียน `mem_eff_dt`, `mem_exp_dt`, `mem_status='active'`, `line_user_id` 5. ผูก Member Menu ให้ผู้ใช้ (RichMenu.Gating) ✅ 6. ส่ง Flex Message ต้อนรับ |
| Alternative | รหัสไม่พบ → แจ้งให้ตรวจสอบใหม่ / รหัสถูกใช้แล้ว → แจ้งว่าใช้ซ้ำไม่ได้ |
| Post-condition | LINE User ID ถูกผูกกับรหัสสมาชิก + **เมนูสมาชิกถูกผูก (Tab 1) ให้เห็น 5 แท็บทันที** ✅ การ activate ซ้ำด้วยรหัสเดิมจะถูกปฏิเสธ |

#### UC-03: คำนวณสินเชื่อออนไลน์

| หัวข้อ | รายละเอียด |
|--------|-----------|
| Actor | สมาชิก |
| Main Flow | 1. คลิกเมนู "เครื่องคำนวณเงินกู้" 2. เปิดหน้าเว็บ 3. กรอกพารามิเตอร์ 4. กดคำนวณ 5. ดูตารางผ่อนชำระ |
| สูตรหลัก | ดอกเบี้ย = เงินต้นคงเหลือ × อัตรา% ต่อปี × จำนวนวันจริง / 365 (ลดต้นลดดอก) |
| รูปแบบการชำระ | ชำระต้นเท่ากันทุกงวด (Equal Principal) / ชำระยอดเท่ากันทุกงวด (PMT) |

#### UC-04: สลับแท็บ Rich Menu
- ใช้ Action `richmenuswitch` ผูกกับ Alias ของแต่ละแท็บ
- ระบบไม่ตอบข้อความกลับ (ตั้งใจให้เป็นการเปลี่ยนหน้าจอเมนูเท่านั้น)

#### UC-05: เปิดเอกสาร/ลิงก์ภายนอก
- เมนูบางรายการใช้ Action `uri` เปิด URL ภายนอก (เช่น เครื่องคำนวณสินเชื่อ)

### 2.4.3 ความสามารถในการขยาย Actor และ Use Case (Extensibility)

**ข้อกำหนดการออกแบบ:** ระบบต้องรองรับการเพิ่ม Actor และ Use Case ใหม่ในอนาคต โดยไม่ต้องปรับปรุงสถาปัตยกรรมหลัก

**Actor เพิ่มได้ในอนาคต**

- ปัจจุบันมี Actor 1 ราย (สมาชิกสหกรณ์)
- Actor ที่คาดว่าจะเพิ่ม เช่น เจ้าหน้าที่ (`staff`), ผู้ดูแลระบบ (`admin`), กรรมการ, ผู้ตรวจสอบ (`auditor`)
- กลไกรองรับ: LINE ส่ง `userId` เหมือนกันทุกบทบาท — ระบบแยกสิทธิ์ด้วยฟิลด์ `mem_role` (RBAC) ดังนั้น **การเพิ่ม Actor = การเพิ่มบทบาทใน `mem_role` + กำหนดสิทธิ์ในตารางสิทธิ์** โดยไม่ต้องแก้สถาปัตยกรรม

**Use Case เพิ่มได้ในอนาคต**

- เพิ่ม use case = เพิ่ม handler/service ใน namespace `LineBot` + ลงทะเบียนคำสั่ง/เมนู
- เมนูและข้อความตอบกลับถูกเก็บเป็นข้อมูล (MenuData / ReplyStore) — เพิ่มเมนูได้โดยไม่แตะ flow เดิม
- **แนวทางที่แนะนำ:** ใช้ Registry Pattern (ตาราง map แทน if/else ยาว) และตารางสิทธิ์แบบ data-driven เพื่อให้การเพิ่ม Actor/Use Case ในอนาคตทำได้ด้วยการเพิ่มรายการเดียว

```javascript
// ตารางสิทธิ์: role → use cases ที่เข้าถึงได้ (เพิ่ม Actor/UC = เพิ่มรายการในตาราง)
const PERMISSIONS = {
  member: ['view_balance', 'view_loan', 'download_forms'],
  staff:  [...PERMISSIONS.member, 'broadcast_news', 'view_member_list'],
  admin:  ['*']  // สิทธิ์ทั้งหมด
};

// Registry คำสั่งข้อความ (เพิ่มคำสั่งใหม่ = เพิ่ม entry เดียว)
const COMMAND_HANDLERS = {
  'activate:': 'handleActivate',
  'คำนวณ':     'handleLoanCalc'
};
```

## 2.5 ข้อจำกัดและเงื่อนไขของแพลตฟอร์ม (Constraints)

### 2.5.1 ข้อจำกัดของ LINE Messaging API

| ข้อจำกัด | ผลกระทบ | แนวทางจัดการ |
|---------|---------|-------------|
| `replyToken` ใช้ได้ครั้งเดียว อายุสั้น | ตอบกลับซ้ำไม่ได้ | ตอบครั้งเดียวต่อ event, fallback แบบ text เมื่อ Flex ล้มเหลว |
| Webhook ต้องตอบภายใน 5 วินาที | ประมวลผลนานไม่ได้ | ตอบ `{status:'ok'}` ทันที ทำงาน async ผ่าน Reply API |
| Rich Menu ภาพ/Area จำกัด | ออกแบบเมนูซับซ้อนมากไม่ได้ | แยก 5 แท็บ แท็บละเมนูย่อย 4–6 รายการ |

### 2.5.2 ข้อจำกัดของ Google Apps Script

| ข้อจำกัด | ผลกระทบ | แนวทางจัดการ |
|---------|---------|-------------|
| Load order ของไฟล์ไม่รับประกันตามลำดับ | การประกาศ dependency ที่ top-level อาจได้ `undefined` | ใช้ namespace (`var LineBot = LineBot || {}`) และ resolve dependency ตอน runtime (`getDependencies()`) |
| Quota รายวันของ UrlFetchApp/SpreadsheetApp | การเรียก API จำนวนมากเกินไปถูกจำกัด | จำกัดการเรียกข้อมูล, ใช้ cache เมื่อจำเป็น |
| ไม่มีระบบ Cron พื้นฐาน | งานตามเวลาต้องใช้ Time-driven Trigger | ใช้ Apps Script Trigger ในการแจ้งเตือน (เฟสต่อไป) |

## 2.6 การวิเคราะห์ความเสี่ยง (Risk Register)

| # | ความเสี่ยง | ระดับ | ผลกระทบ | แนวทางบรรเทา |
|---|-----------|-------|---------|-------------|
| R1 | Channel Access Token รั่วไหล (ถูก hardcode ในซอร์ส) | สูง | บุคคลภายนอกควบคุม Bot ได้ | ✅ ย้ายไป Script Properties แล้ว + secret scan ใน CI กันซ้ำ · หมุน token ตาม Runbook บทที่ 5.5.1 |
| R2 | Web App deployment เป็น version เก่า | กลาง | ผู้ใช้ยังเห็นพฤติกรรมเดิมหลังแก้โค้ด | Deploy version ใหม่ทุกครั้งหลังแก้โค้ด (บทที่ 5) |
| R3 | Rich Menu ที่ Deploy ไปแล้วไม่ตรงกับโค้ดล่าสุด | กลาง | Postback format ไม่ตรงกับ Handler | รัน `main()` ใหม่หลังแก้ `MenuData.js`; มี fallback ใน Handler |
| R4 | ข้อมูลใน Google Sheets ไม่มีอยู่/โครงสร้างไม่ตรง | กลาง | ค้นหาไม่พบ สมาชิก activate ไม่ได้ | ใช้ DataDict สร้าง sheet/header อัตโนมัติ |
| R5 | `replyToken` หมดอายุ/ใช้ซ้ำ | ต่ำ–กลาง | สมาชิกไม่เห็นข้อความตอบกลับ | ตอบกลับครั้งเดียวต่อ event; ตรวจ log `reply error` |
| R6 | ผู้ใช้ส่งคำสั่งหรือเมนูที่ไม่รู้จัก | ต่ำ | ประสบการณ์ใช้งานไม่ดี | ตอบข้อความ fallback ที่ชัดเจน |
| R7 | Quota ของ Apps Script หมด | ต่ำ | บริการหยุดชั่วคราว | ติดตามการใช้ quota, ออกแบบการอ่านข้อมูลให้มีประสิทธิภาพ |

## สรุปท้ายบท

บทนี้วิเคราะห์ระบบเป้าหมาย ทั้งสถาปัตยกรรม 4 องค์ประกอบ กระแสการทำงานหลัก 4 กระแส Use Case 5 กรณี ข้อจำกัดของแพลตฟอร์ม และความเสี่ยง 7 รายการ บทถัดไปจะนำผลวิเคราะห์ไปสู่การออกแบบระบบในรายละเอียด
