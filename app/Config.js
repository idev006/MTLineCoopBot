/**
 * @fileoverview Config
 * จัดการค่าคอนฟิกจาก Script Properties และค่าคงที่ของระบบ
 */

const Config = (() => {
  'use strict';

  const _props = PropertiesService.getScriptProperties();

  const API = {
    BASE: 'https://api.line.me/v2/bot/richmenu',
    UPLOAD_BASE: 'https://api-data.line.me/v2/bot/richmenu',
    REPLY: 'https://api.line.me/v2/bot/message/reply',
    PUSH: 'https://api.line.me/v2/bot/message/push',
    DEFAULT: (richMenuId) => `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`
  };

  const ALIAS = {
    WELCOME: 'alias-welcome',
    TAB_1: 'alias-tab-1-profile',
    TAB_2: 'alias-tab-2-loan',
    TAB_3: 'alias-tab-3-news',
    TAB_4: 'alias-tab-4-documents',
    TAB_5: 'alias-tab-5-contact'
  };

  // Google Drive File IDs สำหรับภาพ Rich Menu แต่ละแท็บ
  const IMAGE_FILE_IDS = {
    // Welcome Menu (ค่า default — ใส่ File ID ของภาพ Welcome เมื่อมี, ว่าง = ไม่อัปโหลดภาพ)
    WELCOME: '',
    // Tab 1: ข้อมูลส่วนตัว - https://drive.google.com/file/d/17hJFYQ_363NgPVqdSkqJpXmbwjkGsDXy/view
    TAB_1: '17hJFYQ_363NgPVqdSkqJpXmbwjkGsDXy',
    // Tab 2: เงินกู้ & สวัสดิการ - https://drive.google.com/file/d/1REoevCRTD9VOOWLUbDbigM_amfJV1RqY/view
    TAB_2: '1REoevCRTD9VOOWLUbDbigM_amfJV1RqY',
    // Tab 3: ข่าวสารสหกรณ์ - https://drive.google.com/file/d/1ybW7O8YTI62pgsv9pjxGZMlI6xxp9L-0/view
    TAB_3: '1ybW7O8YTI62pgsv9pjxGZMlI6xxp9L-0',
    // Tab 4: เอกสาร & คู่มือ - https://drive.google.com/file/d/12Zus-cTm5zbDa5OE5ulPCHep-Vmn7PRp/view
    TAB_4: '12Zus-cTm5zbDa5OE5ulPCHep-Vmn7PRp',
    // Tab 5: ติดต่อเรา - https://drive.google.com/file/d/10po9Z-rzROkoMvJ9fblx7tV_0i4XF-71/view
    TAB_5: '10po9Z-rzROkoMvJ9fblx7tV_0i4XF-71'
  };

  const RICH_MENU_SIZE = {
    width: 2500,
    height: 1686
  };

  const SHEET = {
    // ใช้ DataDict เป็น SSOT แทนการกำหนดตรงนี้
    // DataDict.TABLES.MEMBER_MASTER.name = 't_member_mast'
  };

  function get() {
    return {
      CHANNEL_ACCESS_TOKEN: _props.getProperty('CHANNEL_ACCESS_TOKEN'),
      CHANNEL_SECRET: _props.getProperty('CHANNEL_SECRET'),
      WEBHOOK_SECRET: _props.getProperty('WEBHOOK_SECRET'),
      // ฐานข้อมูลของระบบ — 'sheets' (ค่า default) / 'firestore' (อนาคต, บทที่ 3.2.4)
      DB_TYPE: _props.getProperty('DB_TYPE') || 'sheets',
      // จำนวนวันก่อนหมดอายุที่ถือว่า "ใกล้หมด" — แจ้งเตือน + แนบคำเตือนในคำตอบ (การ์ด MT-11)
      EXPIRY_WARNING_DAYS: Number(_props.getProperty('EXPIRY_WARNING_DAYS') || 30)
      // IMAGE_FILE_IDS ถูกกำหนดไว้ใน Config.IMAGE_FILE_IDS โดยตรง
    };
  }

  function setup(values) {
    const defaults = {
      'CHANNEL_ACCESS_TOKEN': 'ใส่_TOKEN_ของคุณ_ที่นี่',
      'CHANNEL_SECRET': 'ใส่_CHANNEL_SECRET_ของคุณ_ที่นี่',
      'WEBHOOK_SECRET': 'ใส่_รหัสยาวสุ่ม_สำหรับ_Webhook_URL_ที่นี่'
    };
    _props.setProperties({ ...defaults, ...values });
    Logger.log('บันทึก config แล้ว — กรุณาเลือกฟังก์ชัน main แล้วกดรัน');
  }

  function validate() {
    const cfg = get();
    if (!cfg.CHANNEL_ACCESS_TOKEN || cfg.CHANNEL_ACCESS_TOKEN.includes('ใส่_TOKEN')) {
      throw new Error('ยังไม่ได้ตั้งค่า CHANNEL_ACCESS_TOKEN — กรุณาใส่ข้อมูลใน setupConfig() แล้วรันก่อน');
    }
    if (!cfg.CHANNEL_SECRET || cfg.CHANNEL_SECRET.includes('ใส่_CHANNEL_SECRET')) {
      throw new Error('ยังไม่ได้ตั้งค่า CHANNEL_SECRET — กรุณาใส่ข้อมูลใน Script Properties');
    }
    if (!cfg.WEBHOOK_SECRET || cfg.WEBHOOK_SECRET.includes('ใส่_รหัสยาวสุ่ม')) {
      throw new Error('ยังไม่ได้ตั้งค่า WEBHOOK_SECRET — กรุณาใส่ข้อมูลใน Script Properties');
    }
    return cfg;
  }

  return {
    API,
    ALIAS,
    IMAGE_FILE_IDS,
    RICH_MENU_SIZE,
    SHEET,
    get,
    setup,
    validate
  };
})();

/**
 * รันฟังก์ชันนี้ครั้งเดียวเพื่อบันทึกค่าลง Script Properties
 *
 * ⚠️ ความปลอดภัย: ห้ามใส่ token จริงในโค้ดนี้ (repo เป็น public)
 * ให้ใส่ค่าจริงผ่าน Script Properties โดยตรง:
 * Apps Script Editor → Project Settings → Script Properties
 * หรือแก้ไขตรงนี้ชั่วคราวเฉพาะเครื่อง (ห้าม commit)
 */
function setupConfig() {
  Config.setup({
    // 'CHANNEL_ACCESS_TOKEN': 'ใส่_TOKEN_จริง_ที่นี่_เฉพาะเครื่อง_ห้าม_commit',
    // 'CHANNEL_SECRET': 'ใส่_CHANNEL_SECRET_จริง_ที่นี่_เฉพาะเครื่อง_ห้าม_commit',
    // 'WEBHOOK_SECRET': 'ใส่_WEBHOOK_SECRET_จริง_ที่นี่_เฉพาะเครื่อง_ห้าม_commit'
    // IMAGE_FILE_IDS ถูกกำหนดไว้ใน Config.IMAGE_FILE_IDS โดยตรงแล้ว
  });
}
