/**
 * @fileoverview Composition.SystemFactory
 * Canonical dependency-wiring seam for Engine-first / Plug-in architecture.
 *
 * This module does not move business behavior yet. It provides one explicit
 * place where production dependencies can be selected and where tests can
 * substitute fakes/in-memory adapters.
 */

var Composition = Composition || {};

Composition.SystemFactory = (() => {
  'use strict';

  function defaultClock() {
    return Ports.ClockPort.systemClock();
  }

  function defaultConfig() {
    return Adapters.Config.AppsScriptConfigAdapter;
  }

  function defaultMemberRepository() {
    return Data.MemberRepository.getRepository();
  }

  function defaultApi() {
    return {
      handleRequest: (method, path, options) =>
        Api.ApiService.handleRequest(method, path, options)
    };
  }

  function defaultIdentity() {
    return Adapters.Security.DenyAllIdentityAdapter;
  }

  function defaultLineIdTokenVerifier() {
    return Adapters.Security.LineIdTokenVerifier.create({
      httpClient: Adapters.Http.AppsScriptHttpClientAdapter
    });
  }

  /**
   * Create a dependency bundle.
   * Callers may replace any dependency explicitly.
   *
   * @param {Object} [overrides]
   * @returns {Object}
   */
  function createSystem(overrides) {
    const o = overrides || {};
    const clock = Ports.ClockPort.assertImplemented(o.clock || defaultClock());
    const memberAccess = o.memberAccess || Engine.MemberAccessEngine.create({ clock });
    const identity = Ports.IdentityPort.assertImplemented(o.identity || defaultIdentity());
    const authorization = o.authorization || Engine.AuthorizationEngine.create();
    const lineIdTokenVerifier = Ports.IdTokenVerifierPort.assertImplemented(
      o.lineIdTokenVerifier || defaultLineIdTokenVerifier()
    );
    const sessionStore = Ports.SessionStorePort.assertImplemented(
      o.sessionStore || Adapters.Security.AppsScriptPropertiesSessionStore
    );
    const sessionTokens = Ports.SessionTokenPort.assertImplemented(
      o.sessionTokens || Adapters.Security.AppsScriptSessionTokenAdapter
    );
    const webSessionEngine = o.webSessionEngine || Engine.WebSessionEngine.create({ clock });
    const memberRepository = o.memberRepository || defaultMemberRepository();
    const config = Ports.ConfigPort.assertImplemented(o.config || defaultConfig());
    const audit = Ports.AuditPort.assertImplemented(
      o.audit || Adapters.Audit.MemberRepositoryAuditAdapter.create({ memberRepository })
    );
    const auditQuery = Ports.AuditQueryPort.assertImplemented(
      o.auditQuery || Adapters.Audit.SheetsAuditQueryAdapter
    );
    const reportQuery = Ports.ReportQueryPort.assertImplemented(
      o.reportQuery || Adapters.Report.SheetsReportQueryAdapter
    );
    const messaging = Ports.MessagingPort.assertImplemented(
      o.messaging || Adapters.Line.LineMessagingAdapter.create({
        tokenProvider: () => config.get().CHANNEL_ACCESS_TOKEN
      })
    );
    const memberMenu = Ports.MemberMenuPort.assertImplemented(
      o.memberMenu || Adapters.Line.LineMemberMenuAdapter.create({
        tokenProvider: () => config.get().CHANNEL_ACCESS_TOKEN
      })
    );
    const lineIdentity = Ports.IdentityPort.assertImplemented(
      o.lineIdentity || Adapters.Security.LineIdentityAdapter.create({
        verifier: lineIdTokenVerifier,
        memberRepository,
        clientIdProvider: () => config.get().LINE_LOGIN_CHANNEL_ID
      })
    );
    const getCurrentMemberProfile = o.getCurrentMemberProfile ||
      Application.Member.GetCurrentMemberProfileUseCase.create({
        memberRepository,
        memberAccess,
        authorization
      });
    const getCurrentMemberFinance = o.getCurrentMemberFinance ||
      Application.Member.GetCurrentMemberFinanceUseCase.create({
        memberRepository,
        memberAccess,
        authorization
      });
    const activateMember = o.activateMember ||
      Application.Member.ActivateMemberUseCase.create({
        memberRepository,
        clock,
        activationEngine: o.memberActivationEngine || Engine.MemberActivationEngine,
        audit
      });
    const renewMember = o.renewMember ||
      Application.Member.RenewMemberUseCase.create({
        memberRepository,
        clock,
        authorization,
        audit
      });
    const expiryScan = o.expiryScan ||
      Application.Scheduled.ExpiryScanUseCase.create({
        memberRepository,
        clock,
        config,
        messaging,
        memberMenu,
        audit
      });
    const noticeBroadcast = o.noticeBroadcast ||
      Application.Scheduled.NoticeBroadcastUseCase.create({
        memberRepository,
        clock,
        messaging
      });
    const loanReminder = o.loanReminder ||
      Application.Scheduled.LoanReminderUseCase.create({
        memberRepository,
        clock,
        config,
        messaging,
        audit
      });
    const calculateLoan = o.calculateLoan ||
      Application.Finance.CalculateLoanUseCase.create({
        calculator: o.loanCalculator || Core.LoanCalculator
      });
    const createWebSession = o.createWebSession ||
      Application.Security.CreateWebSessionUseCase.create({
        sessionStore,
        sessionTokens,
        config,
        sessionEngine:webSessionEngine
      });
    const verifyWebSession = o.verifyWebSession ||
      Application.Security.VerifyWebSessionUseCase.create({
        sessionStore,
        sessionTokens,
        sessionEngine:webSessionEngine
      });
    const revokeWebSession = o.revokeWebSession ||
      Application.Security.RevokeWebSessionUseCase.create({
        sessionStore,
        sessionTokens,
        clock
      });
    const webIdentity = Ports.IdentityPort.assertImplemented(
      o.webIdentity || Adapters.Security.WebSessionIdentityAdapter.create({
        verifySession:verifyWebSession
      })
    );
    const exchangeLineForWebSession = o.exchangeLineForWebSession ||
      Application.Security.ExchangeLineForWebSessionUseCase.create({
        lineIdentity,
        authorization,
        createWebSession
      });
    const listWebMembers = o.listWebMembers ||
      Application.Web.ListMembersUseCase.create({
        memberRepository,
        authorization
      });
    const getWebMemberDetail = o.getWebMemberDetail ||
      Application.Web.GetMemberDetailUseCase.create({
        memberRepository,
        authorization
      });
    const getAdminSettings = o.getAdminSettings ||
      Application.Web.GetAdminSettingsUseCase.create({
        config,
        authorization
      });
    const listStaffAccounts = o.listStaffAccounts ||
      Application.Web.ListStaffAccountsUseCase.create({
        memberRepository,
        authorization
      });
    const getRoleCatalog = o.getRoleCatalog ||
      Application.Web.GetRoleCatalogUseCase.create({
        authorization,
        roleCatalog:o.roleCatalog || Security.RoleCatalog
      });
    const getAuditLog = o.getAuditLog ||
      Application.Web.GetAuditLogUseCase.create({
        auditQuery,
        authorization
      });
    const getSummaryReport = o.getSummaryReport ||
      Application.Web.GetSummaryReportUseCase.create({
        reportQuery,
        authorization,
        memberAccess,
        config,
        clock
      });
    const renewWebMember = o.renewWebMember ||
      Application.Web.RenewMemberByStaffUseCase.create({
        memberRepository,
        clock,
        audit,
        authorization
      });

    return Object.freeze({
      clock,
      config,
      audit,
      auditQuery,
      reportQuery,
      messaging,
      memberMenu,
      memberRepository,
      memberAccess,
      identity,
      lineIdentity,
      lineIdTokenVerifier,
      webIdentity,
      sessionStore,
      sessionTokens,
      webSessionEngine,
      authorization,
      getCurrentMemberProfile,
      getCurrentMemberFinance,
      activateMember,
      renewMember,
      expiryScan,
      noticeBroadcast,
      loanReminder,
      calculateLoan,
      createWebSession,
      verifyWebSession,
      revokeWebSession,
      exchangeLineForWebSession,
      listWebMembers,
      getWebMemberDetail,
      getAdminSettings,
      getAuditLog,
      getSummaryReport,
      renewWebMember,
      listStaffAccounts,
      getRoleCatalog,
      api: o.api || defaultApi()
    });
  }

  return {
    createSystem
  };
})();
