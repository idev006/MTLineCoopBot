# Data Dictionary (SSOT)

> 📖 **หมายเหตุ:** เอกสารโครงการฉบับสมบูรณ์ (เล่มหลัก) อยู่ที่ [README.md](./README.md)

เอกสารนี้เป็น Single Source of Truth สำหรับโครงสร้างข้อมูลในระบบ MTLineCoopBot

## ภาพรวม

DataDict.js เป็น SSOT ที่กำหนดโครงสร้างตาราง t_member_mast ในระบบ

## ตารางในระบบ

### MEMBER_MASTER (t_member_mast)
ตารางหลักข้อมูลสมาชิก

| คอลัมน์ | ประเภท | บังคับ | ค่าเริ่มต้น | คำอธิบาย |
|---------|--------|--------|-------------|----------|
| mem_code | string | Yes | - | รหัสสมาชิก |
| mem_title | string | No | - | คำนำหน้า |
| mem_fname | string | Yes | - | ชื่อ |
| mem_lname | string | Yes | - | นามสกุล |
| mem_rank_score | number | No | - | คะแนนตำแหน่ง |
| mem_position | string | No | - | ตำแหน่ง |
| mem_position_score | number | No | - | คะแนนตำแหน่ง |
| mem_eff_dt | date | No | - | วันที่มีผล (รูปแบบ yyyy-mm-dd) |
| mem_exp_dt | date | No | - | วันที่หมดอายุ (รูปแบบ yyyy-mm-dd) |
| mem_status | string | No | inactive | สถานะ |
| activate_code | string | No | - | รหัส Activate (unique) |
| line_user_id | string | No | - | LINE User ID |
| mem_role | string | No | member | บทบาท (member / staff / admin) |

## รูปแบบข้อมูลวันที่

- **date**: เก็บเป็น string รูปแบบ `yyyy-mm-dd` เช่น `2026-08-06`
- **datetime**: เก็บเป็น string รูปแบบ `yyyy-mm-dd HH:mm:ss` เช่น `2026-08-06 14:30:00`

## การใช้งาน DataDict

### ดึงข้อมูลตาราง

```javascript
const table = DataDict.getTable('MEMBER_MASTER');
console.log(table.name); // 't_member_mast'
```

### ดึงชื่อคอลัมน์ทั้งหมด

```javascript
const columns = DataDict.getColumns('MEMBER_MASTER');
// ['mem_code', 'mem_title', 'mem_fname', ...]
```

### หา index ของคอลัมน์

```javascript
const index = DataDict.getColumnIndex('MEMBER_MASTER', 'activate_code');
// 10 (0-based)
```

### ตรวจสอบบทบาทสมาชิก

```javascript
const member = { mem_code: 'M001', mem_role: 'staff', ... };
if (member.mem_role === 'admin') {
  // อนุญาตเฉพาะ admin
}
```
```

### แปลงแถวเป็น object

```javascript
const row = ['M001', 'นาย', 'สมชาย', 'ใจดี', ...];
const obj = DataDict.rowToObject('MEMBER_MASTER', row);
// { mem_code: 'M001', mem_title: 'นาย', ... }
```

### แปลง object เป็นแถว

```javascript
const obj = { mem_code: 'M001', mem_title: 'นาย', ... };
const row = DataDict.objectToRow('MEMBER_MASTER', obj);
// ['M001', 'นาย', ...]
```

### ค้นหาข้อมูล

```javascript
const data = sheet.getDataRange().getValues();
const result = DataDict.query('MEMBER_MASTER').findBy(data, 'activate_code', 'ABC123');
```

### แปลงวันที่

```javascript
const dateStr = DataDict.formatDate(new Date());
// '2026-08-06'

const dateTimeStr = DataDict.formatDateTime(new Date());
// '2026-08-06 14:30:00'
```

## ไฟล์ที่เกี่ยวข้อง

- `app/DataDict.js` - SSOT หลัก
- `app/LineBot/SheetService.js` - ใช้ DataDict ติดต่อ Sheets
- `app/docs/data-dictionary.md` - เอกสารนี้
