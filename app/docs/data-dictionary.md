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

## หลักการตั้งชื่อตาราง

- **lower case ทั้งหมด** และ **ขึ้นต้นด้วย `t_`** เช่น `t_member_mast`
- ตารางหนึ่งสร้างตาม **หนึ่ง use case / กลุ่มเมนู** (ขยายได้ในอนาคต — บทที่ 2.4.3)
- ทุกตารางนิยามใน `DataDict.js` (SSOT) เพียงจุดเดียว — ห้ามแก้คอลัมน์ที่ Sheet ตรง ๆ

### SAVINGS_ACCT (t_savings_acct) ✅ ทำแล้ว (การ์ด MT-27)
บัญชีเงินฝากสมาชิก — ใช้กับเมนู `saving_acct` / `chk_balance`

| คอลัมน์ | ประเภท | บังคับ | ค่าเริ่มต้น | คำอธิบาย |
|---------|--------|--------|-------------|----------|
| mem_code | string | Yes | - | รหัสสมาชิก (FK → t_member_mast) |
| acct_no | string | Yes | - | เลขบัญชี (unique) |
| acct_type | string | No | ออมทรัพย์ | ประเภทบัญชี (ออมทรัพย์/ออมทรัพย์พิเศษ/ประจำ) |
| balance | number | Yes | - | ยอดเงินฝากคงเหลือ |
| updated_dt | date | No | - | วันที่อัปเดตล่าสุด |

### LOAN_ACCT (t_loan_acct) ✅ ทำแล้ว (การ์ด MT-27)
บัญชีหนี้เงินกู้สมาชิก — ใช้กับเมนู `loan_balance`

| คอลัมน์ | ประเภท | บังคับ | ค่าเริ่มต้น | คำอธิบาย |
|---------|--------|--------|-------------|----------|
| mem_code | string | Yes | - | รหัสสมาชิก (FK → t_member_mast) |
| loan_no | string | Yes | - | เลขสัญญา (unique) |
| principal | number | Yes | - | วงเงินกู้ |
| outstanding | number | Yes | - | ยอดหนี้คงค้าง |
| due_dt | date | No | - | วันครบกำหนด |

### DIVIDEND (t_dividend) ✅ ทำแล้ว (การ์ด MT-27)
เงินปันผลและหุ้นรายปี — ใช้กับเมนู `dividends` / `share_capital`

| คอลัมน์ | ประเภท | บังคับ | ค่าเริ่มต้น | คำอธิบาย |
|---------|--------|--------|-------------|----------|
| mem_code | string | Yes | - | รหัสสมาชิก (FK → t_member_mast) |
| year | number | Yes | - | ปีบัญชี (พ.ศ.) |
| dividend_amt | number | No | - | เงินปันผล |
| share_capital | number | No | - | เงินหุ้น/ทุนเรือนหุ้น |

### ACTIVATION_LOG (t_activation_log) ✅ ทำแล้ว (การ์ด MT-27)
บันทึกการ Activate สมาชิก (audit trail — เตรียม Actor staff/admin ในอนาคต บทที่ 2.4.3)

| คอลัมน์ | ประเภท | บังคับ | ค่าเริ่มต้น | คำอธิบาย |
|---------|--------|--------|-------------|----------|
| log_id | string | Yes | - | รหัสบันทึก (unique) |
| mem_code | string | Yes | - | รหัสสมาชิก |
| line_user_id | string | No | - | LINE User ID |
| activate_code | string | No | - | รหัส Activate |
| status | string | No | success | ผลลัพธ์ (success / failed) |
| activated_dt | datetime | No | - | เวลาที่บันทึก |

> 📌 **หมายเหตุ (การ์ด MT-27):** ตารางทั้ง 4 นี้มี **dummy data** ผ่าน `SeedData.createDummyTables()` (รันใน Apps Script Editor) — ข้อมูลตัวอย่างใช้รหัสสมาชิก `MEM001`–`MEM003` ซึ่งต้องมีอยู่ใน `t_member_mast` ถึงจะเห็นข้อมูลการเงินจริงในเมนู (ดู `app/SeedData.js` และบทที่ 5.6.4)
> เมื่อแทนที่ด้วยข้อมูลจริง: แก้ค่าในชีทได้เลย โดยไม่ต้องแก้โค้ด — โครงสร้างคอลัมน์ห้ามแกะเอง ต้องแก้ที่ `DataDict.js` (SSOT) ก่อน

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
