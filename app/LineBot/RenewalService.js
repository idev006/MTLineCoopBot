/**
 * @fileoverview LineBot.RenewalService
 * LEGACY RETIRED compatibility shell.
 *
 * Renewal from chat/webhook context is no longer allowed to mutate membership.
 * Production chat hands the user to LIFF, where raw LINE ID token verification
 * establishes the canonical Principal before /api/member/me/renew executes.
 */
var LineBot = LineBot || {};

LineBot.RenewalService = (() => {
  'use strict';

  function retired() {
    Logger.log('[Renewal] Legacy direct renewal service call blocked');
    return {
      success:false,
      reason:'retired',
      error:{ code:'LEGACY_RENEWAL_RETIRED' }
    };
  }

  return Object.freeze({
    performRenew:retired,
    handleRenew:retired,
    handleConfirmRenew:retired
  });
})();
