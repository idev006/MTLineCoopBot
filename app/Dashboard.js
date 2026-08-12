/**
 * @fileoverview Dashboard.js
 * สร้างโครงสร้าง Dashboard (Google Sheets) สำหรับ KPI ของทีม
 * ตามบทที่ 8.3 และ app/docs/metrics-dashboard-template.md
 *
 * วิธีใช้: เปิดไฟล์ Google Sheets โครงการ แล้วรัน createDashboard()
 * โค้ดจะสร้างแท็บ 5 แท็บพร้อมสูตร KPI ข้อมูลตัวอย่าง และกราฟ Burndown
 */

/**
 * สร้าง/รีเซ็ต Dashboard ทั้งหมด
 * แท็บ: 📊 KPI · Card Log · 📈 Burndown · 🔢 WIP & Cycle · ✅ DoD Log
 */
function createDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('ไม่พบ Active Spreadsheet — เปิดไฟล์ Google Sheets ก่อน');

  const tabNames = ['📊 KPI', 'Card Log', '📈 Burndown', '🔢 WIP & Cycle', '✅ DoD Log'];

  // ลบแท็บเดิม (ปลอดภัยเสมอ เพราะมีชีทอื่นเหลืออยู่อย่างน้อย 1)
  tabNames.forEach(name => {
    const existing = ss.getSheetByName(name);
    if (existing) ss.deleteSheet(existing);
  });

  // สร้างแท็บใหม่
  const kpi = ss.insertSheet('📊 KPI');
  const cardLog = ss.insertSheet('Card Log');
  const burndown = ss.insertSheet('📈 Burndown');
  const wip = ss.insertSheet('🔢 WIP & Cycle');
  const dod = ss.insertSheet('✅ DoD Log');

  // ลบ Sheet ตั้งต้น (Sheet1) ที่ไม่ได้ใช้
  const defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet) ss.deleteSheet(defaultSheet);

  buildKpiTab(kpi);
  buildCardLogTab(cardLog);
  buildBurndownTab(burndown);
  buildWipTab(wip);
  buildDodTab(dod);

  Logger.log('=== Dashboard สร้างเรียบร้อย (5 แท็บ) — เริ่มบันทึกข้อมูลได้ ===');
}

/**
 * แท็บ 📊 KPI — สรุป KPI 5 ตัว (บทที่ 8.3.2) พร้อมสูตรอัตโนมัติ
 */
function buildKpiTab(sheet) {
  sheet.getRange('A1').setValue('MTLineCoopBot — KPI Dashboard (บทที่ 8.3.2)').setFontSize(14).setFontWeight('bold');
  sheet.getRange('A2').setValue('อัปเดตล่าสุด');
  sheet.getRange('B2').setFormula('=TODAY()').setNumberFormat('yyyy-mm-dd');

  sheet.getRange('A4:E4').setValues([['KPI', 'ค่าปัจจุบัน (สูตรอัตโนมัติ)', 'เป้าหมาย', 'สถานะ', 'หมายเหตุ']]).setFontWeight('bold');
  sheet.getRange('A4:E4').setBackground('#E8F0FE');

  const kpiData = [
    ['อัตราเสร็จงานต่อสัปดาห์', '≥ 2–3', 'นับการ์ดที่ย้ายไป Done ใน 7 วันล่าสุด'],
    ['WIP เฉลี่ย', '≤ 3', 'ค่าเฉลี่ยจำนวนการ์ด In Progress ต่อวัน'],
    ['งานค้าง (Backlog)', 'ลดลงต่อเนื่อง', 'กรอกจำนวนการ์ดใน Backlog สัปดาห์ละครั้ง (จาก KANBAN.md)'],
    ['Cycle Time (วัน)', '≤ 5', 'เฉลี่ยวันตั้งแต่ To Do → Done ต่อการ์ด'],
    ['ความถูกต้องตามเอกสาร', '100%', 'สัดส่วนการ์ดที่ผ่าน DoD ครบ (จากแท็บ DoD Log)']
  ];
  kpiData.forEach((row, i) => {
    const r = 5 + i;
    sheet.getRange(r, 1).setValue(row[0]);
    sheet.getRange(r, 3).setValue(row[1]);
    sheet.getRange(r, 5).setValue(row[2]);
  });

  // อัตราเสร็จงานต่อสัปดาห์ (แถว 5)
  sheet.getRange(5, 2).setFormula("=COUNTIFS('Card Log'!$A:$A,\">=\"&(TODAY()-7),'Card Log'!$E:$E,\"Done\")");
  sheet.getRange(5, 4).setFormula('=IF(ISNUMBER(B5),IF(B5>=2,"✅","⚠️"),"")');

  // WIP เฉลี่ย (แถว 6)
  sheet.getRange(6, 2).setFormula("=IF(COUNT('🔢 WIP & Cycle'!$B$2:$B$500)=0,\"\",ROUND(AVERAGE('🔢 WIP & Cycle'!$B$2:$B$500),2))");
  sheet.getRange(6, 4).setFormula('=IF(ISNUMBER(B6),IF(B6<=3,"✅","⚠️"),"")');

  // งานค้าง Backlog (แถว 7) — กรอกมือสัปดาห์ละครั้ง

  // Cycle Time (แถว 8)
  sheet.getRange(8, 2).setFormula("=IF(COUNT('🔢 WIP & Cycle'!$G$2:$G$500)=0,\"\",ROUND(AVERAGE('🔢 WIP & Cycle'!$G$2:$G$500),1))");
  sheet.getRange(8, 4).setFormula('=IF(ISNUMBER(B8),IF(B8<=5,"✅","⚠️"),"")');

  // ความถูกต้องตามเอกสาร (แถว 9)
  sheet.getRange(9, 2).setFormula("=IF(COUNTA('✅ DoD Log'!$C$2:$C$500)=0,\"\",COUNTIF('✅ DoD Log'!$C$2:$C$500,\"✅\")/COUNTA('✅ DoD Log'!$C$2:$C$500))");
  sheet.getRange(9, 2).setNumberFormat('0%');
  sheet.getRange(9, 4).setFormula('=IF(ISNUMBER(B9),IF(B9>=1,"✅","⚠️"),"")');

  // ความกว้างคอลัมน์ + วิธีใช้
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 70);
  sheet.setColumnWidth(4, 40);
  sheet.setColumnWidth(5, 280);
  sheet.getRange('A11').setValue('วิธีใช้:').setFontWeight('bold');
  sheet.getRange('A12').setValue('1. บันทึกการเคลื่อนการ์ดทุกครั้งในแท็บ "Card Log"');
  sheet.getRange('A13').setValue('2. บันทึก WIP รายวัน + Cycle Time ในแท็บ "WIP & Cycle"');
  sheet.getRange('A14').setValue('3. บันทึกผล DoD ในแท็บ "DoD Log" — KPI จะคำนวณให้อัตโนมัติ');
}

/**
 * แท็บ Card Log — บันทึกทุกการเคลื่อนการ์ด (แหล่งข้อมูลหลักของ KPI)
 */
function buildCardLogTab(sheet) {
  sheet.getRange('A1:H1')
    .setValues([['วันที่', 'Card ID', 'เรื่อง', 'จาก', 'ไป', 'เอกสารอ้างอิง', 'ผู้ทำ', 'หมายเหตุ']])
    .setFontWeight('bold');
  sheet.getRange('A1:H1').setBackground('#E8F0FE');

  const sample = [
    ['2026-08-12', 'MT-01', 'Rich Menu 5 แท็บ', 'To Do', 'Done', 'บทที่ 3.3', 'ทีม', 'ระยะ 1'],
    ['2026-08-12', 'MT-08', 'ตรวจสอบ Webhook', 'To Do', 'In Progress', 'บทที่ 3.6', 'ทีม', ''],
    ['2026-08-12', 'MT-08', 'ตรวจสอบ Webhook', 'In Progress', 'Done', 'บทที่ 3.6', 'ทีม', 'DoD ครบ'],
    ['2026-08-12', 'MT-09', 'Gate ตรวจสิทธิ์', 'To Do', 'In Progress', 'บทที่ 3.7', 'ทีม', ''],
    ['2026-08-12', 'MT-09', 'Gate ตรวจสิทธิ์', 'In Progress', 'Done', 'บทที่ 3.7', 'ทีม', 'DoD ครบ']
  ];
  sheet.getRange('A2:H6').setValues(sample);
  sheet.getRange(2, 1, sample.length, 1).setNumberFormat('yyyy-mm-dd');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(3, 220);
}

/**
 * แท็บ 📈 Burndown — วางแผน vs จริงรายสัปดาห์ + สูตรสะสม + กราฟ
 */
function buildBurndownTab(sheet) {
  sheet.getRange('A1:E1')
    .setValues([['สัปดาห์เริ่ม', 'งานที่วางแผน (การ์ด)', 'งานที่ทำเสร็จจริง', 'สะสมตามแผน', 'สะสมจริง']])
    .setFontWeight('bold');
  sheet.getRange('A1:E1').setBackground('#E8F0FE');

  const sample = [
    ['2026-08-03', 3, 3],
    ['2026-08-10', 2, 2],
    ['2026-08-17', 3, null]
  ];
  sheet.getRange('A2:C4').setValues(sample);
  sheet.getRange(2, 1, sample.length, 1).setNumberFormat('yyyy-mm-dd');

  // สูตรสะสมรายสัปดาห์
  for (let r = 2; r <= 4; r++) {
    sheet.getRange(r, 4).setFormula('=SUM($B$2:B' + r + ')');
    sheet.getRange(r, 5).setFormula('=SUM($C$2:C' + r + ')');
  }

  // กราฟเส้น Burndown
  try {
    const chart = sheet.newChart()
      .asLineChart()
      .addRange(sheet.getRange('A1:E4'))
      .setPosition(6, 1, 0, 0)
      .setOption('title', 'Burndown รายสัปดาห์ (สะสมตามแผน vs สะสมจริง)')
      .setOption('hAxis', { title: 'สัปดาห์' })
      .setOption('vAxis', { title: 'จำนวนการ์ด' })
      .build();
    sheet.insertChart(chart);
  } catch (e) {
    Logger.log('สร้างกราฟ Burndown ไม่สำเร็จ (ไม่กระทบข้อมูล): ' + e);
  }
  sheet.setColumnWidth(1, 120);
}

/**
 * แท็บ 🔢 WIP & Cycle — WIP รายวัน + Cycle Time ต่อการ์ด
 */
function buildWipTab(sheet) {
  sheet.getRange('A1').setValue('WIP รายวัน (บันทึกทุกวันทำการ)').setFontWeight('bold');
  sheet.getRange('A2:B2').setValues([['วันที่', 'In Progress (จำนวนการ์ด)']]).setFontWeight('bold');
  sheet.getRange('A2:B2').setBackground('#E8F0FE');
  const wipSample = [
    ['2026-08-10', 2],
    ['2026-08-11', 3],
    ['2026-08-12', 1]
  ];
  sheet.getRange('A3:B5').setValues(wipSample);
  sheet.getRange(3, 1, wipSample.length, 1).setNumberFormat('yyyy-mm-dd');

  sheet.getRange('D1').setValue('Cycle Time ต่อการ์ด (บันทึกเมื่อปิดการ์ด)').setFontWeight('bold');
  sheet.getRange('D2:G2')
    .setValues([['Card ID', 'เริ่ม (To Do)', 'เสร็จ (Done)', 'Cycle (วัน)']])
    .setFontWeight('bold');
  sheet.getRange('D2:G2').setBackground('#E8F0FE');
  const cycleSample = [
    ['MT-08', '2026-08-12', '2026-08-12'],
    ['MT-09', '2026-08-12', '2026-08-12']
  ];
  sheet.getRange('D3:F4').setValues(cycleSample);
  sheet.getRange(3, 4, cycleSample.length, 3).setNumberFormat('yyyy-mm-dd');
  sheet.getRange('G3').setFormula('=IF(AND(ISNUMBER(E3),ISNUMBER(F3)),F3-E3,"")');
  sheet.getRange('G4').setFormula('=IF(AND(ISNUMBER(E4),ISNUMBER(F4)),F4-E4,"")');
}

/**
 * แท็บ ✅ DoD Log — ตรวจสอบ Definition of Done (บทที่ 8.1.3)
 * คอลัมน์ C คำนวณอัตโนมัติจาก 3 ข้อ (D, E, F)
 */
function buildDodTab(sheet) {
  sheet.getRange('A1:G1')
    .setValues([['Card ID', 'เรื่อง', 'DoD ครบ (อัตโนมัติ)', 'เอกสารอัปเดต', 'Contract test ผ่าน', 'README อัปเดต', 'หมายเหตุ']])
    .setFontWeight('bold');
  sheet.getRange('A1:G1').setBackground('#E8F0FE');

  const sample = [
    ['MT-08', 'ตรวจสอบ Webhook', '✅', '✅', '✅', ''],
    ['MT-09', 'Gate ตรวจสิทธิ์', '✅', '✅', '✅', '']
  ];
  sheet.getRange('A2:B3').setValues(sample.map(r => [r[0], r[1]]));
  sheet.getRange('D2:G3').setValues(sample.map(r => r.slice(2)));
  sheet.getRange('C2').setFormula('=IF(AND(D2="✅",E2="✅",F2="✅"),"✅","❌")');
  sheet.getRange('C3').setFormula('=IF(AND(D3="✅",E3="✅",F3="✅"),"✅","❌")');
}
