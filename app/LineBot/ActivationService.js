/**
 * @fileoverview LineBot.ActivationService
 * LEGACY RETIRED compatibility shell.
 *
 * Direct LINE-webhook identity binding is forbidden by ADR-0004.
 * Production chat now hands the user to LIFF secure self-activation.
 * These methods intentionally fail closed so an accidental legacy caller
 * can never bind a client/webhook supplied LINE user ID.
 */
var LineBot = LineBot || {};

LineBot.ActivationService = (() => {
  'use strict';

  function retired() {
    Logger.log('[Activation] Legacy direct-binding ActivationService call blocked');
    return {
      success:false,
      reason:'retired',
      error:{ code:'LEGACY_ACTIVATION_RETIRED' }
    };
  }

  return Object.freeze({
    performActivate: retired,
    handleActivate: retired
  });
})();
