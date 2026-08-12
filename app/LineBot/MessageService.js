/**
 * @fileoverview LineBot.MessageService
 * จัดการการส่งข้อความตอบกลับผ่าน LINE Messaging API
 */

var LineBot = LineBot || {};

LineBot.MessageService = (() => {
  'use strict';

  const REPLY_URL = Config.API.REPLY;

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

  return {
    reply,
    replyFlex,
    send
  };
})();
