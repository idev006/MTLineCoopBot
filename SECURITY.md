# ความปลอดภัยของโครงการ (Security)

เอกสารสรุปการจัดการความลับ (secrets) ของ MTLineCoopBot — มาตรการปัจจุบัน + สิ่งที่ต้องทำเมื่อ secret รั่วไหล

## 🚨 เหตุการณ์ 12 ส.ค. 2026 (Incident Timeline)

| ลำดับ | สิ่งที่เกิด | การแก้ไข |
|-------|-----------|----------|
| 1 | **Leak** — Channel Access Token ถูก hardcode ใน `Config.js setupConfig()` และถูก commit ขึ้น repo (public) ใน initial commit | ตรวจพบระหว่างทำ CI secret scan |
| 2 | **Remove** — token ถูกลบออกจากโค้ดทันที (config อ่านจาก Script Properties เท่านั้น) + เพิ่ม CI กันซ้ำ (regex + gitleaks) | commit `07b5e44`, `fc1a8ec` |
| 3 | **Rotate** — หมุน token: ออก token ใหม่ใน LINE Console → อัปเดต Script Properties → `checkTokenHealth()` ยืนยัน HTTP 200 → Deactivate token เก่า (การ์ด MT-26) | ✅ ยืนยันครบ 3 ข้อ |
| 4 | **Purge** — rewrite ประวัติ git ด้วย `filter-repo` (token → `***REMOVED***` ทุก commit) + ลบ allowlist ใน `.gitleaks.toml` → force-push | commit `bc2c69b` |

> ⚠️ **บทเรียนสำคัญ:** purge ประวัติลบ token ได้แค่จาก repo กลางเท่านั้น — ผู้ที่ clone ไปก่อน purge ยังมี token ในประวัติเก่า **การหมุน (rotate) token คือทางแก้อันเดียวที่แก้การเปิดเผยได้จริง**

## 🛡️ มาตรการป้องกันปัจจุบัน (Current Protections)

| ชั้น | มาตรการ | ที่มา |
|------|---------|------|
| **การเก็บความลับ** | Token/Secret เก็บใน **Script Properties** เท่านั้น (`Config.js` อ่าน/จัดการ) — ห้าม hardcode ในซอร์ส | บทที่ 4.4, 5.5 |
| **CI — secret scan (regex)** | `scripts/ci-test.js` ตรวจ pattern token/secret ในไฟล์โค้ด — **fail ถ้าพบ** | `.github/workflows/ci.yml` |
| **CI — gitleaks** | ตรวจ API keys / private keys / generic secrets + **ประวัติ git ทั้งหมด** (`fetch-depth: 0`, config `.gitleaks.toml`) | job แยกใน CI |
| **ตรวจสุขภาพ token** | `checkTokenHealth()` ใน `app/Test.js` — เรียก LINE Get Bot Info API → รายงาน `HTTP 200` / `401` | บทที่ 5.5.1, 7.1.3 |
| **Runbook การหมุน** | บทที่ 5.5.1 — ขั้นตอนหมุน token ครบวงจร | ch-05 |
| **การเฝ้าระวัง** | Checklist ความปลอดภัยรายเดือน (บทที่ 7.1.3): หมุนตามนโยบาย · ตรวจสุขภาพ token · ทบทวนสิทธิ์ | ch-07 |

## 🚑 เมื่อ secret รั่วซ้ำ — ทำตามนี้ทันที (Incident Response)

### 1. หมุน secret ก่อนอย่างอื่น (สำคัญที่สุด)
```text
LINE Console → Channel access token → Issue token ใหม่
Apps Script Editor → Script Properties → เปลี่ยนค่า → ทดสอบด้วย checkTokenHealth()
→ ยืนยัน HTTP 200 → Deactivate token เก่า
```
> ถ้าเป็น `WEBHOOK_SECRET` → หลังเปลี่ยน ต้องอัปเดต Webhook URL ใน LINE Console (`?webhook_secret=...`) ด้วย

### 2. ลบ secret ออกจากโค้ด/ประวัติ
1. ลบ hardcoded value ออกจากซอร์ส — ใช้ Script Properties แทน
2. รัน `node scripts/ci-test.js` + `gitleaks detect` — CI ต้องเขียว
3. ถ้า secret อยู่ในประวัติ git → rewrite ด้วย `git filter-repo --replace-text` แล้ว force-push (ดูประวัติการ purge ครั้งก่อน)

### 3. บันทึกเหตุการณ์
- เพิ่มการ์ดใน `KANBAN.md` (เช่น MT-26) ตามขั้นตอนการยืนยัน
- อัปเดตตารางสถานะ `README.md` (app/docs)
- แจ้งสมาชิกทีมที่ clone repo ไปแล้ว — ต้อง pull ประวัติใหม่ (ประวัติเก่าอาจมี secret)

### 4. ป้องกันซ้ำ
- ยืนยันว่า CI secret scan (regex + gitleaks) ทำงาน — ถ้า secret ผ่าน CI ขึ้นไปได้ = ปิดช่องโหว่ของ CI ก่อน
- ทบทวนว่าทำไม secret ถึงหลุด (กระบวนการ/เครื่องมือ/คน) — ไม่ใช่แค่ลบแล้วจบ

## 📎 เอกสารอ้างอิง

- Runbook หมุน token: [บทที่ 5.5.1](./app/docs/ch-05-installation-deployment.md)
- การเฝ้าระวังความปลอดภัย: [บทที่ 7.1.3](./app/docs/ch-07-maintenance-roadmap.md)
- Repository Pattern (สลับฐานข้อมูล): [บทที่ 3.2.4](./app/docs/ch-03-system-design.md)
- การ์ดติดตาม: [KANBAN.md](./app/docs/KANBAN.md)
