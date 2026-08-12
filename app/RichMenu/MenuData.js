/**
 * @fileoverview RichMenu.MenuData
 * เก็บข้อมูลโครงสร้าง Rich Menu ทั้ง 5 แท็บ แยกตาม namespace เพื่อให้ขยายได้ง่าย
 */

var RichMenu = RichMenu || {};

RichMenu.MenuData = RichMenu.MenuData || {};

(function attachMenuData() {
  'use strict';

  Logger.log('MenuData IIFE executing');

  const SIZE = Config.RICH_MENU_SIZE;
  const ALIAS = Config.ALIAS;

  /**
   * สร้าง action แบบ postback
   * @param {string} item
   * @param {string} displayText
   * @returns {Object}
   */
  function postback(item, displayText) {
    return {
      type: 'postback',
      label: item,
      data: `action=menu_item&item=${item}`,
      displayText
    };
  }

  /**
   * สร้าง action แบบ URI (เปิดลิงก์)
   * @param {string} label
   * @param {string} uri
   * @returns {Object}
   */
  function uriAction(label, uri) {
    return {
      type: 'uri',
      label: label,
      uri: uri
    };
  }

  /**
   * สร้าง action สำหรับสลับแท็บ
   * @param {string} aliasId
   * @param {string} to
   * @returns {Object}
   */
  function switchTab(aliasId, to) {
    return {
      type: 'richmenuswitch',
      richMenuAliasId: aliasId,
      data: `action=switch_tab&to=${to}`
    };
  }

  /**
   * สร้าง action สำหรับอยู่แท็บเดิม
   * @param {string} tab
   * @returns {Object}
   */
  function stayTab(tab) {
    return {
      type: 'postback',
      data: `action=stay_tab&tab=${tab}`
    };
  }

  /**
   * คำนวณ bounds จากพิกัด polygon (หา x, y, width, height)
   * @param {Array} coords - Array of {x, y} coordinates
   * @returns {Object} {x, y, width, height}
   */
  function calcBounds(coords) {
    const xs = coords.map(c => c.x);
    const ys = coords.map(c => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  // =====================================================
  // พิกัดแท็บหลัก (5 แท็บ)
  // =====================================================
  
  // Tab 1: ข้อมูลส่วนตัว
  const TAB_1_COORDS = [{"x": 82, "y": 97}, {"x": 494, "y": 91}, {"x": 491, "y": 398}, {"x": 76, "y": 398}];
  // Tab 2: เงินกู้ & สวัสดิการ
  const TAB_2_COORDS = [{"x": 552, "y": 81}, {"x": 983, "y": 87}, {"x": 983, "y": 408}, {"x": 536, "y": 385}];
  // Tab 3: ข่าวสารสหกรณ์
  const TAB_3_COORDS = [{"x": 1044, "y": 94}, {"x": 1478, "y": 81}, {"x": 1472, "y": 415}, {"x": 1061, "y": 398}, {"x": 1044, "y": 87}];
  // Tab 4: เอกสาร & คู่มือ
  const TAB_4_COORDS = [{"x": 1537, "y": 110}, {"x": 1958, "y": 87}, {"x": 1954, "y": 392}, {"x": 1540, "y": 395}];
  // Tab 5: ติดต่อเรา
  const TAB_5_COORDS = [{"x": 2026, "y": 100}, {"x": 2440, "y": 107}, {"x": 2421, "y": 418}, {"x": 2029, "y": 398}, {"x": 2019, "y": 87}];

  // =====================================================
  // พิกัดเมนูย่อยในแต่ละแท็บ
  // =====================================================

  // Tab 1: ข้อมูลส่วนตัว - 6 เมนู
  const TAB_1_MENUS = [
    { coords: [{"x": 170, "y": 557}, {"x": 1200, "y": 560}, {"x": 1164, "y": 829}, {"x": 131, "y": 819}, {"x": 160, "y": 531}], action: postback('saving_acct', 'บัญชีเงินฝาก') },
    { coords: [{"x": 1336, "y": 567}, {"x": 2317, "y": 570}, {"x": 2314, "y": 823}, {"x": 1323, "y": 816}, {"x": 1329, "y": 573}], action: postback('chk_balance', 'เช็คยอดเงิน') },
    { coords: [{"x": 180, "y": 929}, {"x": 1193, "y": 926}, {"x": 1171, "y": 1189}, {"x": 147, "y": 1169}], action: postback('dividends', 'เงินปันผล') },
    { coords: [{"x": 1333, "y": 939}, {"x": 2343, "y": 939}, {"x": 2330, "y": 1182}, {"x": 1316, "y": 1185}], action: postback('share_capital', 'ทุนเรือนหุ้น') },
    { coords: [{"x": 160, "y": 1292}, {"x": 1190, "y": 1295}, {"x": 1167, "y": 1571}, {"x": 134, "y": 1564}], action: postback('profile', 'ข้อมูลส่วนตัว') },
    { coords: [{"x": 1323, "y": 1299}, {"x": 2343, "y": 1305}, {"x": 2330, "y": 1558}, {"x": 1329, "y": 1555}], action: postback('chg_password', 'เปลี่ยนรหัสผ่าน') }
  ];

  // Tab 2: เงินกู้ & สวัสดิการ - 6 เมนู
  const TAB_2_MENUS = [
    { coords: [{"x": 160, "y": 547}, {"x": 1184, "y": 541}, {"x": 1151, "y": 816}, {"x": 144, "y": 813}, {"x": 154, "y": 551}], action: postback('loan_apply', 'ยื่นคำขอกู้') },
    { coords: [{"x": 1329, "y": 551}, {"x": 2356, "y": 554}, {"x": 2346, "y": 826}, {"x": 1290, "y": 826}, {"x": 1336, "y": 554}], action: postback('loan_balance', 'ยอดเงินกู้คงเหลือ') },
    { coords: [{"x": 163, "y": 936}, {"x": 1180, "y": 942}, {"x": 1138, "y": 1195}, {"x": 167, "y": 1189}, {"x": 157, "y": 946}], action: uriAction('loan_calc', 'https://idev006.github.io/MTP6LineCoopBot/loan_calculator.html') },
    { coords: [{"x": 1320, "y": 949}, {"x": 2359, "y": 939}, {"x": 2356, "y": 1176}, {"x": 1313, "y": 1189}], action: postback('calc_install', 'คำนวณเงินผ่อนชำระ') },
    { coords: [{"x": 154, "y": 1302}, {"x": 1190, "y": 1315}, {"x": 1161, "y": 1564}, {"x": 141, "y": 1558}, {"x": 160, "y": 1312}], action: postback('welfare', 'สวัสดิการสมาชิก') },
    { coords: [{"x": 1346, "y": 1289}, {"x": 2356, "y": 1321}, {"x": 2346, "y": 1551}, {"x": 1323, "y": 1548}], action: postback('emergency', 'กองทุนฉุกเฉิน') }
  ];

  // Tab 3: ข่าวสารสหกรณ์ - 5 เมนู
  const TAB_3_MENUS = [
    { coords: [{"x": 167, "y": 557}, {"x": 1171, "y": 560}, {"x": 1145, "y": 819}, {"x": 144, "y": 823}, {"x": 167, "y": 538}], action: postback('news_pr', 'ข่าวประชาสัมพันธ์') },
    { coords: [{"x": 1316, "y": 580}, {"x": 2353, "y": 570}, {"x": 2330, "y": 829}, {"x": 1290, "y": 813}, {"x": 1320, "y": 567}], action: postback('activities', 'ข่าวกิจกรรม') },
    { coords: [{"x": 170, "y": 939}, {"x": 1180, "y": 965}, {"x": 1164, "y": 1198}, {"x": 134, "y": 1182}, {"x": 170, "y": 946}], action: postback('announce', 'ประกาศสหกรณ์') },
    { coords: [{"x": 1326, "y": 920}, {"x": 2359, "y": 933}, {"x": 2327, "y": 1189}, {"x": 1310, "y": 1189}, {"x": 1326, "y": 900}], action: postback('about_coop', 'เกี่ยวกับสหกรณ์') },
    { coords: [{"x": 183, "y": 1273}, {"x": 1216, "y": 1299}, {"x": 1171, "y": 1564}, {"x": 150, "y": 1555}, {"x": 173, "y": 1276}], action: postback('perf_report', 'ผลการดำเนินงาน') }
  ];

  // Tab 4: เอกสาร & คู่มือ - 4 เมนู (อัปเดตพิกัดใหม่)
  const TAB_4_MENUS = [
    { coords: [{"x": 154, "y": 580}, {"x": 1193, "y": 596}, {"x": 1158, "y": 1017}, {"x": 118, "y": 991}, {"x": 154, "y": 567}], action: postback('manual', 'คู่มือสมาชิก') },
    { coords: [{"x": 1323, "y": 612}, {"x": 2346, "y": 606}, {"x": 2343, "y": 994}, {"x": 1281, "y": 981}], action: postback('dl_forms', 'ดาวน์โหลดแบบฟอร์ม') },
    { coords: [{"x": 150, "y": 1130}, {"x": 1206, "y": 1127}, {"x": 1164, "y": 1519}, {"x": 150, "y": 1499}], action: postback('rules', 'ระเบียบและข้อบังคับ') },
    { coords: [{"x": 1339, "y": 1117}, {"x": 2366, "y": 1130}, {"x": 2353, "y": 1496}, {"x": 1284, "y": 1509}, {"x": 1346, "y": 1127}], action: postback('annual_report', 'รายงานประจำปี') }
  ];

  // Tab 5: ติดต่อเรา - 5 เมนู (อัปเดตชื่อเมนูใหม่)
  const TAB_5_MENUS = [
    { coords: [{"x": 167, "y": 573}, {"x": 1184, "y": 573}, {"x": 1174, "y": 826}, {"x": 154, "y": 823}, {"x": 173, "y": 544}], action: postback('contact_coop', 'ติดต่อสหกรณ์') },
    { coords: [{"x": 1313, "y": 567}, {"x": 2353, "y": 570}, {"x": 2333, "y": 819}, {"x": 1297, "y": 823}], action: postback('contact_staff', 'ติดต่อเจ้าหน้าที่') },
    { coords: [{"x": 173, "y": 920}, {"x": 1197, "y": 926}, {"x": 1184, "y": 1208}, {"x": 154, "y": 1192}, {"x": 176, "y": 907}], action: postback('office_loc', 'ที่ตั้งสำนักงาน') },
    { coords: [{"x": 1333, "y": 929}, {"x": 2340, "y": 946}, {"x": 2349, "y": 1189}, {"x": 1310, "y": 1195}], action: postback('faq', 'คำถามที่พบบ่อย') },
    { coords: [{"x": 180, "y": 1302}, {"x": 2343, "y": 1305}, {"x": 2301, "y": 1574}, {"x": 144, "y": 1561}], action: postback('feedback', 'แจ้งปัญหา/ร้องเรียน') }
  ];

  /**
   * สร้าง areas สำหรับแท็บนำทาง (5 แท็บ)
   * @param {number} activeTab - แท็บที่ active (1-5)
   * @returns {Array}
   */
  function buildTabAreas(activeTab) {
    const tabs = [
      { coords: TAB_1_COORDS, alias: ALIAS.TAB_1, to: 'tab_1' },
      { coords: TAB_2_COORDS, alias: ALIAS.TAB_2, to: 'tab_2' },
      { coords: TAB_3_COORDS, alias: ALIAS.TAB_3, to: 'tab_3' },
      { coords: TAB_4_COORDS, alias: ALIAS.TAB_4, to: 'tab_4' },
      { coords: TAB_5_COORDS, alias: ALIAS.TAB_5, to: 'tab_5' }
    ];

    return tabs.map((tab, index) => {
      const tabNum = index + 1;
      const action = tabNum === activeTab 
        ? stayTab(`tab_${tabNum}`) 
        : switchTab(tab.alias, tab.to);
      return {
        bounds: calcBounds(tab.coords),
        action: action
      };
    });
  }

  /**
   * สร้าง areas สำหรับเมนูย่อย
   * @param {Array} menus - Array of {coords, action}
   * @returns {Array}
   */
  function buildMenuAreas(menus) {
    return menus.map(menu => ({
      bounds: calcBounds(menu.coords),
      action: menu.action
    }));
  }

  // =====================================================
  // Build functions สำหรับแต่ละแท็บ
  // =====================================================

  function buildTab1() {
    return {
      size: { ...SIZE },
      selected: true,
      name: 'RichMenu-Coop-Tab1-Profile',
      chatBarText: 'เมนู',
      areas: [
        ...buildTabAreas(1),
        ...buildMenuAreas(TAB_1_MENUS)
      ]
    };
  }

  function buildTab2() {
    return {
      size: { ...SIZE },
      selected: false,
      name: 'RichMenu-Coop-Tab2-Loan',
      chatBarText: 'เมนู',
      areas: [
        ...buildTabAreas(2),
        ...buildMenuAreas(TAB_2_MENUS)
      ]
    };
  }

  function buildTab3() {
    return {
      size: { ...SIZE },
      selected: false,
      name: 'RichMenu-Coop-Tab3-News',
      chatBarText: 'เมนู',
      areas: [
        ...buildTabAreas(3),
        ...buildMenuAreas(TAB_3_MENUS)
      ]
    };
  }

  function buildTab4() {
    return {
      size: { ...SIZE },
      selected: false,
      name: 'RichMenu-Coop-Tab4-Documents',
      chatBarText: 'เมนู',
      areas: [
        ...buildTabAreas(4),
        ...buildMenuAreas(TAB_4_MENUS)
      ]
    };
  }

  function buildTab5() {
    return {
      size: { ...SIZE },
      selected: false,
      name: 'RichMenu-Coop-Tab5-Contact',
      chatBarText: 'เมนู',
      areas: [
        ...buildTabAreas(5),
        ...buildMenuAreas(TAB_5_MENUS)
      ]
    };
  }

  // =====================================================
  // Welcome Menu (ค่า default — สำหรับผู้ที่ยังไม่ Activate / หมดอายุ)
  // อ้างอิง: บทที่ 3.3.6 Per-User Rich Menu Gating
  // หมายเหตุ: item id ของ welcome (welcome_*) ไม่นับรวมใน listItemIds()
  // เพราะเป็นเมนูสาธารณะ ไม่ใช่เมนูสมาชิก (สัญญา Item ID ครอบคลุมเมนูสมาชิก)
  // =====================================================

  const WELCOME_MENUS = [
    { coords: [{"x": 160, "y": 500}, {"x": 1200, "y": 505}, {"x": 1170, "y": 780}, {"x": 150, "y": 780}], action: postback('welcome_activate', 'เปิดใช้งานสมาชิก') },
    { coords: [{"x": 1330, "y": 500}, {"x": 2360, "y": 505}, {"x": 2350, "y": 780}, {"x": 1320, "y": 780}], action: postback('welcome_howto', 'วิธีใช้งาน') },
    { coords: [{"x": 160, "y": 900}, {"x": 1200, "y": 905}, {"x": 1170, "y": 1180}, {"x": 150, "y": 1180}], action: postback('welcome_contact', 'ติดต่อสหกรณ์') },
    { coords: [{"x": 1330, "y": 900}, {"x": 2360, "y": 905}, {"x": 2350, "y": 1180}, {"x": 1320, "y": 1180}], action: postback('welcome_news', 'ข่าวสาร/ประกาศ') }
  ];

  /**
   * สร้าง Welcome Menu — ใช้เป็น rich menu default สำหรับผู้ที่ยังไม่ Activate
   * @returns {Object} payload rich menu
   */
  function buildWelcomeTab() {
    return {
      size: { ...SIZE },
      selected: true,
      name: 'RichMenu-Coop-Welcome',
      chatBarText: 'เมนูต้อนรับ',
      areas: buildMenuAreas(WELCOME_MENUS)
    };
  }

  /**
   * รวบรวม item id ทั้งหมดของเมนูย่อย (เฉพาะ action ประเภท postback ที่มี item=)
   * ใช้ตรวจสัญญา Item ID กับ ReplyStore.CAPTIONS (ดู app/Test.js)
   * @returns {Array<string>}
   */
  function listItemIds() {
    const allMenus = [].concat(TAB_1_MENUS, TAB_2_MENUS, TAB_3_MENUS, TAB_4_MENUS, TAB_5_MENUS);
    const ids = [];
    allMenus.forEach(menu => {
      const action = menu.action;
      const data = action && action.data ? String(action.data) : '';
      const m = data.match(/item=([^&]+)/);
      if (m) ids.push(m[1]);
    });
    return ids;
  }

  // Export functions
  RichMenu.MenuData.buildTab1 = buildTab1;
  RichMenu.MenuData.buildTab2 = buildTab2;
  RichMenu.MenuData.buildTab3 = buildTab3;
  RichMenu.MenuData.buildTab4 = buildTab4;
  RichMenu.MenuData.buildTab5 = buildTab5;
  RichMenu.MenuData.buildWelcomeTab = buildWelcomeTab;
  RichMenu.MenuData.listItemIds = listItemIds;
  
  Logger.log('MenuData functions attached');
})();
