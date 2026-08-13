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
   * @param {Object} [opts] - { style, color, height, flex }
   * @returns {Object}
   */
  function button(label, action, opts) {
    const o = opts || {};
    const a = action || {};
    const b = { type: 'button' };
    if (o.style) b.style = o.style;
    if (o.color) b.color = o.color;
    if (o.height) b.height = o.height;
    if (o.flex !== undefined) b.flex = o.flex;
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
    inactive: 'ยังไม่เปิดใช้งาน',
    expiring: 'ใกล้หมดอายุ',
    expired: 'หมดอายุ',
    draft: 'ร่าง'
  };

  // ป้ายภาษาไทยของบทบาทสมาชิก
  const ROLE_LABELS = {
    member: 'สมาชิก',
    staff: 'เจ้าหน้าที่',
    admin: 'ผู้ดูแลระบบ'
  };

  /**
   * ตรวจว่าค่ามีอยู่จริง (ไม่ใช่ undefined / null / '')
   * @param {*} value
   * @returns {boolean}
   */
  function hasValue(value) {
    return value !== undefined && value !== null && value !== '';
  }

  /**
   * จัดรูปแบบเงิน (เรียก MemberDataService.formatMoney — เดิมไม่มีซ้ำ)
   * @param {*} value
   * @returns {string} เช่น '50,000.00 บาท'
   */
  function money(value) {
    return `${LineBot.MemberDataService.formatMoney(value)} บาท`;
  }

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

  /**
   * แถวปุ่มหลายปุ่ม (layout horizontal — ปุ่มแบ่งความกว้างเท่า ๆ กันด้วย flex:1)
   * @param {Array<Object>} buttons - [{ label, action, style, color }]
   * @param {Object} [opts] - { spacing, paddingAll }
   * @returns {Object}
   */
  function buttonRow(buttons, opts) {
    const o = opts || {};
    return {
      type: 'box',
      layout: 'horizontal',
      spacing: o.spacing || 'sm',
      paddingAll: o.paddingAll || FlexTheme().paddingLg,
      contents: (buttons || []).map(b => button(b.label, b.action, {
        style: b.style, color: b.color, height: 'sm', flex: 1
      }))
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

  // ระดับของ alertCard → ไอคอน + คีย์สีใน FlexTheme.statusColors (ไม่มี hex hardcode)
  const ALERT_LEVELS = {
    success: { icon: '✅', colorKey: 'active' },
    warning: { icon: '⚠️', colorKey: 'expiring' },
    error: { icon: '❌', colorKey: 'expired' }
  };

  /**
   * สร้าง Flex Card แจ้งเตือนตามระดับ (การ์ด MT-35):
   * success (เขียว ✅) / warning (เหลือง ⚠️) / error (แดง ❌) — สีจาก FlexTheme.statusColors
   * @param {Object} o - { level, title, message, footerData }
   * @returns {Object}
   */
  function alertCard(o) {
    const level = ALERT_LEVELS[o.level] || ALERT_LEVELS.success;
    const title = o.title || 'แจ้งเตือน';
    return {
      type: 'flex',
      altText: title,
      contents: bubbleFrame({
        header: header(`${level.icon} ${title}`.trim(), {
          backgroundColor: FlexTheme().statusColors[level.colorKey],
          align: 'center'
        }),
        body: bodyBox([
          text(o.message || '', { size: 'lg', wrap: true, color: FlexTheme().textPrimary, align: 'center' })
        ]),
        footer: footerButton('ตกลง', o.footerData || 'action=ack_menu')
      })
    };
  }

  /**
   * สร้าง Flex Card ยืนยันการกระทำ (การ์ด MT-35) — ปุ่ม [ยกเลิก] [ยืนยัน]
   * ใช้ก่อนการกระทำที่สำคัญ เช่น ต่ออายุสมาชิก (renew)
   * @param {Object} o - { title, message, info, okLabel, okData, cancelLabel, cancelData }
   * @returns {Object}
   */
  function confirmCard(o) {
    const title = o.title || 'ยืนยันการดำเนินการ';
    const body = [
      text(o.message || 'ยืนยันการดำเนินการนี้หรือไม่?', { size: 'lg', wrap: true, color: FlexTheme().textPrimary, align: 'center' })
    ];
    if (o.info) {
      body.push(infoBox([text(o.info, { size: 'sm', color: FlexTheme().textSecondary, wrap: true })]));
    }
    return {
      type: 'flex',
      altText: title,
      contents: bubbleFrame({
        header: header(`❓ ${title}`.trim(), { align: 'center' }),
        body: bodyBox(body),
        footer: buttonRow([
          { label: o.cancelLabel || 'ยกเลิก', action: { data: o.cancelData || 'action=cancel' }, style: 'secondary' },
          { label: o.okLabel || 'ยืนยัน', action: { data: o.okData || 'action=confirm' }, style: 'primary', color: FlexTheme().brandColor }
        ])
      })
    };
  }

  /**
   * กล่องคำเตือน (พื้นหลัง amber/แดง + ตัวอักษรขาว) — ใช้ท้ายการ์ดเมื่อมีคำเตือน
   * @param {string} message
   * @returns {Object}
   */
  function warningBox(message) {
    return infoBox([
      text(message, { size: 'sm', color: FlexTheme().white, wrap: true })
    ], { backgroundColor: FlexTheme().statusColors.expiring });
  }

  /**
   * สร้าง Flex Card เนื้อหาเมนูข้อมูล/เอกสาร/ติดต่อ (การ์ด MT-37 — แทน text ใน replyContentItem)
   * ข้อมูลจาก t_content (content_text) หรือ ReplyStore — header = ชื่อเมนูภาษาไทย (caption)
   * @param {Object} o - { title, text, updatedDt? }
   * @returns {Object}
   */
  function contentCard(o) {
    const c = o || {};
    const title = c.title || 'ข้อมูล';
    const body = [
      text(c.text || '', { size: 'md', wrap: true, color: FlexTheme().textPrimary })
    ];
    if (c.updatedDt) {
      body.push(separator('lg'));
      body.push(infoBox([labelValueRow('ปรับปรุงล่าสุด', c.updatedDt)]));
    }
    return {
      type: 'flex',
      altText: title,
      contents: bubbleFrame({
        header: header(`📄 ${title}`.trim(), { align: 'center' }),
        body: bodyBox(body),
        footer: footerButton('ตกลง', 'action=ack_menu')
      })
    };
  }

  /**
   * สร้าง Flex Card ประกาศ/ข่าวสาร (การ์ด MT-36 — แทน buildNoticeText)
   * ข้อมูลจาก t_notice: title + message + published_dt
   * @param {Object} notice - { title, message, published_dt }
   * @returns {Object}
   */
  function noticeCard(notice) {
    const n = notice || {};
    const body = [];
    if (n.title) {
      body.push(text(n.title, { weight: 'bold', size: 'lg', wrap: true, color: FlexTheme().textPrimary, align: 'center' }));
    }
    if (n.message) {
      body.push(text(n.message, { size: 'sm', wrap: true, color: FlexTheme().textSecondary, margin: 'md' }));
    }
    if (n.published_dt) {
      body.push(separator('lg'));
      body.push(infoBox([labelValueRow('ประกาศเมื่อ', n.published_dt)]));
    }
    return {
      type: 'flex',
      altText: `📢 ประกาศสหกรณ์${n.title ? ' — ' + n.title : ''}`,
      contents: bubbleFrame({
        header: header('📢 ประกาศสหกรณ์', { align: 'center' }),
        body: bodyBox(body),
        footer: footerButton('ตกลง', 'action=ack_menu')
      })
    };
  }

  /**
   * สร้าง Flex Card เตือนชำระหนี้รายบุคคล (การ์ด MT-36 — แทน buildLoanReminderText)
   * ข้อมูลจาก t_loan_acct + t_member_mast: ชื่อสมาชิก + สัญญา + ยอดคงค้าง + ครบกำหนด
   * @param {Object} loan - { loan_no, outstanding, due_dt }
   * @param {Object} member - { mem_title, mem_fname, mem_lname }
   * @param {number} daysLeft - จำนวนวันเหลือถึงกำหนด
   * @returns {Object}
   */
  function loanReminderCard(loan, member, daysLeft) {
    const l = loan || {};
    const name = [member && member.mem_title, member && member.mem_fname, member && member.mem_lname]
      .filter(Boolean).join(' ') || 'สมาชิก';

    const rows = [];
    if (l.loan_no) rows.push(labelValueRow('สัญญา', l.loan_no));
    if (hasValue(l.outstanding)) rows.push(labelValueRow('ยอดคงค้าง', money(l.outstanding)));
    if (l.due_dt) rows.push(labelValueRow('ครบกำหนด', `${l.due_dt} (อีก ${daysLeft} วัน)`));

    return {
      type: 'flex',
      altText: `💳 เตือนชำระหนี้ — คุณ${name}`,
      contents: bubbleFrame({
        header: header('💳 เตือนชำระหนี้', { align: 'center' }),
        body: bodyBox([
          text(`คุณ${name}`, { weight: 'bold', size: 'lg', wrap: true, color: FlexTheme().textPrimary, align: 'center' }),
          infoBox(rows),
          separator('lg'),
          text('กรุณาชำระภายในกำหนด เพื่อรักษาเครดิตการกู้ยืม — ติดต่อสหกรณ์หากมีข้อสงสัย', {
            size: 'xs', wrap: true, color: FlexTheme().textSecondary
          })
        ]),
        footer: footerButton('ตกลง', 'action=ack_menu')
      })
    };
  }

  /**
   * สร้าง Flex Card แสดงโปรไฟล์สมาชิก (การ์ด MT-34 — แทนข้อความ text)
   * ข้อมูลเหมือน buildProfileText: ชื่อ/รหัส/บทบาท/ตำแหน่ง(+คะแนน)/คะแนนสมาชิก/
   * คะแนนความดี/เงินกู้คงค้าง/เงินหุ้น/สถานะ/สิทธิ์ใช้งาน (+คำเตือนหมดอายุถ้ามี)
   * @param {Object} member - member object จาก API /api/member/profile
   * @param {Object} [opts] - { warning }
   * @returns {Object}
   */
  function profileCard(member, opts) {
    const o = opts || {};
    const name = [member.mem_title, member.mem_fname, member.mem_lname].filter(Boolean).join(' ') || '-';
    const position = `${member.mem_position || '-'}${member.mem_position_score ? ' (คะแนน ' + member.mem_position_score + ')' : ''}`;

    const rows = [
      labelValueRow('บทบาท', ROLE_LABELS[member.mem_role] || member.mem_role || '-'),
      labelValueRow('ตำแหน่ง', position),
      labelValueRow('คะแนนสมาชิก', member.mem_rank_score || '-')
    ];
    if (hasValue(member.mem_kk)) rows.push(labelValueRow('คะแนนความดี', member.mem_kk));
    if (hasValue(member.mem_bk)) rows.push(labelValueRow('เงินกู้คงค้าง', money(member.mem_bk)));
    if (hasValue(member.mem_bh)) rows.push(labelValueRow('เงินหุ้น', money(member.mem_bh)));
    if (member.mem_eff_dt && member.mem_exp_dt) {
      rows.push(labelValueRow('สิทธิ์ใช้งาน', `${member.mem_eff_dt} → ${member.mem_exp_dt}`));
    } else if (member.mem_eff_dt) {
      rows.push(labelValueRow('วันที่มีผล', member.mem_eff_dt));
    }

    const body = [
      text(name, { weight: 'bold', size: 'xl', wrap: true, color: FlexTheme().brandColor, align: 'center' }),
      text(`รหัสสมาชิก: ${member.mem_code || '-'}`, { size: 'sm', color: FlexTheme().textMuted, align: 'center', margin: 'md' }),
      {
        type: 'box',
        layout: 'vertical',
        alignItems: 'center',
        contents: [statusBadge(member.mem_status)],
        margin: 'md'
      },
      infoBox(rows)
    ];
    if (o.warning) body.push(warningBox(o.warning));

    return {
      type: 'flex',
      altText: `ข้อมูลส่วนตัว — ${name}`,
      contents: bubbleFrame({
        header: header('👤 ข้อมูลส่วนตัว', { align: 'center' }),
        body: bodyBox(body),
        footer: footerButton('ตกลง', 'action=ack_menu')
      })
    };
  }

  /**
   * สร้าง Flex Card แสดงข้อมูลการเงิน (การ์ด MT-34 — แทนข้อความ text)
   * รับข้อมูลจาก MemberDataService.buildFinanceCardData:
   *   { title, icon, memberCode, rows: [{label, value}], total: {label, value} | null,
   *     noData: { message } | null, warning, footerData }
   * @param {Object} o
   * @returns {Object}
   */
  function financeCard(o) {
    const body = [];
    if (o.memberCode) {
      body.push(text(`รหัสสมาชิก: ${o.memberCode}`, { size: 'sm', color: FlexTheme().textMuted, align: 'center', margin: 'md' }));
    }
    if (o.noData) {
      body.push(infoBox([
        text(o.noData.message || 'ไม่พบข้อมูล', { weight: 'bold', size: 'sm', wrap: true, color: FlexTheme().textPrimary }),
        text('— หากเป็นสมาชิก กรุณาติดต่อสหกรณ์เพื่อตรวจสอบข้อมูล', { size: 'xs', wrap: true, color: FlexTheme().textSecondary, margin: 'sm' })
      ]));
    } else {
      (o.rows || []).forEach(r => body.push(labelValueRow(String(r.label), String(r.value))));
      if (o.total) {
        body.push(separator('lg'));
        body.push(infoBox([labelValueRow(o.total.label, o.total.value)]));
      }
    }
    if (o.warning) body.push(warningBox(o.warning));

    return {
      type: 'flex',
      altText: o.title,
      contents: bubbleFrame({
        header: header(`${o.icon ? o.icon + ' ' : ''}${o.title}`.trim(), { align: 'center' }),
        body: bodyBox(body),
        footer: footerButton('ตกลง', o.footerData || 'action=ack_menu')
      })
    };
  }

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
    profileCard,
    financeCard,
    alertCard,
    confirmCard,
    noticeCard,
    loanReminderCard,
    contentCard,
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
    buttonRow,
    // Frame
    bubbleFrame
  };
})();
