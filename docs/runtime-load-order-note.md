# Apps Script runtime load-order invariant

Google Apps Script source files in a project must not rely on cross-file namespace members being initialized during top-level/module evaluation.

Runtime code must defer cross-file dependency dereferencing until a function such as `create()` or `execute()` is called after project initialization.

Regression covered by `tests/application/web-staff-accounts.test.js`.
