/**
 * @fileoverview RichMenu.ApiService
 * จัดการการเรียก API ของ LINE Rich Menu
 */

var RichMenu = RichMenu || {};

RichMenu.ApiService = (() => {
  'use strict';

  const API = Config.API;

  /**
   * สร้าง Rich Menu ใหม่
   * @param {Object} payload
   * @param {string} token
   * @returns {string} richMenuId
   */
  function create(payload, token) {
    const res = UrlFetchApp.fetch(API.BASE, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${token}` },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const text = res.getContentText();
    Logger.log(`createRichMenu (${payload.name}): ${text}`);
    const json = JSON.parse(text);
    if (!json.richMenuId) {
      throw new Error(`สร้าง Rich Menu ไม่สำเร็จ: ${text}`);
    }
    return json.richMenuId;
  }

  /**
   * อัปโหลดภาพ Rich Menu จาก Google Drive
   * @param {string} richMenuId
   * @param {string} driveFileId
   * @param {string} token
   */
  function uploadImage(richMenuId, driveFileId, token) {
    try {
      const file = DriveApp.getFileById(driveFileId);
      const blob = file.getBlob();
      const res = UrlFetchApp.fetch(`${API.UPLOAD_BASE}/${richMenuId}/content`, {
        method: 'post',
        contentType: blob.getContentType(),
        headers: { Authorization: `Bearer ${token}` },
        payload: blob.getBytes(),
        muteHttpExceptions: true
      });
      Logger.log(`uploadRichMenuImage (${richMenuId}): ${res.getContentText()}`);
      if (res.getResponseCode() !== 200) {
        throw new Error(`อัปโหลดภาพไม่สำเร็จ: ${res.getContentText()}`);
      }
    } catch (e) {
      throw new Error(`ไม่พบไฟล์รูปภาพบน Drive หรือไม่มีสิทธิ์เข้าถึง: ${e}`);
    }
  }

  /**
   * สร้างหรืออัปเดต Alias
   * @param {string} aliasId
   * @param {string} richMenuId
   * @param {string} token
   */
  function upsertAlias(aliasId, richMenuId, token) {
    const res = UrlFetchApp.fetch(`${API.BASE}/alias`, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${token}` },
      payload: JSON.stringify({ richMenuAliasId: aliasId, richMenuId }),
      muteHttpExceptions: true
    });
    Logger.log(`upsertRichMenuAlias (${aliasId}): ${res.getContentText()}`);
    if (res.getResponseCode() !== 200) {
      throw new Error(`สร้าง Alias ไม่สำเร็จ (อาจจะมีอยู่แล้วหรือIDผิด): ${res.getContentText()}`);
    }
  }

  /**
   * ตั้งค่า Rich Menu เริ่มต้น
   * @param {string} richMenuId
   * @param {string} token
   */
  function setDefault(richMenuId, token) {
    const res = UrlFetchApp.fetch(API.DEFAULT(richMenuId), {
      method: 'post',
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });
    Logger.log(`setDefaultRichMenu: ${res.getContentText()}`);
  }

  /**
   * ลบ Alias ทั้งหมด
   * @param {string} token
   */
  function deleteAllAliases(token) {
    try {
      const res = UrlFetchApp.fetch(`${API.BASE}/alias/list`, {
        headers: { Authorization: `Bearer ${token}` },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() !== 200) return;
      const list = JSON.parse(res.getContentText());
      (list.aliases || []).forEach(al => {
        UrlFetchApp.fetch(`${API.BASE}/alias/${al.richMenuAliasId}`, {
          method: 'delete',
          headers: { Authorization: `Bearer ${token}` },
          muteHttpExceptions: true
        });
      });
      Logger.log('ลบ Alias เก่าทั้งหมดแล้ว');
    } catch (e) {
      Logger.log(`Error deleting aliases: ${e}`);
    }
  }

  /**
   * ลบ Rich Menu ทั้งหมด
   * @param {string} token
   */
  function deleteAllMenus(token) {
    try {
      const res = UrlFetchApp.fetch(`${API.BASE}/list`, {
        headers: { Authorization: `Bearer ${token}` },
        muteHttpExceptions: true
      });
      if (res.getResponseCode() !== 200) return;
      const list = JSON.parse(res.getContentText());
      (list.richmenus || []).forEach(rm => {
        UrlFetchApp.fetch(`${API.BASE}/${rm.richMenuId}`, {
          method: 'delete',
          headers: { Authorization: `Bearer ${token}` },
          muteHttpExceptions: true
        });
      });
      Logger.log('ลบ Rich Menu เก่าทั้งหมดแล้ว');
    } catch (e) {
      Logger.log(`Error deleting rich menus: ${e}`);
    }
  }

  /**
   * ลบ Rich Menu และ Alias ทั้งหมด
   * @param {string} token
   */
  function deleteAll(token) {
    deleteAllAliases(token);
    deleteAllMenus(token);
  }

  /**
   * ตรวจสอบสถานะ Rich Menu และ Alias ทั้งหมด
   * @param {string} token
   * @returns {Object}
   */
  function checkStatus(token) {
    const result = {
      richmenus: [],
      aliases: [],
      defaultRichMenuId: null,
      errors: []
    };

    try {
      const menuRes = UrlFetchApp.fetch(`${API.BASE}/list`, {
        headers: { Authorization: `Bearer ${token}` },
        muteHttpExceptions: true
      });
      if (menuRes.getResponseCode() === 200) {
        const menuJson = JSON.parse(menuRes.getContentText());
        result.richmenus = menuJson.richmenus || [];
      } else {
        result.errors.push(`richmenu/list: ${menuRes.getResponseCode()} ${menuRes.getContentText()}`);
      }
    } catch (e) {
      result.errors.push(`richmenu/list error: ${e}`);
    }

    try {
      const aliasRes = UrlFetchApp.fetch(`${API.BASE}/alias/list`, {
        headers: { Authorization: `Bearer ${token}` },
        muteHttpExceptions: true
      });
      if (aliasRes.getResponseCode() === 200) {
        const aliasJson = JSON.parse(aliasRes.getContentText());
        result.aliases = aliasJson.aliases || [];
      } else {
        result.errors.push(`alias/list: ${aliasRes.getResponseCode()} ${aliasRes.getContentText()}`);
      }
    } catch (e) {
      result.errors.push(`alias/list error: ${e}`);
    }

    try {
      const defaultRes = UrlFetchApp.fetch('https://api.line.me/v2/bot/user/all/richmenu', {
        headers: { Authorization: `Bearer ${token}` },
        muteHttpExceptions: true
      });
      if (defaultRes.getResponseCode() === 200) {
        const defaultJson = JSON.parse(defaultRes.getContentText());
        result.defaultRichMenuId = defaultJson.richMenuId || null;
      } else {
        result.errors.push(`default: ${defaultRes.getResponseCode()} ${defaultRes.getContentText()}`);
      }
    } catch (e) {
      result.errors.push(`default error: ${e}`);
    }

    return result;
  }

  return {
    create,
    uploadImage,
    upsertAlias,
    setDefault,
    deleteAll,
    checkStatus
  };
})();
