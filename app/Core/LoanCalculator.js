/**
 * @fileoverview Core.LoanCalculator
 * Canonical loan-calculation authority.
 *
 * Formula: reducing balance, Actual/365
 * interest = remaining principal * annual rate * actual days / 365
 *
 * Pure/headless: no UI, network, storage, or Apps Script dependencies.
 */
var Core = Core || {};

Core.LoanCalculator = (() => {
  'use strict';

  const MODES = Object.freeze(['installment_count', 'installment_amount']);
  const PAYMENT_TYPES = Object.freeze(['equal_principal', 'equal_installment']);
  const MAX_PERIODS = 360;

  function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  }

  function parseLocalDate(value) {
    const m = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    const date = new Date(y, mo - 1, d);
    if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
    return date;
  }

  function formatLocalDate(date) {
    const pad = n => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function getDaysDiff(d1, d2) {
    const a = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const b = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.round(Math.abs(b.getTime() - a.getTime()) / 86400000);
  }

  function getNextMonthEnd(startStr, period) {
    const start = parseLocalDate(startStr);
    if (!start) return null;
    return new Date(start.getFullYear(), start.getMonth() + Number(period), 0);
  }

  function normalizePaymentType(value) {
    if (value === 'equal_total') return 'equal_installment'; // legacy UI alias
    return value;
  }

  function validate(params) {
    const p = params || {};
    const loanAmount = Number(p.loanAmount);
    const interestRatePercent = Number(p.interestRatePercent);
    const calcValue = Number(p.calcValue);
    const calcMode = p.calcMode;
    const paymentType = normalizePaymentType(p.paymentType);
    const startDate = p.startDate;

    if (!Number.isFinite(loanAmount) || loanAmount <= 0) {
      return { ok:false, error:{ code:'LOAN_AMOUNT_INVALID', message:'loanAmount ไม่ถูกต้อง' } };
    }
    if (!Number.isFinite(interestRatePercent) || interestRatePercent < 0) {
      return { ok:false, error:{ code:'INTEREST_RATE_INVALID', message:'interestRatePercent ไม่ถูกต้อง' } };
    }
    if (!MODES.includes(calcMode)) {
      return { ok:false, error:{ code:'CALC_MODE_INVALID', message:'calcMode ไม่ถูกต้อง' } };
    }
    if (!Number.isFinite(calcValue) || calcValue <= 0) {
      return { ok:false, error:{ code:'CALC_VALUE_INVALID', message:'calcValue ไม่ถูกต้อง' } };
    }
    if (calcMode === 'installment_count' && (!Number.isInteger(calcValue) || calcValue > MAX_PERIODS)) {
      return { ok:false, error:{ code:'INSTALLMENT_COUNT_INVALID', message:'จำนวนงวดต้องเป็นจำนวนเต็ม 1-' + MAX_PERIODS } };
    }
    if (!PAYMENT_TYPES.includes(paymentType)) {
      return { ok:false, error:{ code:'PAYMENT_TYPE_INVALID', message:'paymentType ไม่ถูกต้อง' } };
    }
    if (!parseLocalDate(startDate)) {
      return { ok:false, error:{ code:'START_DATE_INVALID', message:'startDate ไม่ถูกต้อง' } };
    }

    return {
      ok:true,
      value:{ loanAmount, interestRatePercent, calcMode, calcValue, paymentType, startDate }
    };
  }

  function calculateLoanSchedule(params) {
    const checked = validate(params);
    if (!checked.ok) return { error:checked.error.message, code:checked.error.code };

    const p = checked.value;
    const loanAmount = p.loanAmount;
    const rate = p.interestRatePercent / 100;
    const calcMode = p.calcMode;
    const calcValue = p.calcValue;
    const paymentType = p.paymentType;
    const startDate = p.startDate;

    let balance = loanAmount;
    const schedule = [];
    let previousDate = parseLocalDate(startDate);
    let period = 1;
    let fixedPrincipal = 0;
    let emi = 0;

    if (calcMode === 'installment_count') {
      if (paymentType === 'equal_principal') {
        fixedPrincipal = balance / calcValue;
      } else {
        const monthlyRate = rate / 12;
        if (monthlyRate === 0) {
          emi = balance / calcValue;
        } else {
          const factor = Math.pow(1 + monthlyRate, calcValue);
          emi = balance * monthlyRate * factor / (factor - 1);
        }
      }
    } else {
      if (paymentType === 'equal_principal') fixedPrincipal = calcValue;
      else emi = calcValue;
    }

    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalPayment = 0;

    while (balance > 0.01) {
      if (period > MAX_PERIODS) {
        return { error:'จำนวนงวดเกินขีดจำกัด', code:'MAX_PERIODS_EXCEEDED', period };
      }

      const currentDate = getNextMonthEnd(startDate, period);
      const days = getDaysDiff(previousDate, currentDate);
      const interest = (balance * rate * days) / 365;

      let principalToPay;
      let totalToPay;

      if (paymentType === 'equal_principal') {
        principalToPay = Math.min(fixedPrincipal, balance);
        totalToPay = principalToPay + interest;
      } else {
        totalToPay = emi;
        if (totalToPay <= interest) {
          return { error:'ยอดส่งงวดน้อยกว่าหรือเท่ากับดอกเบี้ย', code:'INSTALLMENT_TOO_LOW', period };
        }
        principalToPay = totalToPay - interest;
        if (principalToPay > balance) {
          principalToPay = balance;
          totalToPay = principalToPay + interest;
        }
      }

      if (calcMode === 'installment_count' && period === calcValue) {
        principalToPay = balance;
        totalToPay = principalToPay + interest;
      }

      totalInterest += interest;
      totalPrincipal += principalToPay;
      totalPayment += totalToPay;

      schedule.push({
        period,
        remainingPrincipal: round2(balance),
        date: formatLocalDate(currentDate),
        days,
        interest: round2(interest),
        principal: round2(principalToPay),
        totalPayment: round2(totalToPay)
      });

      balance -= principalToPay;
      previousDate = currentDate;
      period++;

      if (calcMode === 'installment_count' && period > calcValue) break;
    }

    return {
      contractVersion:'loan-calculation.v1',
      paymentType,
      calcMode,
      schedule,
      totalInterest:round2(totalInterest),
      totalPrincipal:round2(totalPrincipal),
      totalPayment:round2(totalPayment)
    };
  }

  return {
    MAX_PERIODS,
    getDaysDiff,
    getNextMonthEnd,
    parseLocalDate,
    formatLocalDate,
    normalizePaymentType,
    validate,
    round2,
    calculateLoanSchedule
  };
})();
