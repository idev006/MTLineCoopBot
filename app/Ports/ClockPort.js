/**
 * @fileoverview Ports.ClockPort
 * Contract for deterministic time access.
 */
var Ports = Ports || {};

Ports.ClockPort = (() => {
  'use strict';

  function assertImplemented(clock) {
    if (!clock || typeof clock.now !== 'function') {
      throw new Error('ClockPort requires now()');
    }
    return clock;
  }

  function systemClock() {
    return Object.freeze({ now: () => new Date() });
  }

  return { assertImplemented, systemClock };
})();
