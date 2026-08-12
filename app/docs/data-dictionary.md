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
| mem_kk | number | No | - | ⚠️ ความหมายรอการยืนยัน (อัปเดต 2026-08-12) |
| mem_bk | number | No | - | ⚠️ ความหมายรอการยืนยัน (อัปเดต 2026-08-12) |
| mem_bh | number | No | - | ⚠️ ความหมายรอการยืนยัน (อัปเดต 2026-08-12) |

## หลักการออกแบบตาราง

- **ตำแหน่งคอลัมน์ไม่สำคัญ** — ระบบอ่าน/เขียนโดย map จาก **header row จริง** (`rowToObjectByHeaders`/`objectToRowByHeaders` + `SheetService.getHeaderMap`) จึง**สลับตำแหน่งฟิลด์ในชีทได้** โดยไม่ต้องแก้โค้ด (การ์ด MT-28) · ชื่อคอลัมน์ (header) ต้องตรงกับ DataDict เสมอ
- ถ้าคอลัมน์จำเป็นหายไปจาก header → ระบบ throw error ชัดเจน (ไม่ทำงานผิดเงียบ ๆ)
- ลำดับคอลัมน์ใน DataDict ใช้สำหรับ **สร้างชีทใหม่** และเป็นชื่อมาตรฐานของคอลัมน์

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

## รูปแบบข้อมูลวันที่ (มาตรฐานการจัดเก็บ)

**ข้อสรุป: เก็บเป็นข้อความ (string) — ใช่ และเป็นมาตรฐานของระบบแล้ว**

| ชนิด | รูปแบบ | ตัวอย่าง |
|------|--------|----------|
| **date** | `yyyy-mm-dd` (24 ชม.) | `2026-08-06` |
| **datetime** | `yyyy-mm-dd HH:mm:ss` | `2026-08-06 14:30:00` |

### เหตุผลที่เลือกเก็บเป็นข้อความ

1. **กันปัญหา timezone ของ Google Sheets/Apps Script** — Sheets เก็บวันที่เป็น serial number ผูกกับ timezone ของสเปรดชีต ส่วน `new Date('2026-08-06')` ใน Apps Script แปลงตาม timezone ของเซิร์ฟเวอร์ ทำให้ค่าอาจเพี้ยน ±1 วัน — การเก็บเป็นข้อความแล้ว parse แบบ manual (`Core.MemberRules.parseDate`) กำหนดเองได้ 100% (การ์ด MT-15)
2. **เรียงลำดับได้ด้วย string ตรง ๆ** — `yyyy-mm-dd` เรียงตามตัวอักษร = เรียงตามเวลาเสมอ จึงใช้ `String < / >` เปรียบเทียบช่วงวัน (`mem_eff_dt ≤ now ≤ mem_exp_dt`) ได้โดยไม่ต้องแปลง
3. **อ่านง่าย/ตรวจสอบง่าย** — คนเปิดชีทเห็นวันที่ชัดเจน ไม่ใช่ serial number (เช่น `45000`)
4. **ส่งออก/ย้ายฐานข้อมูลง่าย** — เป็น ISO-like string ที่ Firestore/PostgreSQL (เฟส 3) รองรับตรง ๆ — repository เป็นตัวแปลงตอนนั้น ไม่ต้องแก้ data

### กฎที่ต้องปฏิบัติ (Do / Don't)

- ✅ **เขียนผ่าน `DataDict.formatDate()` / `formatDateTime()` เสมอ** — ห้ามเอาค่า `Date` object หรือ `new Date().toISOString()` (มี `T` + timezone `Z`) เขียนลงชีทตรง ๆ
- ✅ **parse/เปรียบเทียบผ่าน `Core.MemberRules.parseDate()`** เสมอ (ไม่ใช้ `new Date(string)` ตรง ๆ)
- ✅ ใช้ **ปี ค.ศ. (2026)** ในข้อมูล — แปลงเป็น พ.ศ. เฉพาะตอนแสดงผล (ถ้าต้องการ)
- ❌ **ห้ามใช้ `dd-mm-yyyy` / `mm/dd/yyyy`** — เรียงตามตัวอักษรจะไม่ตรงกับเวลา และ parse สับสน
- ❌ ห้ามเก็บเวลาแบบมี `T` หรือ timezone offset (`2026-08-06T14:30:00Z`)
- ❌ ห้ามผสม `yyyy-mm-dd` และ `yyyy-mm-dd HH:mm:ss` ในคอลัมน์เดียวกัน (คอลัมน์ `mem_eff_dt` ควรใช้แบบเดียวตลอด)

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
