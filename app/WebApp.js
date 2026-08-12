/**
 * @fileoverview WebApp
 * Entry point สำหรับ webhook ของ LINE
 */

/**
 * รับ webhook POST request จาก LINE
 * @param {Object} e
 * @returns {TextOutput}
 */
function doPost(e) {
  Logger.log('=== doPost started ===');
  Logger.log(`e type: ${typeof e}`);

  let token = null;
  try {
    const cfg = Config.get();

    // ตรวจสอบความถูกต้องของ Webhook — Apps Script Web App อ่าน header (X-Line-Signature)
    // ไม่ได้ (issuetracker.google.com/issues/67764685) จึงใช้ webhook_secret ที่ผูกท้าย URL
    // เช่น https://script.google.com/macros/s/.../exec?webhook_secret=XXX
    // ฟังก์ชัน HMAC เต็มรูปแบบ: Util.verifyLineSignature (พร้อมใช้เมื่อมี proxy)
    if (!Util.verifyWebhookSecret(e, cfg.WEBHOOK_SECRET)) {
      Logger.log('doPost rejected: webhook_secret ไม่ถูกต้องหรือไม่พบ');
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    token = cfg.CHANNEL_ACCESS_TOKEN;
    Logger.log(`token loaded: ${token ? 'yes' : 'no'}`);
  } catch (cfgErr) {
    Logger.log(`Config.get error: ${cfgErr}`);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Config error: ' + String(cfgErr) }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    if (!e) {
      Logger.log('doPost error: e is undefined');
      throw new Error('ไม่พบข้อมูล POST body');
    }
    if (!e.postData) {
      Logger.log('doPost error: e.postData is undefined');
      throw new Error('ไม่พบข้อมูล POST body');
    }
    if (!e.postData.contents) {
      Logger.log('doPost error: e.postData.contents is undefined');
      throw new Error('ไม่พบข้อมูล POST body');
    }

    Logger.log(`raw body: ${e.postData.contents.substring(0, 500)}`);

    let body;
    try {
      body = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      Logger.log(`JSON parse error: ${parseErr}`);
      throw new Error('รูปแบบ JSON ไม่ถูกต้อง: ' + String(parseErr));
    }

    const events = body.events || [];
    Logger.log(`events count: ${events.length}`);

    events.forEach((event, index) => {
      Logger.log(`event[${index}] type: ${event.type}`);
      try {
        if (event.type === 'postback') {
          LineBot.EventHandler.handlePostback(event, token);
        } else if (event.type === 'message' && event.message && event.message.type === 'text') {
          LineBot.EventHandler.handleTextMessage(event, token);
        } else {
          Logger.log(`Unhandled event type: ${event.type}`);
        }
      } catch (eventErr) {
        Logger.log(`event[${index}] error: ${eventErr}`);
      }
    });

    Logger.log('=== doPost completed ===');
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log(`doPost error: ${err}`);
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
