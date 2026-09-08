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
    return { get: () => Config.get() };
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
    const memberRepository = o.memberRepository || defaultMemberRepository();
    const config = o.config || defaultConfig();
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

    return Object.freeze({
      clock,
      config,
      memberRepository,
      memberAccess,
      identity,
      lineIdentity,
      lineIdTokenVerifier,
      authorization,
      getCurrentMemberProfile,
      getCurrentMemberFinance,
      api: o.api || defaultApi()
    });
  }

  return {
    createSystem
  };
})();
