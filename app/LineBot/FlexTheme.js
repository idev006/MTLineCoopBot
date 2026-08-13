/**
 * @fileoverview LineBot.FlexTheme
 * Design Tokens (มาตรฐานกลาง) สำหรับ Flex Message ทั้งหมดในระบบ — การ์ด MT-33
 *
 * ชั้น 0 ของ Flex Component Library:
 * - ทุกสี / ขนาด / ระยะห่าง / รัศมี กำหนดไว้ที่เดียว (SSOT)
 * - Component อื่น ๆ (FlexBuilder) อ่านค่าจากที่นี่เท่านั้น — ห้าม hardcode สีในโค้ด
 *   (กันด้วย CI: scan ไฟล์ FlexBuilder.js ไม่ให้มี hex color)
 * - เปลี่ยนธีม = แก้ไฟล์นี้ไฟล์เดียว (เช่น เปลี่ยนสีสหกรณ์ / ปรับขนาดการ์ด)
 */

var LineBot = LineBot || {};

LineBot.FlexTheme = {
  // ── สีหลัก (Brand) ──
  brandColor: '#1DB446',     // เขียวสหกรณ์ — header / ปุ่มหลัก
  white: '#FFFFFF',          // ตัวอักษรบนสีเข้ม / พื้นหลัง body มาตรฐาน
  textPrimary: '#333333',    // ตัวอักษรหลัก
  textMuted: '#666666',      // ตัวอักษรรอง (เช่น รหัสสมาชิก)
  textSecondary: '#888888',  // ตัวอักษรอธิบาย / เชิงอรรถ
  boxBg: '#F0F8F0',          // พื้นหลังกล่องข้อมูล (เขียวอ่อน)

  // ── สีสถานะ (status → สี) — ใช้กับ statusBadge ──
  statusColors: {
    active: '#1DB446',    // ใช้งานอยู่ / สำเร็จ / ชำระแล้ว / ส่งแล้ว
    paid: '#1DB446',
    sent: '#1DB446',
    inactive: '#95A5A6',  // ยังไม่เปิดใช้งาน
    expiring: '#E6A23C',  // ใกล้หมดอายุ / เตือน
    expired: '#E74C3C',   // หมดอายุ / ผิดพลาด
    draft: '#888888'      // ร่าง / ยังไม่เผยแพร่
  },

  // ── ขนาด (Spacing / Radius / Bubble) ──
  bubbleSize: 'kilo',  // ขนาด bubble มาตรฐานของระบบ
  paddingMd: 'md',     // ระยะห่างกลาง (เช่น header ย่อ)
  paddingLg: 'lg',     // ระยะห่างมาตรฐาน (header / body / footer)
  radiusMd: 'md'       // รัศมีมุมกล่องข้อมูล
};
