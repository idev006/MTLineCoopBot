/**
 * @fileoverview Adapters.Line.LineMemberMenuAdapter
 */
var Adapters = Adapters || {};
Adapters.Line = Adapters.Line || {};

Adapters.Line.LineMemberMenuAdapter = (() => {
  'use strict';

  function create(deps) {
    const d = deps || {};
    const tokenProvider = d.tokenProvider;
    if (typeof tokenProvider !== 'function') {
      throw new Error('LineMemberMenuAdapter requires tokenProvider()');
    }

    function revokeMemberMenu(lineUserId) {
      try {
        return RichMenu.Gating.unlinkMemberMenu(lineUserId, tokenProvider());
      } catch (e) {
        return { ok:false, error:String(e && e.message ? e.message : e) };
      }
    }

    return Object.freeze({ revokeMemberMenu });
  }

  return { create };
})();
