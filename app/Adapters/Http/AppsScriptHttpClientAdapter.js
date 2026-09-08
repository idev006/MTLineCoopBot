/**
 * @fileoverview Adapters.Http.AppsScriptHttpClientAdapter
 * UrlFetchApp implementation of HttpClientPort.
 */
var Adapters = Adapters || {};
Adapters.Http = Adapters.Http || {};

Adapters.Http.AppsScriptHttpClientAdapter = (() => {
  'use strict';

  function request(options) {
    const o = options || {};
    const response = UrlFetchApp.fetch(o.url, {
      method: (o.method || 'get').toLowerCase(),
      contentType: o.contentType,
      headers: o.headers || {},
      payload: o.payload,
      muteHttpExceptions: true
    });

    return {
      status: response.getResponseCode(),
      body: response.getContentText()
    };
  }

  return Object.freeze({ request });
})();
