/**
 * @fileoverview Core.DateConverter
 * แปลงรูปแบบวันที่ระหว่าง Google Sheets (string `yyyy-mm-dd` / `yyyy-mm-dd HH:mm:ss`)
 * กับ Firestore TIMESTAMP (เฟส 3 — สถาปัตยกรรม API-First, บทที่ 3.1.1)
 *
 * pure functions — เทสต์ใน node ได้โดยไม่ต้อง mock ใดๆ
 *
 * ⚠️ ข้อตกลง timezone (สำคัญ):
 * แปลงโดยตีความ "wall-clock" ที่เก็บในชีทเป็น **UTC** (ผ่าน Date.UTC)
 * เพื่อให้ round-trip string → timestamp → string ตรงกันเป๊ะเสมอ
 * โดยไม่ขึ้นกับ timezone ของเครื่อง/สเปรดชีต
 * จุดตัดสินใจเฟส 3: ถ้าต้องการให้ timestamp สะท้อนเวลาจริงในไทย (+07:00)
 * ให้บวก offset ที่จุดเดียวใน `toEpochMillis` (หรือเลือกเก็บเป็น string ใน Firestore แทน)
 */

var Core = Core || {};

Core.DateConverter = (() => {
  'use strict';

  const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
  const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

  /**
   * แยกส่วนประกอบจาก string ตาม type — throw ถ้ารูปแบบไม่ตรงมาตรฐาน
   * @param {*} value
   * @param {string} type - 'date' | 'datetime'
   * @returns {RegExpMatchArray}
   */
  function parseParts(value, type) {
    const re = type === 'date' ? DATE_RE : DATETIME_RE;
    const m = String(value).trim().match(re);
    if (!m) {
      const expected = type === 'date' ? 'yyyy-mm-dd' : 'yyyy-mm-dd HH:mm:ss';
      throw new Error(`รูปแบบวันที่ไม่ถูกต้อง: "${value}" (ต้องเป็น ${expected} — ดู data-dictionary.md)`);
    }
    return m;
  }

  /**
   * string/Date → epoch millis (ตีความ wall-clock เป็น UTC)
   * @param {*} value
   * @param {string} type
   * @returns {number}
   */
  function toEpochMillis(value, type) {
    if (value instanceof Date) return value.getTime();
    const m = parseParts(value, type);
    return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }

  /**
   * epoch millis → string ตาม type (ใช้ส่วนประกอบ UTC)
   * @param {number} ms
   * @param {string} type
   * @returns {string}
   */
  function epochMillisToSheetString(ms, type) {
    const d = new Date(ms);
    const pad = (n) => String(n).padStart(2, '0');
    const y = d.getUTCFullYear();
    const mo = pad(d.getUTCMonth() + 1);
    const da = pad(d.getUTCDate());
    if (type === 'date') return `${y}-${mo}-${da}`;
    const h = pad(d.getUTCHours());
    const mi = pad(d.getUTCMinutes());
    const s = pad(d.getUTCSeconds());
    return `${y}-${mo}-${da} ${h}:${mi}:${s}`;
  }

  /**
   * Firestore Timestamp → epoch millis
   * รองรับ 3 รูปแบบ: Date object | REST { seconds, nanos } | RFC3339 string
   * @param {Date|Object|string} ts
   * @returns {number}
   */
  function timestampToMillis(ts) {
    if (ts instanceof Date) return ts.getTime();
    if (ts && typeof ts === 'object' && typeof ts.seconds === 'number') {
      return ts.seconds * 1000 + Math.floor((ts.nanos || 0) / 1e6);
    }
    if (typeof ts === 'string') {
      const d = new Date(ts);
      if (isNaN(d.getTime())) {
        throw new Error(`รูปแบบ Firestore timestamp ไม่ถูกต้อง: "${ts}"`);
      }
      return d.getTime();
    }
    throw new Error('Firestore timestamp ต้องเป็น Date | { seconds, nanos } | RFC3339 string');
  }

  /**
   * string จากชีท → Firestore REST Timestamp { seconds, nanos }
   * @param {*} value - 'yyyy-mm-dd' หรือ 'yyyy-mm-dd HH:mm:ss' (หรือ Date object)
   * @param {string} type - 'date' | 'datetime'
   * @returns {{seconds: number, nanos: number}}
   */
  function toFirestoreTimestamp(value, type) {
    const ms = toEpochMillis(value, type);
    return {
      seconds: Math.floor(ms / 1000),
      nanos: (ms % 1000) * 1e6
    };
  }

  /**
   * Firestore Timestamp → string ตามมาตรฐานชีท
   * @param {Date|Object|string} ts
   * @param {string} type - 'date' | 'datetime'
   * @returns {string}
   */
  function fromFirestoreTimestamp(ts, type) {
    return epochMillisToSheetString(timestampToMillis(ts), type);
  }

  return {
    toFirestoreTimestamp,
    fromFirestoreTimestamp,
    toEpochMillis,
    epochMillisToSheetString,
    timestampToMillis
  };
})();
