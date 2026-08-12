# เอกสารโครงการ: LINE Bot Rich Menu และ Flex Reply

> 📖 **หมายเหตุ:** เอกสารนี้เป็นเอกสารประกอบรุ่นแรก — เอกสารโครงการฉบับสมบูรณ์ (เล่มหลัก) อยู่ที่ [README.md](./README.md)

โครงการ: MTLineCoopBot  
แพลตฟอร์ม: Google Apps Script + LINE Messaging API  
Runtime: Apps Script V8

## ภาพรวม

โครงการนี้เป็น LINE Bot สำหรับสหกรณ์ มี Rich Menu 2 แท็บ เมื่อผู้ใช้คลิกเมนู ระบบจะรับ event ผ่าน webhook และตอบกลับด้วย Flex Message หรือข้อความตามเงื่อนไข

## โครงสร้างไฟล์หลัก

```text
app/
├── appsscript.json
├── Config.js
├── Util.js
├── WebApp.js
├── LineBot/
│   ├── EventHandler.js
│   ├── FlexBuilder.js
│   ├── MessageService.js
│   └── ReplyStore.js
└── RichMenu/
    ├── ApiService.js
    ├── Deployer.js
    └── MenuData.js
```

## หน้าที่ของแต่ละ module

### `Config.js`

- อ่านค่า configuration จาก Script Properties
- เก็บ endpoint ของ LINE API
- เก็บ rich menu alias และขนาด Rich Menu
- มี `setupConfig()` สำหรับตั้งค่าเริ่มต้นใน Script Properties

> หมายเหตุ: ไม่ควร commit token จริงลง repository หรือเอกสาร

### `Util.js`

- ฟังก์ชัน utility กลาง
- ปัจจุบันมี `parseQueryString(str)` สำหรับแปลง postback data เป็น object

ตัวอย่าง:

```javascript
Util.parseQueryString('action=menu_item&item=saving_account');
// { action: 'menu_item', item: 'saving_account' }
```

### `WebApp.js`

- entry point สำหรับ LINE webhook ผ่าน function `doPost(e)`
- โหลด channel access token จาก `Config.get()`
- parse request body จาก LINE
- loop events แล้ว dispatch ไปที่ `LineBot.EventHandler`

รองรับ event หลัก:

- `postback` → `handlePostback(event, token)`
- text message → `handleTextMessage(event, token)`

### `RichMenu/MenuData.js`

- สร้าง payload ของ Rich Menu ทั้ง 2 แท็บ
- กำหนดพื้นที่คลิก (`areas`) และ action ของแต่ละพื้นที่

รูปแบบ action หลักของเมนู:

```javascript
{
  type: 'postback',
  label: item,
  data: `action=menu_item&item=${item}`,
  displayText
}
```

action สำหรับเปลี่ยนแท็บ:

```javascript
{
  type: 'richmenuswitch',
  richMenuAliasId: aliasId,
  data: `action=switch_tab&to=${to}`
}
```

### `RichMenu/ApiService.js`

- เรียก LINE Rich Menu API
- สร้าง Rich Menu
- อัปโหลดรูป Rich Menu
- สร้าง/อัปเดต alias
- ตั้ง default rich menu
- ลบ rich menu และ alias เก่า
- ตรวจสอบสถานะ Rich Menu ปัจจุบัน

### `RichMenu/Deployer.js`

- รวมขั้นตอน deploy Rich Menu
- function หลักคือ `main()` ซึ่งเรียก `RichMenu.Deployer.deploy()`
- มี `checkRichMenuStatus()` สำหรับตรวจ Rich Menu/Alias/Default menu

### `LineBot/EventHandler.js`

- จัดการ LINE event หลังจาก `WebApp.js` dispatch มา
- ใช้ runtime dependency resolution ผ่าน `getDependencies()` เพื่อหลีกเลี่ยงปัญหา Apps Script load order

postback flow หลัก:

```javascript
if (params.action === 'menu_item') {
  const caption = deps.ReplyStore.getCaption(params.item);
  const flexMessage = deps.FlexBuilder.menuClicked(caption);
  deps.MessageService.replyFlex(replyToken, flexMessage, token);
  return;
}
```

มี fallback สำหรับ postback format อื่น:

```javascript
const fallbackItem = params.item || params.menu || params.action || data;
```

### `LineBot/FlexBuilder.js`

- สร้าง Flex Message object
- ปัจจุบันมี `menuClicked(menuCaption)` สำหรับตอบว่า user เลือกเมนูใด

### `LineBot/MessageService.js`

- ส่งข้อความผ่าน LINE Reply API
- รองรับ text และ Flex Message
- คืนผลลัพธ์จาก API เป็น object:

```javascript
{
  ok: true,
  statusCode: 200,
  body: '...'
}
```

## Flow การคลิก Rich Menu แล้วตอบ Flex Message

```text
User clicks Rich Menu
        ↓
LINE sends postback event
        ↓
WebApp.doPost(e)
        ↓
LineBot.EventHandler.handlePostback(event, token)
        ↓
Util.parseQueryString(event.postback.data)
        ↓
ReplyStore.getCaption(item)
        ↓
FlexBuilder.menuClicked(caption)
        ↓
MessageService.replyFlex(replyToken, flexMessage, token)
        ↓
LINE Reply API
        ↓
User sees Flex Message
```

## Rich Menu Items ปัจจุบัน

### Tab A

| item id | display text |
|---|---|
| `saving_account` | บัญชีเงินฝาก |
| `check_balance` | เช็คยอดเงิน |
| `loan_balance` | ยอดเงินกู้คงเหลือ |
| `loan_calculator` | เครื่องคำนวณเงินกู้ |
| `contact_official` | ติดต่อเจ้าหน้าที่ |
| `announcements` | ประกาศสหกรณ์ |

### Tab B

| item id | display text |
|---|---|
| `share_capital` | ทุนเรือนหุ้น |
| `loan_application` | ยื่นคำขอกู้ |
| `dividends` | เงินปันผล |
| `emergency_funds` | กองทุนฉุกเฉิน |
| `change_password` | เปลี่ยนรหัสผ่าน |
| `profile` | ข้อมูลส่วนตัว |

## วิธี deploy Rich Menu

1. ตั้งค่า Script Properties ให้ครบ โดยรัน `setupConfig()` หรือจัดการผ่าน Apps Script UI
2. ตรวจสอบว่า token และ image file id ถูกต้อง
3. รัน function `main()` ใน Apps Script
4. ตรวจ log ว่า:
   - สร้าง Rich Menu สำเร็จ
   - upload image สำเร็จ
   - alias ถูกสร้าง/อัปเดต
   - default rich menu ถูกตั้งค่า
5. ใช้ `checkRichMenuStatus()` เพื่อตรวจสถานะ

## วิธี deploy Webhook หลังแก้โค้ด

หลังแก้ไฟล์ที่ webhook ใช้ เช่น `WebApp.js`, `EventHandler.js`, `MessageService.js`, `FlexBuilder.js`:

1. Push/copy โค้ดขึ้น Apps Script
2. ไปที่ Deploy > Manage deployments
3. เลือก deployment ปัจจุบัน > Edit
4. เลือก New version
5. Deploy
6. ทดสอบจาก LINE อีกครั้ง

## แนวทาง debug webhook

ดู log ใน Apps Script Executions โดยหา log ต่อไปนี้:

```text
=== doPost started ===
events count: ...
event[0] type: postback
postback received: ...
postback params: ...
Replying flex message for menu: ...
reply success: 200 ...
```

หากไม่พบ `doPost started`:

- LINE อาจไม่ได้เรียก webhook URL นี้
- Webhook URL ใน LINE Developers Console อาจไม่ตรง deployment ปัจจุบัน
- Webhook setting อาจยังไม่ enabled

หากพบ `postback received` แต่ไม่พบ `reply success`:

- ตรวจ `reply error: ...`
- ตรวจ channel access token
- ตรวจ replyToken หมดอายุหรือถูกใช้ซ้ำหรือไม่
- ตรวจ Flex payload ว่าถูกต้องตาม LINE schema หรือไม่

หากพบ `reply success: 200` แต่ผู้ใช้ไม่เห็นข้อความ:

- ตรวจว่าผู้ใช้คลิกพื้นที่ที่เป็น `stay_tab` หรือ `richmenuswitch` หรือไม่ เพราะอาจตั้งใจไม่ตอบกลับ
- ตรวจ LINE client/network
- ตรวจว่า Bot ถูก block หรือ chat context ถูกต้องหรือไม่

## ข้อควรระวัง

- LINE `replyToken` ใช้ได้ครั้งเดียวและมีอายุสั้น
- Rich Menu ที่ deploy แล้วจะไม่เปลี่ยนเองหากแก้ `MenuData.js` ต้องรัน deploy menu ใหม่
- Web App deployment version ไม่เปลี่ยนเองหากแก้โค้ด ต้อง deploy version ใหม่
- อย่าเก็บ secret/token ในเอกสารหรือ commit history
- ใน Apps Script ควรระวัง load order ระหว่างไฟล์ ใช้ namespace และ runtime dependency resolution เมื่อจำเป็น

## เอกสารที่เกี่ยวข้อง

- `app/docs/lesson-learned-rich-menu-flex-reply.md`