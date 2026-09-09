/**
 * @fileoverview Ports.MemberRepositoryPort
 * Persistence-only contract for member-related storage operations.
 *
 * This is intentionally separate from adapter selection/composition.
 * New repository adapters must satisfy this contract and its shared tests.
 */

var Ports = Ports || {};

Ports.MemberRepositoryPort = (() => {
  'use strict';

  const METHODS = Object.freeze([
    'findByLineUserId',
    'findByMemberCode',
    'findByActivateCode',
    'saveActivation',
    'findSavingsByMember',
    'findLoansByMember',
    'findDividendsByMember',
    'listMembers',
    'saveRenewal',
    'listNotices',
    'markNoticeSent',
    'listLoans',
    'getContent'
  ]);

  function assertImplemented(repo) {
    if (!repo) throw new Error('MemberRepository adapter is required');
    const missing = METHODS.filter(name => typeof repo[name] !== 'function');
    if (missing.length > 0) {
      throw new Error('MemberRepository adapter missing methods: ' + missing.join(', '));
    }
    return repo;
  }

  function listMethods() {
    return METHODS.slice();
  }

  return {
    assertImplemented,
    listMethods
  };
})();
