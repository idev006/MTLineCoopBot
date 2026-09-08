/**
 * @fileoverview Ports.MessagingPort
 * Semantic outbound messaging contract.
 */
var Ports = Ports || {};

Ports.MessagingPort = (() => {
  'use strict';

  function assertImplemented(messaging) {
    if (!messaging || typeof messaging.send !== 'function') {
      throw new Error('MessagingPort requires send(message)');
    }
    return messaging;
  }

  return { assertImplemented };
})();
