const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

const registry = read('app/Api/ApiRegistry.js');
const handlers = read('app/Api/ApiHandlers.js');
const profile = read('app/Application/Member/GetCurrentMemberProfileUseCase.js');
const finance = read('app/Application/Member/GetCurrentMemberFinanceUseCase.js');
const eventHandler = read('app/LineBot/EventHandler.js');

const protectedMemberRoutes = [
  '/api/member/me/profile',
  '/api/member/me/savings',
  '/api/member/me/loans',
  '/api/member/me/dividends',
  '/api/member/me/activate',
  '/api/member/me/renew'
];
const routeLines = registry.split('\n');
for (const route of protectedMemberRoutes) {
  const line = routeLines.find(x => x.includes("path: '" + route + "'"));
  if (!line || !line.includes("auth: 'line-id-token'")) {
    throw new Error(route + ' must remain protected by line-id-token route metadata');
  }
}

for (const required of [
  'const idToken = ctx && ctx.body ? ctx.body.idToken : null;',
  'system.lineIdentity.authenticate({ idToken })',
  'Security.Principal.isAuthenticated(principal)',
  'const { system, principal } = requireLinePrincipal(ctx);',
  'system.getCurrentMemberProfile.execute({ principal })',
  'system.getCurrentMemberFinance.execute({ principal, kind })'
]) {
  if (!handlers.includes(required)) {
    throw new Error('ApiHandlers missing protected Principal/use-case authority: ' + required);
  }
}

for (const forbidden of [
  /ctx\.body\.lineUserId/,
  /body\.lineUserId/,
  /body\[['\"]lineUserId['\"]\]/
]) {
  if (forbidden.test(handlers)) {
    throw new Error('protected API delivery must not use client lineUserId as identity: ' + forbidden);
  }
}

for (const pair of [['profile', profile], ['finance', finance]]) {
  const name = pair[0];
  const src = pair[1];
  for (const required of [
    'authorization.requireAuthenticated(principal)',
    'authorization.requireMemberBinding(principal, principal.memberCode)',
    'access.hasKnownRole(member)'
  ]) {
    if (!src.includes(required)) {
      throw new Error(name + ' use case must own protected authorization/access policy: ' + required);
    }
  }
  if (!src.includes('repo.findByMemberCode(principal.memberCode)')) {
    throw new Error(name + ' use case must resolve member from verified Principal binding');
  }
}

for (const required of [
  "claims:{ lineUserId:String(lineUserId || ''), source:'line-webhook' }",
  'principalFromAuthorizedMember(member, event.source.userId)',
  'getSystem().getCurrentMemberProfile.execute({ principal })',
  'getSystem().getCurrentMemberFinance.execute({ principal, kind:key })'
]) {
  if (!eventHandler.includes(required)) {
    throw new Error('LINE webhook member presentation must use server Principal + canonical use case: ' + required);
  }
}

console.log('protected identity/use-case authority: PASS');
