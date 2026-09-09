#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const webApp = fs.readFileSync(path.join(root, 'app', 'WebApp.js'), 'utf8');
const config = fs.readFileSync(path.join(root, 'app', 'Config.js'), 'utf8');
const registrySource = fs.readFileSync(path.join(root, 'app', 'Api', 'ApiRegistry.js'), 'utf8');

for (const [name, source] of [['WebApp.js', webApp], ['Config.js', config]]) {
  for (const marker of ['API_KEY', 'api_key', 'getProvidedApiKey']) {
    if (source.includes(marker)) {
      throw new Error(name + ' still contains retired browser API-key marker: ' + marker);
    }
  }
}

const publicPaths = new Set(['/api/health', '/api/loan/calculate']);
const identityAuth = new Set(['line-id-token', 'web-session']);

const handlerNames = [
  'health','calculateLoan','webSessionFromLine','verifyWebSession','revokeWebSession',
  'listWebMembers','getWebMemberDetail','getWebAdminSettings','listWebStaffAccounts',
  'getWebRoleCatalog','assignWebStaffRole','getWebAuditLog','getWebSummaryReport',
  'renewWebMember','getCurrentProfile','getCurrentSavings','getCurrentLoans',
  'getCurrentDividends','activateCurrentMember','renewCurrentMember'
];
const handlers = {};
for (const name of handlerNames) handlers[name] = () => ({ name });

const sandbox = {
  Api: {
    ApiHandlers: handlers,
    ApiResponse: {
      ok: (data) => ({ ok:true, data }),
      notFound: (p) => ({ ok:false, error:{ code:'NOT_FOUND', path:p } }),
      methodNotAllowed: () => ({ ok:false, error:{ code:'METHOD_NOT_ALLOWED' } }),
      error: (code, message, detail) => ({ ok:false, error:{ code, message, ...(detail || {}) } }),
      internal: () => ({ ok:false, error:{ code:'INTERNAL' } })
    }
  },
  Logger:{ log:()=>{} },
  Object, Array, String
};
vm.createContext(sandbox);
vm.runInContext(registrySource, sandbox, { filename:'ApiRegistry.js' });

const routes = sandbox.Api.ApiRegistry.listRoutes();
if (routes.length === 0) throw new Error('route registry unexpectedly empty');

for (const route of routes) {
  if (publicPaths.has(route.path)) {
    if (route.auth !== 'none') {
      throw new Error('public route must be auth=none: ' + route.path);
    }
    continue;
  }
  if (!identityAuth.has(route.auth)) {
    throw new Error('registered non-public route has unsupported/dead auth mode: ' +
      route.method + ' ' + route.path + ' auth=' + route.auth);
  }
}

for (const p of publicPaths) {
  const route = routes.find(r => r.path === p);
  if (!route) throw new Error('explicit public route missing: ' + p);
}

const unknown = sandbox.Api.ApiRegistry.dispatch('POST', '/api/legacy-with-api-key', {
  query:{ api_key:'attacker-controlled' },
  body:{ api_key:'attacker-controlled' },
  auth:{ apiKey:'attacker-controlled' }
});
if (unknown.ok || !unknown.error || unknown.error.code !== 'NOT_FOUND') {
  throw new Error('unknown route must fail closed as NOT_FOUND regardless of arbitrary api_key');
}

console.log('PASS  WebApp and Config expose no browser API-key compatibility');
console.log('PASS  every registered non-public route uses verified identity auth');
console.log('PASS  explicit public routes remain narrowly classified');
console.log('PASS  arbitrary api_key cannot authorize an unknown route');
console.log('=== WEB API-KEY RETIREMENT TESTS PASS (4/4) ===');
