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
   * ผูก Rich Menu ให้ผู้ใช้รายบุคคล (Per-User Rich Menu Gating — บทที่ 3.3.6)
   * POST /v2/bot/user/{userId}/richmenu/{richMenuId}
   * @param {string} userId - LINE userId
   * @param {string} richMenuId
   * @param {string} token
   * @returns {boolean}
   */
  function linkUser(userId, richMenuId, token) {
    const res = UrlFetchApp.fetch(`${API.BASE}/user/${userId}/richmenu/${richMenuId}`, {
      method: 'post',
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });
    const status = res.getResponseCode();
    Logger.log(`linkUser (${userId} -> ${richMenuId}): HTTP ${status} ${res.getContentText()}`);
    if (status !== 200) {
      throw new Error(`ผูก Rich Menu ไม่สำเร็จ: HTTP ${status} ${res.getContentText()}`);
    }
    return true;
  }

  /**
   * ยกเลิกการผูก Rich Menu รายบุคคล — กลับไปใช้ default (Welcome Menu)
   * DELETE /v2/bot/user/{userId}/richmenu
   * @param {string} userId - LINE userId
   * @param {string} token
   * @returns {boolean}
   */
  function unlinkUser(userId, token) {
    const res = UrlFetchApp.fetch(`${API.BASE}/user/${userId}/richmenu`, {
      method: 'delete',
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });
    const status = res.getResponseCode();
    Logger.log(`unlinkUser (${userId}): HTTP ${status} ${res.getContentText()}`);
    if (status !== 200) {
      throw new Error(`ยกเลิกการผูก Rich Menu ไม่สำเร็จ: HTTP ${status} ${res.getContentText()}`);
    }
    return true;
  }

  /**
   * ดึง richMenuId จาก alias
   * GET /v2/bot/richmenu/alias/{aliasId}
   * @param {string} aliasId
   * @param {string} token
   * @returns {string}
   */
  function getRichMenuIdByAlias(aliasId, token) {
    const res = UrlFetchApp.fetch(`${API.BASE}/alias/${aliasId}`, {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });
    const status = res.getResponseCode();
    const body = res.getContentText();
    if (status !== 200) {
      throw new Error(`ไม่พบ Rich Menu จาก alias ${aliasId}: HTTP ${status} ${body}`);
    }
    const json = JSON.parse(body);
    return json.richMenuId;
  }

  /**
   * ตรวจสอบว่า Rich Menu ปัจจุบันของผู้ใช้คืออะไร (ใช้ยืนยันหลัง link/unlink)
   * GET /v2/bot/user/{userId}/richmenu
   * @param {string} userId - LINE userId
   * @param {string} token
   * @returns {string|null} richMenuId หรือ null (ยังไม่เคยผูก)
   */
  function getUserRichMenu(userId, token) {
    const res = UrlFetchApp.fetch(`${API.BASE}/user/${userId}/richmenu`, {
      headers: { Authorization: `Bearer ${token}` },
      muteHttpExceptions: true
    });
    const status = res.getResponseCode();
    if (status === 404) return null; // ยังไม่เคยผูก — ใช้ default อยู่
    if (status !== 200) {
      throw new Error(`ตรวจสอบ Rich Menu ของผู้ใช้ไม่สำเร็จ: HTTP ${status} ${res.getContentText()}`);
    }
    const json = JSON.parse(res.getContentText());
    return json.richMenuId || null;
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
    checkStatus,
    linkUser,
    unlinkUser,
    getRichMenuIdByAlias,
    getUserRichMenu
  };
})();
