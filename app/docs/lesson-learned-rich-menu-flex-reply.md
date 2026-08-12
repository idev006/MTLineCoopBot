# Lesson Learned: Rich Menu คลิกแล้วไม่แสดง Flex Message

> 📖 **หมายเหตุ:** เอกสารนี้เป็นเอกสารประกอบรุ่นแรก — เอกสารโครงการฉบับสมบูรณ์ (เล่มหลัก) อยู่ที่ [README.md](./README.md)

วันที่บันทึก: 2026-08-06  
โครงการ: MTLineCoopBot  
หัวข้อ: LINE Rich Menu Postback → Webhook → Flex Message Reply

## สรุปปัญหา

เมื่อผู้ใช้คลิกเมนูใน LINE Rich Menu แล้ว Bot ไม่ตอบกลับเป็น Flex Message ตามที่คาดหวัง โดยช่วงแรกไม่พบ error ชัดเจนจากฝั่งผู้ใช้ ทำให้ต้องเพิ่ม log และ fallback เพื่อแยกสาเหตุว่า event มาถึง webhook หรือไม่ และ LINE Reply API ตอบกลับสถานะใด

## อาการที่พบ

- ผู้ใช้คลิก Rich Menu แล้วไม่มี Flex Message แสดงในห้องแชท
- โค้ด webhook ไม่แสดง error ให้ผู้ใช้เห็นโดยตรง
- ต้องตรวจจาก Apps Script Executions / Logs เพื่อดู flow จริง

## จุดที่เกี่ยวข้องในโค้ด

| ไฟล์ | หน้าที่ |
|---|---|
| `app/RichMenu/MenuData.js` | กำหนดพื้นที่และ action ของ Rich Menu |
| `app/WebApp.js` | entry point ของ LINE webhook ผ่าน `doPost(e)` |
| `app/LineBot/EventHandler.js` | แยกประเภท event และจัดการ postback/text message |
| `app/LineBot/FlexBuilder.js` | สร้าง Flex Message payload |
| `app/LineBot/MessageService.js` | ส่งข้อความผ่าน LINE Messaging API reply endpoint |
| `app/LineBot/ReplyStore.js` | เก็บ caption และข้อความของแต่ละเมนู |

## สาเหตุ/ข้อสังเกตสำคัญ

### 1. Google Apps Script อาจโหลดไฟล์ไม่ตรงกับ dependency order ที่คาดไว้

หากประกาศ dependency ไว้ระดับ top-level เช่น:

```javascript
const MessageService = LineBot.MessageService;
const ReplyStore = LineBot.ReplyStore;
const FlexBuilder = LineBot.FlexBuilder;
```

มีความเสี่ยงที่ตัวแปรเหล่านี้จะจับค่า `undefined` หาก Apps Script evaluate ไฟล์นั้นก่อนที่ module อื่นจะ attach เข้า namespace `LineBot` แล้ว เมื่อ webhook ทำงานภายหลัง postback handler อาจเรียก service ไม่ได้

แนวทางแก้คือ resolve dependency ตอน runtime ใน handler:

```javascript
function getDependencies() {
  return {
    MessageService: LineBot.MessageService,
    ReplyStore: LineBot.ReplyStore,
    FlexBuilder: LineBot.FlexBuilder
  };
}
```

แล้วเรียกใช้ภายใน function:

```javascript
function handlePostback(event, token) {
  const deps = getDependencies();
  // ...
  const caption = deps.ReplyStore.getCaption(params.item);
  const flexMessage = deps.FlexBuilder.menuClicked(caption);
  deps.MessageService.replyFlex(replyToken, flexMessage, token);
}
```

### 2. ต้อง log postback data จริงเสมอ

Rich Menu ที่ deploy อยู่จริงอาจเป็น version เก่า หรือ action data อาจไม่ตรงกับที่ handler คาด เช่น handler คาดว่า:

```text
action=menu_item&item=saving_account
```

แต่ Rich Menu ที่ active อาจส่ง data รูปแบบอื่น เช่น:

```text
saving_account
item=saving_account
menu=saving_account
action=saving_account
```

จึงเพิ่ม log:

```javascript
Logger.log(`postback received: ${data}`);
Logger.log(`postback params: ${JSON.stringify(params)}`);
```

### 3. ควรคืนผลจาก LINE Reply API เพื่อ debug ได้

เดิม `MessageService.send()` ส่ง request แล้ว log เฉพาะกรณี error บางส่วน การปรับให้คืน object ช่วยตรวจสอบได้ง่ายขึ้น:

```javascript
return {
  ok: statusCode === 200,
  statusCode,
  body
};
```

และ log ทั้ง success/error:

```javascript
if (statusCode !== 200) {
  Logger.log(`reply error: ${statusCode} ${body}`);
} else {
  Logger.log(`reply success: ${statusCode} ${body}`);
}
```

### 4. ควรมี fallback สำหรับ postback format เดิมหรือไม่ตรง pattern

เพื่อให้ Rich Menu ที่เคย deploy ไปแล้วแต่มี data format ต่างกันยังตอบ Flex ได้ ควรรองรับหลาย key:

```javascript
const fallbackItem = params.item || params.menu || params.action || data;
if (fallbackItem && deps.ReplyStore.CAPTIONS[fallbackItem]) {
  const caption = deps.ReplyStore.getCaption(fallbackItem);
  const flexMessage = deps.FlexBuilder.menuClicked(caption);
  deps.MessageService.replyFlex(replyToken, flexMessage, token);
  return;
}
```

### 5. ต้อง deploy Web App version ใหม่หลังแก้ Apps Script

ถ้า Web App ใช้ deployment แบบ versioned การแก้ไฟล์ใน editor อย่างเดียวอาจยังไม่กระทบ URL ที่ LINE webhook ใช้อยู่ ต้องทำ:

1. Deploy > Manage deployments
2. เลือก deployment ปัจจุบัน > Edit
3. เลือก New version
4. Deploy

หากไม่ deploy version ใหม่ LINE อาจยังเรียกโค้ดเก่า ทำให้ดูเหมือนแก้แล้วแต่ behavior ไม่เปลี่ยน

## Checklist สำหรับ debug ครั้งต่อไป

เมื่อตรวจปัญหา Rich Menu ไม่ตอบกลับ ให้ไล่ตามลำดับนี้:

- [ ] ตรวจว่า LINE webhook URL ชี้ไป Apps Script deployment ล่าสุด
- [ ] ตรวจว่า Web App deployment เป็น version ล่าสุดแล้ว
- [ ] ตรวจ Apps Script Executions / Logs ว่ามี `doPost started` หรือไม่
- [ ] ตรวจว่ามี `postback received:` หรือไม่
- [ ] ตรวจ `postback received:` ว่า data ตรงกับ handler หรือไม่
- [ ] ตรวจว่า event เป็น `postback` ไม่ใช่ `message`
- [ ] ตรวจว่า action ไม่ใช่ `richmenuswitch` หรือ `stay_tab` เพราะสองกรณีนี้อาจตั้งใจไม่ตอบข้อความ
- [ ] ตรวจ `reply success: 200` หรือ `reply error: ...`
- [ ] หาก reply error ให้ดู body จาก LINE API เพื่อแก้ payload/token/replyToken
- [ ] หากไม่มี postback log ให้ redeploy rich menu หรือเช็ค webhook setting ใน LINE Developers Console

## แนวทางป้องกันในอนาคต

1. อย่า cache module dependency ที่ top-level ใน Apps Script หาก dependency อยู่คนละไฟล์ ให้ resolve ตอน runtime
2. ทุก webhook handler ควร log raw event หรืออย่างน้อย log event type และ postback data
3. service ที่เรียก external API ควร return status/result เพื่อให้ handler ตัดสินใจต่อได้
4. Rich Menu action data ควรมีรูปแบบมาตรฐาน เช่น `action=menu_item&item=<id>`
5. หลังแก้โค้ดที่เกี่ยวกับ webhook ต้อง deploy Web App version ใหม่เสมอ
6. หลังแก้ Rich Menu payload ต้อง run deploy rich menu ใหม่เสมอ

## ตัวอย่าง flow ที่ถูกต้อง

1. ผู้ใช้คลิก Rich Menu item เช่น บัญชีเงินฝาก
2. LINE ส่ง postback event มาที่ `doPost(e)`
3. `WebApp.js` ส่ง event ต่อให้ `LineBot.EventHandler.handlePostback(event, token)`
4. `EventHandler` parse data ได้:

```text
action=menu_item&item=saving_account
```

5. `ReplyStore.getCaption('saving_account')` คืนค่า `บัญชีเงินฝาก`
6. `FlexBuilder.menuClicked('บัญชีเงินฝาก')` สร้าง Flex Message
7. `MessageService.replyFlex(replyToken, flexMessage, token)` เรียก LINE Reply API
8. log แสดง `reply success: 200 ...`

## หมายเหตุ

ห้ามบันทึก Channel Access Token หรือ secret อื่น ๆ ลงเอกสารหรือ repository เอกสารนี้ตั้งใจอธิบาย pattern และแนวทาง debug เท่านั้น