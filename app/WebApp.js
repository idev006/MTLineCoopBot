/**
 * @fileoverview WebApp
 * Entry point: LINE webhook (POST) + API mount (GET/POST /api/*)
 *
 * เส้นทาง:
 * - POST /exec                    → LINE webhook (ตรวจ webhook_secret — ไม่เปลี่ยน)
 * - GET|POST /exec/api/<path>?api_key=... → API Layer (Api.ApiService) + ตรวจ API key
 *   (Apps Script ใช้ e.pathInfo เป็น path ต่อจาก /exec เช่น /exec/api/member/profile)
 */

/** JSON TextOutput (envelope) */
function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ตรวจว่า request เป็น API mount หรือไม่ (path ขึ้นต้นด้วย api/)
 * @param {Object} e
 * @returns {boolean}
 */
function isApiRequest(e) {
  return !!(e && e.pathInfo && String(e.pathInfo).trim().startsWith('api/'));
}

/**
 * ดึง API key ที่ client ส่งมา — จาก query (?api_key=) หรือ body (POST)
 * (Apps Script Web App อ่าน header ไม่ได้ — ใช้ query/body ตามแบบ webhook_secret)
 * @param {Object} e
 * @returns {string|null}
 */
function getProvidedApiKey(e) {
  if (e.parameter && e.parameter.api_key) return e.parameter.api_key;
  if (e.postData && e.postData.contents) {
    try {
      const body = JSON.parse(e.postData.contents);
      if (body.api_key) return body.api_key;
    } catch (parseErr) { /* ignore — handler จะตรวจ body อีกครั้ง */ }
  }
  return null;
}

/**
 * dispatch /api/* ผ่าน Api.ApiService (API mount — การ์ด MT-16/17/20)
 * - ตรวจ API key (ยกเว้น /api/health) ก่อน dispatch
 * - ctx.auth = { apiKey, lineUserId? } เตรียมไว้สำหรับ Auth per-channel (เฟส 3)
 * @param {Object} e
 * @param {string} method - GET | POST
 * @returns {TextOutput} JSON envelope { ok, data } | { ok, error }
 */
function dispatchApi(e, method) {
  try {
    const cfg = Config.get();
    // pathInfo เช่น "api/member/profile" → "/api/member/profile" (ตัด slash ท้าย)
    const path = '/' + String(e.pathInfo).trim().replace(/\/+$/, '');
    const apiKey = getProvidedApiKey(e);

    // API key check — /api/health เป็น public (ตรวจสถานะ) · ที่เหลือต้องมี key ถูกต้อง
    if (path !== '/api/health') {
      if (!cfg.API_KEY || cfg.API_KEY.includes('ใส่_API_KEY')) {
        return jsonOutput({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งค่า API_KEY ใน Script Properties' } });
      }
      if (apiKey !== cfg.API_KEY) {
        return jsonOutput({ ok: false, error: { code: 'UNAUTHORIZED', message: 'API key ไม่ถูกต้อง — ส่งผ่าน ?api_key= หรือใน body' } });
      }
    }

    // สร้าง ctx สำหรับ Api.ApiService (query/body/auth)
    const query = {};
    for (const k in (e.parameter || {})) {
      if (k === 'api_key') continue;
      query[k] = e.parameter[k];
    }
    const ctx = { query, auth: { apiKey } };
    if (e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        delete body.api_key; // ไม่ส่ง key ลง handler
        ctx.body = body;
      } catch (parseErr) {
        return jsonOutput({ ok: false, error: { code: 'VALIDATION', message: 'รูปแบบ JSON ไม่ถูกต้อง' } });
      }
    }

    Logger.log(`[API] ${method} ${path} (key: ${apiKey ? 'ok' : 'none'})`);
    const env = Api.ApiService.handleRequest(method, path, ctx);
    Logger.log(`[API] ${method} ${path} → ok=${env.ok}`);
    return jsonOutput(env);
  } catch (err) {
    Logger.log(`[API] mount error: ${err}`);
    return jsonOutput({ ok: false, error: { code: 'INTERNAL', message: 'เกิดข้อผิดพลาดภายในระบบ' } });
  }
}

/**
 * รับ GET request — เฉพาะ path /api/* (API mount)
 * @param {Object} e
 * @returns {TextOutput}
 */
function doGet(e) {
  Logger.log('=== doGet started ===');
  if (isApiRequest(e)) {
    return dispatchApi(e, 'GET');
  }
  // ไม่ใช่ API path — แจ้งให้ใช้ path ที่ถูกต้อง (webhook ของ LINE เป็น POST เท่านั้น)
  return jsonOutput({
    ok: false,
    error: { code: 'NOT_FOUND', message: 'ใช้ path /exec/api/... เพื่อเรียก API (LINE webhook เป็น POST เท่านั้น)' }
  });
}

/**
 * รับ POST request — /api/* = API mount · อื่น ๆ = LINE webhook (ไม่เปลี่ยน)
 * @param {Object} e
 * @returns {TextOutput}
 */
function doPost(e) {
  Logger.log('=== doPost started ===');
  Logger.log(`e type: ${typeof e}`);

  // API mount: path ขึ้นต้นด้วย api/ → dispatch ผ่าน Api.ApiService (ไม่แตะ webhook)
  if (isApiRequest(e)) {
    return dispatchApi(e, 'POST');
  }

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
