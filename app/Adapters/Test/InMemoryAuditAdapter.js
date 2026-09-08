/**
 * @fileoverview Adapters.Test.InMemoryAuditAdapter
 * Deterministic audit sink for headless tests.
 */
var Adapters = Adapters || {};
Adapters.Test = Adapters.Test || {};

Adapters.Test.InMemoryAuditAdapter = (() => {
  'use strict';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function create(seed) {
    const initial = clone(seed || []);
    let events = clone(initial);

    function record(event) {
      const row = clone(event || {});
      events.push(row);
      return clone(row);
    }

    function snapshot() {
      return clone(events);
    }

    function reset() {
      events = clone(initial);
    }

    return Object.freeze({ record, snapshot, reset });
  }

  return { create };
})();
