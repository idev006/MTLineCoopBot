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

  /**
   * Create a dependency bundle.
   * Callers may replace any dependency explicitly.
   *
   * @param {Object} [overrides]
   * @returns {Object}
   */
  function createSystem(overrides) {
    const o = overrides || {};
    return Object.freeze({
      clock: Ports.ClockPort.assertImplemented(o.clock || defaultClock()),
      config: o.config || defaultConfig(),
      memberRepository: o.memberRepository || defaultMemberRepository(),
      api: o.api || defaultApi()
    });
  }

  return {
    createSystem
  };
})();
