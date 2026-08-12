/**
 * @fileoverview Core.LoanCalculator
 * เครื่องคำนวณสินเชื่อ (pure functions — ไม่แตะ service ใดๆ)
 *
 * สูตรมาตรฐานการเงิน (ลดต้นลดดอก, Actual/365):
 *   ดอกเบี้ย = ยอดเงินต้นคงเหลือ × อัตรารายปี × จำนวนวันจริง ÷ 365
 *
 * ย้ายจาก loan_calculator.html (Vue) ขึ้นเป็น Core เพื่อ:
 * - เทสต์ได้ใน node โดยไม่ต้อง mock (บทที่ 3.1.1)
 * - ใช้ร่วมกันทุก UI (Bot / LIFF / Web) — อนาคต (การ์ด MT-15/MT-16)
 */

var Core = Core || {};

Core.LoanCalculator = (() => {
  'use strict';

  /**
   * จำนวนวันจริงระหว่าง 2 วัน
   * @param {Date} d1
   * @param {Date} d2
   * @returns {number}
   */
  function getDaysDiff(d1, d2) {
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * วันสิ้นเดือนของงวดที่ period (นับจากเดือนเริ่ม)
   * @param {string} startStr - 'yyyy-mm-dd'
   * @param {number} period - งวดที่ 1, 2, ...
   * @returns {Date}
   */
  function getNextMonthEnd(startStr, period) {
    const start = new Date(startStr);
    return new Date(start.getFullYear(), start.getMonth() + period, 0);
  }

  /**
   * ปัดเป็น 2 ทศนิยม
   * @param {number} n
   * @returns {number}
   */
  function round2(n) {
    return Math.round(n * 100) / 100;
  }

  /**
   * คำนวณตารางผ่อนชำระ
   * @param {Object} params
   * @param {number} params.loanAmount - ยอดเงินกู้
   * @param {number} params.interestRatePercent - อัตราดอกเบี้ยรายปี (%)
   * @param {string} params.calcMode - 'installment_count' | 'installment_amount'
   * @param {number} params.calcValue - จำนวนงวด หรือ ยอดส่งต่องวด
   * @param {string} params.paymentType - 'equal_principal' | 'equal_installment'
   * @param {string} params.startDate - วันที่เริ่ม ('yyyy-mm-dd')
   * @returns {Object} { schedule, totalInterest, totalPrincipal, totalPayment } หรือ { error }
   */
  function calculateLoanSchedule(params) {
    const loanAmount = Number(params.loanAmount);
    const rate = Number(params.interestRatePercent) / 100;
    const calcMode = params.calcMode;
    const calcValue = Number(params.calcValue);
    const paymentType = params.paymentType;
    const startDate = params.startDate;

    if (!loanAmount || loanAmount <= 0) return { error: 'loanAmount ไม่ถูกต้อง' };
    if (!startDate) return { error: 'startDate ไม่ถูกต้อง' };

    let balance = loanAmount;
    const schedule = [];
    let previousDate = new Date(startDate);
    let period = 1;
    let fixedPrincipal = 0;
    let emi = 0;

    // คำนวณเป้าหมายยอดส่งต่อเดือนเบื้องต้น
    if (calcMode === 'installment_count') {
      if (paymentType === 'equal_principal') {
        fixedPrincipal = balance / calcValue;
      } else {
        const monthlyRate = rate / 12;
        emi = balance * monthlyRate * Math.pow(1 + monthlyRate, calcValue) /
          (Math.pow(1 + monthlyRate, calcValue) - 1);
      }
    } else {
      if (paymentType === 'equal_principal') fixedPrincipal = calcValue;
      else emi = calcValue;
    }

    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalPayment = 0;

    while (balance > 0.01) {
      // Safety: ดัก infinite loop
      if (period > 360) break;

      const currentDate = getNextMonthEnd(startDate, period);
      const days = getDaysDiff(previousDate, currentDate);

      // สูตรหลัก (Actual/365 ลดต้นลดดอก)
      const interest = (balance * rate * days) / 365;

      let principalToPay = 0;
      let totalToPay = 0;

      if (paymentType === 'equal_principal') {
        principalToPay = fixedPrincipal;
        if (principalToPay > balance) principalToPay = balance;
        totalToPay = principalToPay + interest;
      } else {
        totalToPay = emi;
        if (totalToPay <= interest) {
          return { error: 'ยอดส่งงวดน้อยกว่าดอกเบี้ย', period: period };
        }
        principalToPay = totalToPay - interest;
        if (principalToPay > balance) {
          principalToPay = balance;
          totalToPay = principalToPay + interest;
        }
      }

      // ตัดจบปิดบัญชีในงวดสุดท้าย (กรณีล็อกจำนวนงวด)
      if (calcMode === 'installment_count' && period === calcValue) {
        principalToPay = balance;
        totalToPay = principalToPay + interest;
      }

      totalInterest += interest;
      totalPrincipal += principalToPay;
      totalPayment += totalToPay;

      schedule.push({
        period: period,
        remainingPrincipal: round2(balance),
        date: currentDate.toISOString().substring(0, 10),
        days: days,
        interest: round2(interest),
        principal: round2(principalToPay),
        totalPayment: round2(totalToPay)
      });

      balance -= principalToPay;
      previousDate = currentDate;
      period++;
    }

    return {
      schedule: schedule,
      totalInterest: round2(totalInterest),
      totalPrincipal: round2(totalPrincipal),
      totalPayment: round2(totalPayment)
    };
  }

  return {
    getDaysDiff,
    getNextMonthEnd,
    round2,
    calculateLoanSchedule
  };
})();
