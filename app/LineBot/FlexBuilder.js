/**
 * @fileoverview LineBot.FlexBuilder
 * Flex Component Library + ตัวสร้าง Flex Message สำหรับตอบกลับ — การ์ด MT-33
 *
 * ชั้นของ library (มาตรฐานเดียวกัน ไม่ duplicate code):
 *   0. FlexTheme     — design tokens SSOT (สี/ขนาด/รัศมี) — ไฟล์ FlexTheme.js
 *   1. Atoms         — text / button / separator / labelValueRow / statusBadge
 *   2. Molecules     — header / bodyBox / infoBox / footerButton
 *   3. Frame         — bubbleFrame (ประกอบ header + body + footer เป็น bubble)
 *   4. Templates     — menuClicked / welcomeMember / messageBox (ใช้ component ข้างบน)
 *
 * กฎ: ห้าม hardcode สี hex ในไฟล์นี้ — อ่านจาก LineBot.FlexTheme เท่านั้น
 * (กันด้วย CI: scan ไฟล์ FlexBuilder.js ไม่ให้มี hex color)
 */

var LineBot = LineBot || {};

LineBot.FlexBuilder = (() => {
  'use strict';

  const FlexTheme = () => LineBot.FlexTheme;

  // ══════════════════════════════════════════════════════════════
  // ชั้น 1: Atoms — 1 ฟังก์ชัน = 1 องค์ประกอบ LINE
  // ══════════════════════════════════════════════════════════════

  /**
   * สร้าง text component
   * @param {string} str
   * @param {Object} [opts] - { weight, size, color, wrap, align, margin, flex, decoration }
   * @returns {Object}
   */
  function text(str, opts) {
    const o = opts || {};
    const t = { type: 'text', text: String(str) };
    if (o.weight) t.weight = o.weight;
    if (o.size) t.size = o.size;
    if (o.color) t.color = o.color;
    if (o.wrap) t.wrap = true;
    if (o.align) t.align = o.align;
    if (o.margin) t.margin = o.margin;
    if (o.flex !== undefined) t.flex = o.flex;
    if (o.decoration) t.decoration = o.decoration;
    return t;
  }

  /**
   * สร้าง button component (default: postback action)
   * @param {string} label
   * @param {Object} [action] - { type, data, uri, datetime } (type default 'postback')
   * @param {Object} [opts] - { style, color }
   * @returns {Object}
   */
  function button(label, action, opts) {
    const o = opts || {};
    const a = action || {};
    const b = { type: 'button' };
    if (o.style) b.style = o.style;
    if (o.color) b.color = o.color;
    const act = { type: a.type || 'postback', label: label };
    if (a.data) act.data = a.data;
    if (a.uri) act.uri = a.uri;
    if (a.datetime) act.datetime = a.datetime;
    b.action = act;
    return b;
  }

  /**
   * สร้าง separator (เส้นคั่น)
   * @param {string} [margin='lg']
   * @returns {Object}
   */
  function separator(margin) {
    return { type: 'separator', margin: margin || 'lg' };
  }

  /**
   * สร้างแถว "label : value" (layout baseline — ป้ายซ้าย ค่ายืดขวา)
   * @param {string} label
   * @param {*} value
   * @returns {Object}
   */
  function labelValueRow(label, value) {
    return {
      type: 'box',
      layout: 'baseline',
      contents: [
        text(label, { size: 'sm', color: FlexTheme().textSecondary, flex: 1, wrap: true }),
        text(String(value), { size: 'sm', color: FlexTheme().textPrimary, align: 'end', flex: 2, wrap: true })
      ],
      margin: 'sm'
    };
  }

  // ป้ายภาษาไทยของสถานะ (เนื้อหา — สีอ่านจาก FlexTheme.statusColors)
  const STATUS_LABELS = {
    active: 'ใช้งานอยู่',
    paid: 'ชำระแล้ว',
    sent: 'ส่งแล้ว',
    expiring: 'ใกล้หมดอายุ',
    expired: 'หมดอายุ',
    draft: 'ร่าง'
  };

  /**
   * สร้าง badge แสดงสถานะ (พื้นหลังตามสีสถานะใน FlexTheme)
   * @param {string} status - key ใน FlexTheme.statusColors (หรืออะไรก็ได้ → สีเทา default)
   * @param {Object} [opts] - { label, flex }
   * @returns {Object}
   */
  function statusBadge(status, opts) {
    const o = opts || {};
    const key = status || '';
    return {
      type: 'box',
      layout: 'vertical',
      contents: [
        text(o.label || STATUS_LABELS[key] || key || '-', {
          size: 'xs', weight: 'bold', color: FlexTheme().white, align: 'center'
        })
      ],
      backgroundColor: FlexTheme().statusColors[key] || FlexTheme().textSecondary,
      cornerRadius: 'xl',
      paddingAll: 'xs',
      ...(o.flex !== undefined ? { flex: o.flex } : {})
    };
  }

  // ══════════════════════════════════════════════════════════════
  // ชั้น 2: Molecules — กล่องประกอบ
  // ══════════════════════════════════════════════════════════════

  /**
   * สร้าง header มาตรฐาน (พื้นหลังสีสหกรณ์ + ตัวอักษรขาว bold)
   * @param {string} title
   * @param {Object} [opts] - { textSize, textColor, backgroundColor, align, paddingAll }
   * @returns {Object}
   */
  function header(title, opts) {
    const o = opts || {};
    const t = text(title, {
      weight: 'bold',
      size: o.textSize || 'lg',
      color: o.textColor || FlexTheme().white
    });
    if (o.align) t.align = o.align;
    return {
      type: 'box',
      layout: 'vertical',
      contents: [t],
      backgroundColor: o.backgroundColor || FlexTheme().brandColor,
      paddingAll: o.paddingAll || FlexTheme().paddingLg
    };
  }

  /**
   * สร้าง body มาตรฐาน (paddingAll lg + สีพื้นหลังให้เลือก)
   * @param {Array<Object>} contents
   * @param {Object} [opts] - { backgroundColor, paddingAll }
   * @returns {Object}
   */
  function bodyBox(contents, opts) {
    const o = opts || {};
    const b = {
      type: 'box',
      layout: 'vertical',
      contents: contents,
      paddingAll: o.paddingAll || FlexTheme().paddingLg
    };
    if (o.backgroundColor) b.backgroundColor = o.backgroundColor;
    return b;
  }

  /**
   * สร้างกล่องข้อมูล (พื้นหลังเขียวอ่อน + มุมโค้ง + ระยะห่าง)
   * @param {Array<Object>} rows - เนื้อหาด้านใน (text / labelValueRow / statusBadge ...)
   * @param {Object} [opts] - { backgroundColor, margin, paddingAll, cornerRadius }
   * @returns {Object}
   */
  function infoBox(rows, opts) {
    const o = opts || {};
    return {
      type: 'box',
      layout: 'vertical',
      contents: rows,
      margin: o.margin !== undefined ? o.margin : 'lg',
      paddingAll: o.paddingAll || FlexTheme().paddingMd,
      backgroundColor: o.backgroundColor || FlexTheme().boxBg,
      cornerRadius: o.cornerRadius || FlexTheme().radiusMd
    };
  }

  /**
   * สร้าง footer มาตรฐาน (ปุ่ม primary เดียว paddingAll lg)
   * @param {string} label
   * @param {string} data - postback data
   * @param {Object} [opts] - { color, paddingAll }
   * @returns {Object}
   */
  function footerButton(label, data, opts) {
    const o = opts || {};
    return {
      type: 'box',
      layout: 'vertical',
      contents: [
        button(label, { data }, { style: 'primary', color: o.color || FlexTheme().brandColor })
      ],
      paddingAll: o.paddingAll || FlexTheme().paddingLg
    };
  }

  // ══════════════════════════════════════════════════════════════
  // ชั้น 3: Frame — ประกอบ bubble
  // ══════════════════════════════════════════════════════════════

  /**
   * ประกอบ bubble จาก header/body/footer (ทุกส่วน optional)
   * @param {Object} parts - { header, body, footer, size }
   * @returns {Object}
   */
  function bubbleFrame(parts) {
    const o = parts || {};
    const bubble = { type: 'bubble', size: o.size || FlexTheme().bubbleSize };
    if (o.header) bubble.header = o.header;
    if (o.body) bubble.body = o.body;
    if (o.footer) bubble.footer = o.footer;
    return bubble;
  }

  // ══════════════════════════════════════════════════════════════
  // ชั้น 4: Templates — การ์ดสำเร็จรูปตาม use case
  // ══════════════════════════════════════════════════════════════

  /**
   * สร้าง Flex Bubble แสดงข้อความ "คุณเลือกเมนู {{menuCaption}}"
   * @param {string} menuCaption
   * @returns {Object}
   */
  function menuClicked(menuCaption) {
    return {
      type: 'flex',
      altText: `คุณเลือกเมนู ${menuCaption}`,
      contents: bubbleFrame({
        header: header('เมนูที่เลือก', { textSize: 'sm', paddingAll: FlexTheme().paddingMd }),
        body: bodyBox([
          text(`คุณเลือกเมนู ${menuCaption}`, { weight: 'bold', size: 'lg', wrap: true, color: FlexTheme().textPrimary }),
          text('ระบบกำลังดำเนินการตามคำขอของคุณ', { size: 'sm', color: FlexTheme().textSecondary, margin: 'md', wrap: true })
        ]),
        footer: footerButton('ตกลง', 'action=ack_menu')
      })
    };
  }

  /**
   * สร้าง Flex Bubble แสดงข้อความต้อนรับสมาชิกที่ activate สำเร็จ
   * @param {Object} member
   * @param {string} member.memTitle
   * @param {string} member.memFname
   * @param {string} member.memLname
   * @param {string} member.memCode
   * @param {Date} member.memEffDt
   * @param {Date} member.memExpDt
   * @returns {Object}
   */
  function welcomeMember(member) {
    const formatDate = (date) => {
      if (!date) return '-';
      const d = new Date(date);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    };

    const fullName = `${member.memTitle || ''}${member.memFname || ''} ${member.memLname || ''}`.trim();

    return {
      type: 'flex',
      altText: `ยินดีต้อนรับ ${fullName} คุณได้ activate เรียบร้อยแล้ว`,
      contents: bubbleFrame({
        header: header('🎉 ยินดีต้อนรับ', { align: 'center' }),
        body: bodyBox([
          text(fullName, { weight: 'bold', size: 'xl', wrap: true, color: FlexTheme().textPrimary, align: 'center' }),
          text(`รหัสสมาชิก: ${member.memCode || '-'}`, { size: 'sm', color: FlexTheme().textMuted, align: 'center', margin: 'md' }),
          separator('lg'),
          infoBox([
            text('✅ Activate สำเร็จ', { weight: 'bold', size: 'md', color: FlexTheme().brandColor, align: 'center' }),
            text(`วันที่ activate: ${formatDate(member.memEffDt)}`, { size: 'sm', color: FlexTheme().textSecondary, margin: 'sm' }),
            text(`วันหมดอายุ: ${formatDate(member.memExpDt)}`, { size: 'sm', color: FlexTheme().textSecondary })
          ])
        ]),
        footer: footerButton('เข้าสู่เมนูหลัก', 'action=show_main_menu')
      })
    };
  }

  /**
   * สร้าง Flex Message แบบ Message Box ทั่วไป
   * @param {Object} options
   * @param {string} options.title - หัวข้อใน header (required)
   * @param {string} options.message - ข้อความหลักใน body (required)
   * @param {string} [options.headerColor] - สีพื้นหลัง header (default: FlexTheme.brandColor)
   * @param {string} [options.headerTextColor] - สีตัวอักษร header (default: FlexTheme.white)
   * @param {string} [options.bodyColor] - สีพื้นหลัง body (default: FlexTheme.white)
   * @param {string} [options.bodyTextColor] - สีตัวอักษร body (default: FlexTheme.textPrimary)
   * @param {string} [options.boxColor] - สีกล่องข้อความใน body (default: FlexTheme.boxBg)
   * @param {string} [options.icon=''] - ไอคอนหน้าหัวข้อ (เช่น '🎉', '✅', '⚠️')
   * @param {Array<Object>} [options.extraContents] - เนื้อหาเพิ่มเติมใน body (array of flex components)
   * @param {Object} [options.footerButton] - ปุ่มใน footer { label, data, color }
   * @param {string} [options.size] - ขนาด bubble (default: FlexTheme.bubbleSize)
   * @returns {Object}
   */
  function messageBox(options) {
    const {
      title,
      message,
      headerColor = FlexTheme().brandColor,
      headerTextColor = FlexTheme().white,
      bodyColor = FlexTheme().white,
      bodyTextColor = FlexTheme().textPrimary,
      boxColor = FlexTheme().boxBg,
      icon = '',
      extraContents = [],
      footerButton: footerBtn = null,
      size = FlexTheme().bubbleSize
    } = options;

    const headerText = icon ? `${icon} ${title}` : title;

    const bodyContents = [
      text(message, { weight: 'bold', size: 'lg', wrap: true, color: bodyTextColor, align: 'center' })
    ];

    // เพิ่ม extra contents ถ้ามี
    if (extraContents.length > 0) {
      bodyContents.push(separator('lg'));
      bodyContents.push(infoBox(extraContents, { backgroundColor: boxColor }));
    }

    const bubble = bubbleFrame({
      size: size,
      header: header(headerText, { textColor: headerTextColor, backgroundColor: headerColor, align: 'center' }),
      body: bodyBox(bodyContents, { backgroundColor: bodyColor })
    });

    // เพิ่ม footer ถ้ามีปุ่ม
    if (footerBtn) {
      bubble.footer = footerButton(footerBtn.label, footerBtn.data, { color: footerBtn.color || headerColor });
    }

    return {
      type: 'flex',
      altText: title,
      contents: bubble
    };
  }

  return {
    // Templates
    menuClicked,
    welcomeMember,
    messageBox,
    // Atoms
    text,
    button,
    separator,
    labelValueRow,
    statusBadge,
    // Molecules
    header,
    bodyBox,
    infoBox,
    footerButton,
    // Frame
    bubbleFrame
  };
})();
