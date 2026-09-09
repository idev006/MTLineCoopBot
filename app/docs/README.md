# Legacy documentation pointer

เอกสารโครงการเชิงสถาปัตยกรรม กระบวนการพัฒนา สถานะงาน การตรวจสอบ ความปลอดภัย และ traceability มี **Single Source of Truth (SSOT)** อยู่ที่ repository:

- `idev006/MTP6LineCoopBot`
- canonical path: `docs/ssot/`

ไฟล์ใน `app/docs/` เคยเป็นสำเนา legacy และถูก retire เพื่อป้องกัน documentation drift.

กติกา:
- ห้ามเพิ่ม substantive project documentation กลับมาใน `app/docs/`
- เอกสารที่เปลี่ยนตาม architecture/security/process/release ให้แก้ที่ `MTP6LineCoopBot/docs/ssot/`
- backend README นี้และ pointer นี้มีไว้สำหรับนำทางเท่านั้น
