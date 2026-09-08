/**
 * @fileoverview Adapters.Test.InMemoryMessagingAdapter
 */
var Adapters = Adapters || {};
Adapters.Test = Adapters.Test || {};

Adapters.Test.InMemoryMessagingAdapter = (() => {
  'use strict';

  function create() {
    const messages = [];

    function send(message) {
      messages.push(JSON.parse(JSON.stringify(message || {})));
      return { ok:true, statusCode:200, body:'' };
    }

    function list() {
      return JSON.parse(JSON.stringify(messages));
    }

    function reset() {
      messages.length = 0;
    }

    return Object.freeze({ send, list, reset });
  }

  return { create };
})();
