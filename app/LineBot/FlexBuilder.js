/**
 * @fileoverview LineBot.FlexBuilder
 * สร้าง Flex Message สำหรับตอบกลับเมื่อผู้ใช้คลิกเมนู
 */

var LineBot = LineBot || {};

LineBot.FlexBuilder = (() => {
  'use strict';

  /**
   * สร้าง Flex Bubble แสดงข้อความ "คุณเลือกเมนู {{menuCaption}}"
   * @param {string} menuCaption
   * @returns {Object}
   */
  function menuClicked(menuCaption) {
    return {
      type: 'flex',
      altText: `คุณเลือกเมนู ${menuCaption}`,
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'เมนูที่เลือก',
              weight: 'bold',
              size: 'sm',
              color: '#FFFFFF'
            }
          ],
          backgroundColor: '#1DB446',
          paddingAll: 'md'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `คุณเลือกเมนู ${menuCaption}`,
              weight: 'bold',
              size: 'lg',
              wrap: true,
              color: '#333333'
            },
            {
              type: 'text',
              text: 'ระบบกำลังดำเนินการตามคำขอของคุณ',
              size: 'sm',
              color: '#888888',
              margin: 'md',
              wrap: true
            }
          ],
          paddingAll: 'lg'
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#1DB446',
              action: {
                type: 'postback',
                label: 'ตกลง',
                data: 'action=ack_menu'
              }
            }
          ],
          paddingAll: 'lg'
        }
      }
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
      contents: {
        type: 'bubble',
        size: 'kilo',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🎉 ยินดีต้อนรับ',
              weight: 'bold',
              size: 'lg',
              color: '#FFFFFF',
              align: 'center'
            }
          ],
          backgroundColor: '#1DB446',
          paddingAll: 'lg'
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${fullName}`,
              weight: 'bold',
              size: 'xl',
              wrap: true,
              color: '#333333',
              align: 'center'
            },
            {
              type: 'text',
              text: `รหัสสมาชิก: ${member.memCode || '-'}`,
              size: 'sm',
              color: '#666666',
              align: 'center',
              margin: 'md'
            },
            {
              type: 'separator',
              margin: 'lg'
            },
            {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '✅ Activate สำเร็จ',
                  weight: 'bold',
                  size: 'md',
                  color: '#1DB446',
                  align: 'center'
                },
                {
                  type: 'text',
                  text: `วันที่ activate: ${formatDate(member.memEffDt)}`,
                  size: 'sm',
                  color: '#888888',
                  margin: 'sm'
                },
                {
                  type: 'text',
                  text: `วันหมดอายุ: ${formatDate(member.memExpDt)}`,
                  size: 'sm',
                  color: '#888888'
                }
              ],
              margin: 'lg',
              paddingAll: 'md',
              backgroundColor: '#F0F8F0',
              cornerRadius: 'md'
            }
          ],
          paddingAll: 'lg'
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#1DB446',
              action: {
                type: 'postback',
                label: 'เข้าสู่เมนูหลัก',
                data: 'action=show_main_menu'
              }
            }
          ],
          paddingAll: 'lg'
        }
      }
    };
  }

  /**
   * สร้าง Flex Message แบบ Message Box ทั่วไป
   * @param {Object} options
   * @param {string} options.title - หัวข้อใน header (required)
   * @param {string} options.message - ข้อความหลักใน body (required)
   * @param {string} [options.headerColor='#1DB446'] - สีพื้นหลัง header
   * @param {string} [options.headerTextColor='#FFFFFF'] - สีตัวอักษร header
   * @param {string} [options.bodyColor='#FFFFFF'] - สีพื้นหลัง body
   * @param {string} [options.bodyTextColor='#333333'] - สีตัวอักษร body
   * @param {string} [options.boxColor='#F0F8F0'] - สีกล่องข้อความใน body
   * @param {string} [options.icon=''] - ไอคอนหน้าหัวข้อ (เช่น '🎉', '✅', '⚠️')
   * @param {Array<Object>} [options.extraContents] - เนื้อหาเพิ่มเติมใน body (array of flex components)
   * @param {Object} [options.footerButton] - ปุ่มใน footer { label, data, color }
   * @param {string} [options.size='kilo'] - ขนาด bubble (nano/micro/kilo/mega/giga)
   * @returns {Object}
   */
  function messageBox(options) {
    const {
      title,
      message,
      headerColor = '#1DB446',
      headerTextColor = '#FFFFFF',
      bodyColor = '#FFFFFF',
      bodyTextColor = '#333333',
      boxColor = '#F0F8F0',
      icon = '',
      extraContents = [],
      footerButton = null,
      size = 'kilo'
    } = options;

    const headerText = icon ? `${icon} ${title}` : title;

    const bodyContents = [
      {
        type: 'text',
        text: message,
        weight: 'bold',
        size: 'lg',
        wrap: true,
        color: bodyTextColor,
        align: 'center'
      }
    ];

    // เพิ่ม extra contents ถ้ามี
    if (extraContents.length > 0) {
      bodyContents.push({
        type: 'separator',
        margin: 'lg'
      });
      bodyContents.push({
        type: 'box',
        layout: 'vertical',
        contents: extraContents,
        margin: 'lg',
        paddingAll: 'md',
        backgroundColor: boxColor,
        cornerRadius: 'md'
      });
    }

    const bubble = {
      type: 'bubble',
      size: size,
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: headerText,
            weight: 'bold',
            size: 'lg',
            color: headerTextColor,
            align: 'center'
          }
        ],
        backgroundColor: headerColor,
        paddingAll: 'lg'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
        paddingAll: 'lg',
        backgroundColor: bodyColor
      }
    };

    // เพิ่ม footer ถ้ามีปุ่ม
    if (footerButton) {
      bubble.footer = {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: footerButton.color || headerColor,
            action: {
              type: 'postback',
              label: footerButton.label,
              data: footerButton.data
            }
          }
        ],
        paddingAll: 'lg'
      };
    }

    return {
      type: 'flex',
      altText: title,
      contents: bubble
    };
  }

  return {
    menuClicked,
    welcomeMember,
    messageBox
  };
})();
