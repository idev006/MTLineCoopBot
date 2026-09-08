/**
 * @fileoverview Data.MemberRepository
 * Compatibility factory for selecting the configured member repository adapter.
 *
 * Port contract is authoritative at Ports.MemberRepositoryPort.
 * This module remains as a legacy-compatible factory during incremental migration.
 */

var Data = Data || {};

Data.MemberRepository = (() => {
  'use strict';

  /**
   * Backward-compatible contract assertion.
   * @param {Object} repo
   * @returns {Object}
   */
  function assertImplemented(repo) {
    return Ports.MemberRepositoryPort.assertImplemented(repo);
  }

  /**
   * Select repository adapter according to configuration.
   * Adapter selection will move to the canonical composition root incrementally.
   * @returns {Object}
   */
  function getRepository() {
    const cfg = Config.get();
    const type = (cfg.DB_TYPE || 'sheets').toLowerCase();

    if (type === 'firestore') {
      throw new Error('DB_TYPE=firestore ยังไม่ได้ implement — ต้องมี adapter ที่ผ่าน MemberRepositoryPort contract ก่อน');
    }

    return assertImplemented(Data.SheetsMemberRepository);
  }

  return {
    getRepository,
    assertImplemented
  };
})();
