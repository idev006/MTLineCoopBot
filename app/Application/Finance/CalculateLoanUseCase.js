/**
 * @fileoverview Application.Finance.CalculateLoanUseCase
 * Headless loan-calculation application boundary.
 */
var Application = Application || {};
Application.Finance = Application.Finance || {};

Application.Finance.CalculateLoanUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const calculator = d.calculator || Core.LoanCalculator;
    if (!calculator || typeof calculator.calculateLoanSchedule !== 'function') {
      throw new Error('CalculateLoanUseCase requires calculator.calculateLoanSchedule');
    }

    function execute(input) {
      const params = input && input.params ? input.params : {};
      const result = calculator.calculateLoanSchedule(params);
      if (result && result.error) {
        return {
          ok:false,
          error:{
            code:result.code || 'LOAN_CALCULATION_INVALID',
            message:result.error,
            period:result.period || null
          }
        };
      }
      return { ok:true, data:result };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
