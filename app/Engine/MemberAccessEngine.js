/**
 * @fileoverview Engine.MemberAccessEngine
 * Headless member validity/role authorization engine.
 *
 * Depends only on Core.MemberRules + ClockPort-compatible dependency.
 * No repository, UI, LINE, network, or Spreadsheet access.
 */
var Engine = Engine || {};

Engine.MemberAccessEngine = (() => {
  'use strict';

  const KNOWN_ROLES = Object.freeze(['member', 'staff', 'admin']);

  function create(deps) {
    const d = deps || {};
    const clock = Ports.ClockPort.assertImplemented(d.clock);

    function now() {
      return clock.now();
    }

    function isActive(member) {
      return Core.MemberRules.isActiveMember(member, now());
    }

    function hasRole(member, role) {
      return Core.MemberRules.hasRole(member, role, now());
    }

    function hasKnownRole(member) {
      return isActive(member) && KNOWN_ROLES.includes(member.mem_role);
    }

    function expiryStatus(member, warningDays) {
      return Core.MemberRules.getExpiryStatus(member, now(), warningDays);
    }

    return Object.freeze({
      isActive,
      hasRole,
      hasKnownRole,
      expiryStatus,
      knownRoles: () => KNOWN_ROLES.slice()
    });
  }

  return { create };
})();
