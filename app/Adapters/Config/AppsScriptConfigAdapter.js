/**
 * @fileoverview Adapters.Config.AppsScriptConfigAdapter
 */
var Adapters = Adapters || {};
Adapters.Config = Adapters.Config || {};

Adapters.Config.AppsScriptConfigAdapter = Object.freeze({
  get: function () {
    return Config.get();
  },
  validate: function () {
    return Config.validate();
  }
});
