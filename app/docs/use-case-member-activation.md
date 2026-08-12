# Use Case: ระบบ Activate สมาชิกผ่าน LINE Bot

> 📖 **หมายเหตุ:** เอกสารนี้เป็นเอกสารประกอบรุ่นแรก — เอกสารโครงการฉบับสมบูรณ์ (เล่มหลัก) อยู่ที่ [README.md](./README.md) โดยชื่อชีทปัจจุบันอ้างอิงตาม DataDict: `t_member_mast`

วันที่บันทึก: 2026-08-06  
โครงการ: MTLineCoopBot  
หัวข้อ: Member Activation via LINE Bot

## ภาพรวม

ผู้ใช้สามารถ activate บัญชีสมาชิกผ่าน LINE Bot โดยการพิมพ์คำสั่ง `activate:{{ACTIVATE_CODE}}` ระบบจะตรวจสอบรหัส อัปเดตข้อมูลสมาชิก และตอบกลับด้วย Flex Message ต้อนรับ

## Flow การทำงาน

```
ผู้ใช้พิมพ์: activate:ABC123
        ↓
LINE ส่ง text message event มาที่ webhook
        ↓
EventHandler.handleTextMessage()
        ↓
ตรวจสอบ text.startsWith('activate:')
        ↓
ActivationService.handleActivate()
        ↓
SheetService.findByActivateCode('ABC123')
        ↓
ตรวจสอบว่าพบรหัสหรือไม่
        ↓
ตรวจสอบว่าถูก activate ไปแล้วหรือไม่ (mem_eff_dt มีค่าหรือไม่)
        ↓
ถ้ายังไม่ activate → SheetService.activateMember()
        ↓
อัปเดต mem_eff_dt = now()
อัปเดต mem_exp_dt = now() + 365 วัน
อัปเดต mem_status = 'active'
อัปเดต line_user_id = LINE user ID
        ↓
FlexBuilder.welcomeMember() สร้าง Flex Message
        ↓
MessageService.replyFlex() ส่งข้อความต้อนรับ
        ↓
ผู้ใช้เห็น Flex Message "ยินดีต้อนรับ... Activate สำเร็จ"
```

## โครงสร้างข้อมูล Google Sheets

### Sheet Name: `t_member_mast`

| คอลัมน์ | ชื่อฟิลด์ | คำอธิบาย |
|---|---|---|
| A | mem_code | รหัสสมาชิก |
| B | mem_title | คำนำหน้า |
| C | mem_fname | ชื่อ |
| D | mem_lname | นามสกุล |
| E | mem_rank_score | คะแนนตำแหน่ง |
| F | mem_position | ตำแหน่ง |
| G | mem_position_score | คะแนนตำแหน่ง |
| H | mem_eff_dt | วันที่มีผล (activate แล้วจะเป็น now()) |
| I | mem_exp_dt | วันที่หมดอายุ (activate แล้วจะเป็น now() + 365) |
| J | mem_status | สถานะ (activate แล้วจะเป็น 'active') |
| K | activate_code | รหัสสำหรับ activate |
| L | line_user_id | LINE User ID (activate แล้วจะถูกบันทึก) |

## รูปแบบคำสั่ง

```
activate:{{ACTIVATE_CODE}}
```

ตัวอย่าง:
- `activate:ABC123`
- `activate:MEM2024001`
- `activate:COOP-001`

## กรณีการตอบกลับ

### 1. Activate สำเร็จ

**เงื่อนไข:**
- รหัส activate_code ถูกต้อง
- mem_eff_dt ยังไม่มีค่า (ยังไม่เคย activate)

**ผลลัพธ์:**
- อัปเดตข้อมูลสมาชิกใน Google Sheets
- ส่ง Flex Message ต้อนรับ

**Flex Message ประกอบด้วย:**
- Header: "🎉 ยินดีต้อนรับ"
- Body: ชื่อ-นามสกุล, รหัสสมาชิก, วันที่ activate, วันหมดอายุ
- Footer: ปุ่ม "เข้าสู่เมนูหลัก"

### 2. รหัสไม่ถูกต้อง

**เงื่อนไข:**
- ไม่พบ activate_code ในระบบ

**ผลลัพธ์:**
- ส่งข้อความ: "ไม่พบรหัส activate นี้ในระบบ กรุณาตรวจสอบรหัสและลองใหม่อีกครั้ง"

### 3. รหัสถูกใช้ไปแล้ว

**เงื่อนไข:**
- พบ activate_code แต่ mem_eff_dt มีค่าแล้ว

**ผลลัพธ์:**
- ส่งข้อความ: "รหัสนี้ถูกใช้ไปแล้ว ไม่สามารถ activate ซ้ำได้"

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `app/Config.js` | กำหนดชื่อ Sheet และ headers |
| `app/LineBot/SheetService.js` | ติดต่อ Google Sheets |
| `app/LineBot/ActivationService.js` | Logic การ activate |
| `app/LineBot/FlexBuilder.js` | สร้าง Flex Message ต้อนรับ |
| `app/LineBot/EventHandler.js` | รับคำสั่ง activate:... |

## การตั้งค่าเริ่มต้น

### 1. สร้าง Google Sheets

1. สร้าง Google Sheets ใหม่
2. เปลี่ยนชื่อ Sheet แรกเป็น `t_member_mast` (ตาม DataDict) หรือปล่อยให้ระบบสร้างอัตโนมัติเมื่อรันครั้งแรก
3. เพิ่ม header ในแถวแรกตามตารางด้านบน
4. เพิ่มข้อมูลสมาชิกพร้อม activate_code (ยังไม่ต้องกรอก mem_eff_dt, mem_exp_dt, mem_status, line_user_id)

ตัวอย่างข้อมูล:

| mem_code | mem_title | mem_fname | mem_lname | ... | activate_code | line_user_id |
|---|---|---|---|---|---|---|
| M001 | นาย | สมชาย | ใจดี | ... | ABC123 | |
| M002 | นางสาว | สมหญิง | รักเรียน | ... | XYZ789 | |

### 2. ตั้งค่า Script Properties

เพิ่มใน `setupConfig()` หรือตั้งค่าผ่าน Apps Script UI:

```javascript
Config.setup({
  'CHANNEL_ACCESS_TOKEN': 'your_token',
  'IMAGE_FILE_ID_TAB_A': 'your_image_id',
  'IMAGE_FILE_ID_TAB_B': 'your_image_id'
});
```

### 3. สิทธิ์การเข้าถึง

ตรวจสอบว่า Apps Script มีสิทธิ์เข้าถึง Google Sheets:
1. ไปที่ Project Settings > Scopes
2. เพิ่ม scope: `https://www.googleapis.com/auth/spreadsheets`
3. หรือรันฟังก์ชันที่ใช้ SpreadsheetApp ครั้งแรก Apps Script จะขอสิทธิ์อัตโนมัติ

## การทดสอบ

### ทดสอบใน Apps Script

1. เปิด Google Sheets ที่มีข้อมูลสมาชิก
2. รันฟังก์ชันทดสอบ:

```javascript
function testActivation() {
  const result = LineBot.ActivationService.handleActivate(
    'ABC123',                    // activateCode
    'U1234567890abcdef',         // lineUserId (จำลอง)
    'test-reply-token',          // replyToken (จำลอง)
    'your-channel-access-token'  // token (จำลอง)
  );
  Logger.log(result);
}
```

### ทดสอบผ่าน LINE

1. Deploy Web App version ใหม่
2. ส่งข้อความใน LINE: `activate:ABC123`
3. ตรวจสอบ log ใน Apps Script Executions
4. ตรวจสอบข้อมูลใน Google Sheets ว่าอัปเดตถูกต้อง

## Log ที่ควรตรวจสอบ

```
Processing activation for code: ABC123, LINE user: U1234567890...
Activated member at row 2 for LINE user U1234567890...
Welcome flex message sent successfully for member: M001
```

หรือกรณีผิดพลาด:

```
Activate code not found: WRONGCODE
Activate code already used: ABC123
Failed to send welcome flex message: 400 {...}
```

## ข้อควรระวัง

1. **activate_code ต้อง unique** - ระบบจะหยุดที่รายการแรกที่พบ
2. **mem_eff_dt เป็นตัวบ่งชี้** - ถ้ามีค่าแล้วจะถือว่า activate ไปแล้ว
3. **line_user_id จะถูก overwrite** - ถ้า activate ซ้ำ (ถ้าอนุญาต)
4. **วันหมดอายุ = 365 วัน** - ปรับได้ใน `SheetService.activateMember()`
5. **ต้องมี Active Spreadsheet** - ต้องเปิด Google Sheets ก่อนรันโค้ด

## การขยายฟีเจอร์

### เพิ่มการตรวจสอบวันหมดอายุ

```javascript
function isExpired(member) {
  if (!member.memExpDt) return false;
  return new Date(member.memExpDt) < new Date();
}
```

### เพิ่มการ renew membership

```javascript
function renewMembership(rowIndex) {
  const sheet = getSheet();
  const currentExp = sheet.getRange(rowIndex, 9).getValue(); // mem_exp_dt
  const newExp = new Date(currentExp);
  newExp.setDate(newExp.getDate() + 365);
  sheet.getRange(rowIndex, 9).setValue(newExp);
}
```

### เพิ่มการแจ้งเตือนก่อนหมดอายุ

สร้าง Time-driven trigger ใน Apps Script เพื่อตรวจสอบสมาชิกที่ใกล้หมดอายุและส่งข้อความแจ้งเตือน

## เอกสารที่เกี่ยวข้อง

- `app/docs/project-line-bot-rich-menu.md`
- `app/docs/lesson-learned-rich-menu-flex-reply.md`