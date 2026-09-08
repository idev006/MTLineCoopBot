/**
 * @fileoverview Ports.StaffAdminRepositoryPort
 * Persistence-only write contract for staff administration.
 */
var Ports = Ports || {};

Ports.StaffAdminRepositoryPort = (() => {
  'use strict';

  function assertImplemented(repo) {
    if (!repo || typeof repo.saveRole !== 'function') {
      throw new Error('StaffAdminRepositoryPort requires saveRole(rowIndex, role)');
    }
    return repo;
  }

  return { assertImplemented };
})();
