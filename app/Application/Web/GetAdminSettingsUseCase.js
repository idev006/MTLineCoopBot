/**
 * @fileoverview Application.Web.GetAdminSettingsUseCase
 * Server-authorized read-only admin settings projection.
 */
var Application = Application || {};
Application.Web = Application.Web || {};

Application.Web.GetAdminSettingsUseCase = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const config = Ports.ConfigPort.assertImplemented(d.config);
    const authorization = d.authorization;
    if (!authorization || typeof authorization.requireRole !== 'function') {
      throw new Error('GetAdminSettingsUseCase requires authorization.requireRole');
    }

    function execute(input) {
      const principal = input && input.principal;
      const allowed = authorization.requireRole(principal, 'admin');
      if (!allowed.allowed) {
        return { ok:false, error:{ code:allowed.reason === 'unauthenticated' ? 'UNAUTHENTICATED' : 'FORBIDDEN' } };
      }

      const cfg = config.get();
      return {
        ok:true,
        data:{
          appName:'MTP6LineCoopBot',
          dbType:cfg.DB_TYPE || 'sheets',
          expiryWarningDays:Number(cfg.EXPIRY_WARNING_DAYS || 30),
          paymentReminderDays:Number(cfg.PAYMENT_REMINDER_DAYS || 14),
          webSessionTtlSeconds:Number(cfg.WEB_SESSION_TTL_SECONDS || 28800),
          features:{
            liffEnabled:!!cfg.LINE_LOGIN_CHANNEL_ID,
            webhookConfigured:!!cfg.WEBHOOK_SECRET,
            autoExpiryCheck:true
          }
        }
      };
    }

    return Object.freeze({ execute });
  }

  return { create };
})();
