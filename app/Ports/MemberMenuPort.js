/**
 * @fileoverview Ports.MemberMenuPort
 * Member menu/access presentation contract.
 */
var Ports = Ports || {};

Ports.MemberMenuPort = (() => {
  'use strict';

  function assertImplemented(menu) {
    if (!menu || typeof menu.revokeMemberMenu !== 'function') {
      throw new Error('MemberMenuPort requires revokeMemberMenu(lineUserId)');
    }
    return menu;
  }

  return { assertImplemented };
})();
