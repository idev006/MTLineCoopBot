/**
 * @fileoverview RichMenu.Deployer
 * รวมขั้นตอนการ deploy Rich Menu ทั้งหมด (5 แท็บ)
 */

var RichMenu = RichMenu || {};

RichMenu.Deployer = (() => {
  'use strict';

  const ApiService = RichMenu.ApiService;
  const ALIAS = Config.ALIAS;

  /**
   * Deploy Rich Menu ทั้ง 5 แท็บ
   */
  function deploy() {
    const cfg = Config.validate();
    const token = cfg.CHANNEL_ACCESS_TOKEN;

    const MenuData = RichMenu.MenuData;
    Logger.log(`MenuData available: ${!!MenuData}`);
    Logger.log(`MenuData.buildTab1: ${typeof (MenuData && MenuData.buildTab1)}`);

    if (!MenuData || typeof MenuData.buildTab1 !== 'function') {
      throw new Error('RichMenu.MenuData ยังไม่ถูกโหลด กรุณาตรวจสอบลำดับไฟล์หรือรอให้โหลดเสร็จ');
    }

    ApiService.deleteAll(token);
    Logger.log('เริ่มสร้าง Rich Menu...');

    // สร้าง Rich Menu ทั้ง 5 แท็บ + Welcome Menu
    const richMenuWelcome = ApiService.create(MenuData.buildWelcomeTab(), token);
    const richMenuId1 = ApiService.create(MenuData.buildTab1(), token);
    const richMenuId2 = ApiService.create(MenuData.buildTab2(), token);
    const richMenuId3 = ApiService.create(MenuData.buildTab3(), token);
    const richMenuId4 = ApiService.create(MenuData.buildTab4(), token);
    const richMenuId5 = ApiService.create(MenuData.buildTab5(), token);

    // อัปโหลดภาพสำหรับแต่ละแท็บ (ใช้ค่าจาก Config.IMAGE_FILE_IDS โดยตรง)
    // Welcome: อัปโหลดเฉพาะเมื่อมี File ID (Config.IMAGE_FILE_IDS.WELCOME)
    if (Config.IMAGE_FILE_IDS.WELCOME) {
      ApiService.uploadImage(richMenuWelcome, Config.IMAGE_FILE_IDS.WELCOME, token);
    } else {
      Logger.log('ไม่พบภาพ Welcome Menu (Config.IMAGE_FILE_IDS.WELCOME ว่าง) — ใช้แบบไม่มีภาพ');
    }
    ApiService.uploadImage(richMenuId1, Config.IMAGE_FILE_IDS.TAB_1, token);
    ApiService.uploadImage(richMenuId2, Config.IMAGE_FILE_IDS.TAB_2, token);
    ApiService.uploadImage(richMenuId3, Config.IMAGE_FILE_IDS.TAB_3, token);
    ApiService.uploadImage(richMenuId4, Config.IMAGE_FILE_IDS.TAB_4, token);
    ApiService.uploadImage(richMenuId5, Config.IMAGE_FILE_IDS.TAB_5, token);

    // สร้าง Alias สำหรับแต่ละแท็บ + Welcome
    ApiService.upsertAlias(ALIAS.WELCOME, richMenuWelcome, token);
    ApiService.upsertAlias(ALIAS.TAB_1, richMenuId1, token);
    ApiService.upsertAlias(ALIAS.TAB_2, richMenuId2, token);
    ApiService.upsertAlias(ALIAS.TAB_3, richMenuId3, token);
    ApiService.upsertAlias(ALIAS.TAB_4, richMenuId4, token);
    ApiService.upsertAlias(ALIAS.TAB_5, richMenuId5, token);

    // ตั้งค่า Welcome Menu เป็น default (ผู้ไม่ Activate เห็น Welcome)
    // สมาชิกที่ valid จะถูกผูกเมนู Tab 1 เป็นรายบุคคล (RichMenu.Gating)
    ApiService.setDefault(richMenuWelcome, token);

    Logger.log('=== Deploy เสร็จสิ้น ===');
    Logger.log(`Welcome=${richMenuWelcome} (ต้อนรับ — default)`);
    Logger.log(`Id1=${richMenuId1} (ข้อมูลส่วนตัว)`);
    Logger.log(`Id2=${richMenuId2} (เงินกู้ & สวัสดิการ)`);
    Logger.log(`Id3=${richMenuId3} (ข่าวสารสหกรณ์)`);
    Logger.log(`Id4=${richMenuId4} (เอกสาร & คู่มือ)`);
    Logger.log(`Id5=${richMenuId5} (ติดต่อเรา)`);
  }

  return {
    deploy
  };
})();

/**
 * รันฟังก์ชันนี้เพื่อ Deploy Rich Menu ทั้ง 5 แท็บ
 */
function main() {
  RichMenu.Deployer.deploy();
}

/**
 * รันฟังก์ชันนี้เพื่อตรวจสอบสถานะ Rich Menu ปัจจุบัน
 */
function checkRichMenuStatus() {
  const cfg = Config.validate();
  const status = RichMenu.ApiService.checkStatus(cfg.CHANNEL_ACCESS_TOKEN);
  Logger.log('=== Rich Menu Status ===');
  Logger.log(`Rich Menus: ${status.richmenus.length}`);
  status.richmenus.forEach(rm => {
    Logger.log(`- ${rm.richMenuId}: ${rm.name}`);
  });
  Logger.log(`Aliases: ${status.aliases.length}`);
  status.aliases.forEach(al => {
    Logger.log(`- ${al.richMenuAliasId} -> ${al.richMenuId}`);
  });
  Logger.log(`Default Rich Menu: ${status.defaultRichMenuId || 'none'}`);
  if (status.errors.length > 0) {
    Logger.log('Errors:');
    status.errors.forEach(err => Logger.log(`- ${err}`));
  }
  return status;
}
