/**
 * @fileoverview LineBot.MessageService
 * จัดการการส่งข้อความตอบกลับผ่าน LINE Messaging API
 */

var LineBot = LineBot || {};

LineBot.MessageService = (() => {
  'use strict';

  const REPLY_URL = Config.API.REPLY;
  const PUSH_URL = Config.API.PUSH;

  /**
   * ส่งข้อความตอบกลับ
   * @param {string} replyToken
   * @param {string} text
   * @param {string} token
   */
  function reply(replyToken, text, token) {
    return send(replyToken, [{ type: 'text', text }], token);
  }

  /**
   * ส่ง Flex Message ตอบกลับ
   * @param {string} replyToken
   * @param {Object} flexMessage
   * @param {string} token
   */
  function replyFlex(replyToken, flexMessage, token) {
    return send(replyToken, [flexMessage], token);
  }

  /**
   * ส่ง messages ผ่าน reply API
   * @param {string} replyToken
   * @param {Array<Object>} messages
   * @param {string} token
   */
  function send(replyToken, messages, token) {
    const res = UrlFetchApp.fetch(REPLY_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${token}` },
      payload: JSON.stringify({ replyToken, messages }),
      muteHttpExceptions: true
    });
    const statusCode = res.getResponseCode();
    const body = res.getContentText();
    if (statusCode !== 200) {
      Logger.log(`reply error: ${statusCode} ${body}`);
    } else {
      Logger.log(`reply success: ${statusCode} ${body}`);
    }
    return {
      ok: statusCode === 200,
      statusCode,
      body
    };
  }

  /**
   * ส่งข้อความ Push ถึงผู้ใช้ (ใช้ใน scheduled trigger — การ์ด MT-11)
   * ต่างจาก reply (ต้องมี replyToken ภายใน 60 วินาที) — push ใช้ userId ได้ทุกเวลา
   * @param {string} to - LINE userId
   * @param {string} text
   * @param {string} token
   * @returns {{ok: boolean, statusCode: number, body: string}}
   */
  function push(to, text, token) {
    if (!to) return { ok: false, statusCode: 0, body: 'missing userId' };
    const res = UrlFetchApp.fetch(PUSH_URL, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${token}` },
      payload: JSON.stringify({ to, messages: [{ type: 'text', text }] }),
      muteHttpExceptions: true
    });
    const statusCode = res.getResponseCode();
    const body = res.getContentText();
    if (statusCode !== 200) {
      Logger.log(`push error: ${statusCode} ${body}`);
    } else {
      Logger.log(`push success: ${statusCode} ${body}`);
    }
    return { ok: statusCode === 200, statusCode, body };
  }

  return {
    reply,
    replyFlex,
    send,
    push
  };
})();
