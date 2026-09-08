/**
 * @fileoverview Adapters.Test.InMemoryStaffAdminRepository
 */
var Adapters = Adapters || {};
Adapters.Test = Adapters.Test || {};

Adapters.Test.InMemoryStaffAdminRepository = (() => {
  'use strict';

  function create(memberRepository) {
    if (!memberRepository || typeof memberRepository.snapshot !== 'function') {
      throw new Error('InMemoryStaffAdminRepository requires in-memory member repository');
    }

    // Test-only adapter exposes deterministic write through supplied callback seam.
    // Prefer createFromMembers() for isolated use-case tests.
    throw new Error('Use createFromMembers(members) for deterministic role-write tests');
  }

  function createFromMembers(members) {
    const rows = JSON.parse(JSON.stringify(members || []));

    function saveRole(rowIndex, role) {
      const i = Number(rowIndex) - 2;
      if (i < 0 || i >= rows.length) throw new Error('Member row not found: ' + rowIndex);
      rows[i].mem_role = role;
      return { memRole:role };
    }

    function snapshot() {
      return JSON.parse(JSON.stringify(rows));
    }

    return Object.freeze({ saveRole, snapshot });
  }

  return { create, createFromMembers };
})();
