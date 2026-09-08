/**
 * @fileoverview Ports.HttpClientPort
 * Minimal outbound HTTP contract for infrastructure adapters.
 */
var Ports = Ports || {};

Ports.HttpClientPort = (() => {
  'use strict';

  function assertImplemented(client) {
    if (!client || typeof client.request !== 'function') {
      throw new Error('HttpClientPort requires request(options)');
    }
    return client;
  }

  return { assertImplemented };
})();
