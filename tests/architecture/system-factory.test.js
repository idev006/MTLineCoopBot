#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', '..');
const memberRulesSrc = fs.readFileSync(
  path.join(root, 'app', 'Core', 'MemberRules.js'),
  'utf8'
);
const clockSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'ClockPort.js'),
  'utf8'
);
const configPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'ConfigPort.js'),
  'utf8'
);
const auditPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'AuditPort.js'),
  'utf8'
);
const auditQueryPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'AuditQueryPort.js'),
  'utf8'
);
const reportQueryPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'ReportQueryPort.js'),
  'utf8'
);
const messagingPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'MessagingPort.js'),
  'utf8'
);
const memberMenuPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'MemberMenuPort.js'),
  'utf8'
);
const lineMessagingSrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Line', 'LineMessagingAdapter.js'),
  'utf8'
);
const lineMemberMenuSrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Line', 'LineMemberMenuAdapter.js'),
  'utf8'
);
const noticeRulesSrc = fs.readFileSync(
  path.join(root, 'app', 'Core', 'NoticeRules.js'),
  'utf8'
);
const loanRulesSrc = fs.readFileSync(
  path.join(root, 'app', 'Core', 'LoanRules.js'),
  'utf8'
);
const expiryUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Scheduled', 'ExpiryScanUseCase.js'),
  'utf8'
);
const noticeUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Scheduled', 'NoticeBroadcastUseCase.js'),
  'utf8'
);
const reminderUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Scheduled', 'LoanReminderUseCase.js'),
  'utf8'
);
const memberAccessSrc = fs.readFileSync(
  path.join(root, 'app', 'Engine', 'MemberAccessEngine.js'),
  'utf8'
);
const principalSrc = fs.readFileSync(
  path.join(root, 'app', 'Security', 'Principal.js'),
  'utf8'
);
const identityPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'IdentityPort.js'),
  'utf8'
);
const authorizationSrc = fs.readFileSync(
  path.join(root, 'app', 'Engine', 'AuthorizationEngine.js'),
  'utf8'
);
const denyIdentitySrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Security', 'DenyAllIdentityAdapter.js'),
  'utf8'
);
const lineIdTokenVerifierPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'IdTokenVerifierPort.js'),
  'utf8'
);
const httpClientPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'HttpClientPort.js'),
  'utf8'
);
const appsScriptHttpSrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Http', 'AppsScriptHttpClientAdapter.js'),
  'utf8'
);
const appsScriptConfigSrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Config', 'AppsScriptConfigAdapter.js'),
  'utf8'
);
const repositoryAuditSrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Audit', 'MemberRepositoryAuditAdapter.js'),
  'utf8'
);
const sheetsAuditQuerySrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Audit', 'SheetsAuditQueryAdapter.js'),
  'utf8'
);
const sheetsReportQuerySrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Report', 'SheetsReportQueryAdapter.js'),
  'utf8'
);
const lineVerifierSrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Security', 'LineIdTokenVerifier.js'),
  'utf8'
);
const lineIdentitySrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Security', 'LineIdentityAdapter.js'),
  'utf8'
);
const memberRepoPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'MemberRepositoryPort.js'),
  'utf8'
);
const profileUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Member', 'GetCurrentMemberProfileUseCase.js'),
  'utf8'
);
const financeUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Member', 'GetCurrentMemberFinanceUseCase.js'),
  'utf8'
);
const activationEngineSrc = fs.readFileSync(
  path.join(root, 'app', 'Engine', 'MemberActivationEngine.js'),
  'utf8'
);
const activateUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Member', 'ActivateMemberUseCase.js'),
  'utf8'
);
const renewUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Member', 'RenewMemberUseCase.js'),
  'utf8'
);
const sessionStorePortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'SessionStorePort.js'),
  'utf8'
);
const sessionTokenPortSrc = fs.readFileSync(
  path.join(root, 'app', 'Ports', 'SessionTokenPort.js'),
  'utf8'
);
const webSessionEngineSrc = fs.readFileSync(
  path.join(root, 'app', 'Engine', 'WebSessionEngine.js'),
  'utf8'
);
const appsScriptSessionTokenSrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Security', 'AppsScriptSessionTokenAdapter.js'),
  'utf8'
);
const appsScriptSessionStoreSrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Security', 'AppsScriptPropertiesSessionStore.js'),
  'utf8'
);
const createWebSessionSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Security', 'CreateWebSessionUseCase.js'),
  'utf8'
);
const exchangeLineForWebSessionSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Security', 'ExchangeLineForWebSessionUseCase.js'),
  'utf8'
);
const verifyWebSessionSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Security', 'VerifyWebSessionUseCase.js'),
  'utf8'
);
const revokeWebSessionSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Security', 'RevokeWebSessionUseCase.js'),
  'utf8'
);
const webSessionIdentitySrc = fs.readFileSync(
  path.join(root, 'app', 'Adapters', 'Security', 'WebSessionIdentityAdapter.js'),
  'utf8'
);
const listWebMembersSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Web', 'ListMembersUseCase.js'),
  'utf8'
);
const getWebMemberDetailSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Web', 'GetMemberDetailUseCase.js'),
  'utf8'
);
const getAdminSettingsSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Web', 'GetAdminSettingsUseCase.js'),
  'utf8'
);
const listStaffAccountsSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Web', 'ListStaffAccountsUseCase.js'),
  'utf8'
);
const getAuditLogSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Web', 'GetAuditLogUseCase.js'),
  'utf8'
);
const getSummaryReportSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Web', 'GetSummaryReportUseCase.js'),
  'utf8'
);
const renewWebMemberSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Web', 'RenewMemberByStaffUseCase.js'),
  'utf8'
);
const loanCalculatorSrc = fs.readFileSync(
  path.join(root, 'app', 'Core', 'LoanCalculator.js'),
  'utf8'
);
const calculateLoanUseCaseSrc = fs.readFileSync(
  path.join(root, 'app', 'Application', 'Finance', 'CalculateLoanUseCase.js'),
  'utf8'
);
const src = fs.readFileSync(
  path.join(root, 'app', 'Composition', 'SystemFactory.js'),
  'utf8'
);

function makeRepo(name) {
  return {
    name,
    findByLineUserId: () => null,
    findByMemberCode: () => null,
    findByActivateCode: () => null,
    activateMember: () => null,
    saveActivation: () => null,
    findSavingsByMember: () => [],
    findLoansByMember: () => [],
    findDividendsByMember: () => [],
    logActivation: () => null,
    listMembers: () => [],
    logExpiry: () => null,
    renewMember: () => null,
    saveRenewal: () => null,
    listNotices: () => [],
    markNoticeSent: () => false,
    listLoans: () => [],
    logReminder: () => null,
    getContent: () => null
  };
}
const fakeRepo = makeRepo('fake-repo');
const fakeClock = { now: () => new Date('2026-09-08T00:00:00Z') };
const fakeConfig = { get: () => ({ mode: 'test' }) };
const fakeAudit = { record: () => ({ ok: true }) };
const fakeAuditQuery = { list: () => [] };
const fakeReportQuery = { snapshot: () => ({members:[],savings:[],loans:[],dividends:[]}) };
const fakeMessaging = { send: () => ({ ok: true }) };
const fakeMemberMenu = { revokeMemberMenu: () => ({ ok: true }) };
const fakeApi = { handleRequest: () => ({ ok: true }) };
const fakeIdentity = { authenticate: () => ({ subject: 'test', channel: 'test', roles: [], memberCode: null, claims: {}, authenticated: true }) };
const fakeAuthorization = {
  requireAuthenticated: () => ({ allowed: true }),
  requireRole: () => ({ allowed: true, reason: 'role_match' }),
  requireAnyRole: () => ({ allowed: true, reason: 'role_match' }),
  requireMemberBinding: () => ({ allowed: true, reason: 'member_match' })
};
const fakeLineVerifier = { verify: () => ({ ok: false, error: { code: 'TEST' } }) };
const fakeLineIdentity = { authenticate: () => ({ subject: 'anonymous', channel: 'line', roles: [], memberCode: null, claims: {}, authenticated: false }) };
const fakeSessionStore = {
  save: r => r,
  findByTokenHash: () => null,
  revokeByTokenHash: () => false
};
const fakeSessionTokens = {
  generate: () => 'raw-test-token',
  hash: raw => 'hash:' + String(raw || '')
};
const fakeWebIdentity = { authenticate: () => ({ subject: 'anonymous', channel: 'web', roles: [], memberCode: null, claims: {}, authenticated: false }) };

const sandbox = {
  Composition: {},
  Ports: {},
  Core: {},
  Engine: {},
  Security: {},
  Adapters: {},
  LineBot: { SheetService: { readRowsAsObjects: () => [], getSheet: () => ({}) } },
  Application: {},
  Data: { MemberRepository: { getRepository: () => makeRepo('prod-repo') } },
  Config: { get: () => ({ mode: 'prod' }) },
  Api: { ApiService: { handleRequest: () => ({ ok: true, source: 'prod' }) } },
  UrlFetchApp: { fetch: () => ({ getResponseCode: () => 401, getContentText: () => '{}' }) },
  encodeURIComponent,
  JSON,
  String,
  Date,
  Object
};

vm.createContext(sandbox);
vm.runInContext(memberRulesSrc, sandbox, { filename: 'MemberRules.js' });
vm.runInContext(clockSrc, sandbox, { filename: 'ClockPort.js' });
vm.runInContext(configPortSrc, sandbox, { filename: 'ConfigPort.js' });
vm.runInContext(auditPortSrc, sandbox, { filename: 'AuditPort.js' });
vm.runInContext(auditQueryPortSrc, sandbox, { filename: 'AuditQueryPort.js' });
vm.runInContext(reportQueryPortSrc, sandbox, { filename: 'ReportQueryPort.js' });
vm.runInContext(messagingPortSrc, sandbox, { filename: 'MessagingPort.js' });
vm.runInContext(memberMenuPortSrc, sandbox, { filename: 'MemberMenuPort.js' });
vm.runInContext(sessionStorePortSrc, sandbox, { filename: 'SessionStorePort.js' });
vm.runInContext(sessionTokenPortSrc, sandbox, { filename: 'SessionTokenPort.js' });
vm.runInContext(noticeRulesSrc, sandbox, { filename: 'NoticeRules.js' });
vm.runInContext(loanRulesSrc, sandbox, { filename: 'LoanRules.js' });
vm.runInContext(memberAccessSrc, sandbox, { filename: 'MemberAccessEngine.js' });
vm.runInContext(activationEngineSrc, sandbox, { filename: 'MemberActivationEngine.js' });
vm.runInContext(principalSrc, sandbox, { filename: 'Principal.js' });
vm.runInContext(identityPortSrc, sandbox, { filename: 'IdentityPort.js' });
vm.runInContext(httpClientPortSrc, sandbox, { filename: 'HttpClientPort.js' });
vm.runInContext(lineIdTokenVerifierPortSrc, sandbox, { filename: 'IdTokenVerifierPort.js' });
vm.runInContext(memberRepoPortSrc, sandbox, { filename: 'MemberRepositoryPort.js' });
vm.runInContext(authorizationSrc, sandbox, { filename: 'AuthorizationEngine.js' });
vm.runInContext(webSessionEngineSrc, sandbox, { filename: 'WebSessionEngine.js' });
vm.runInContext(appsScriptHttpSrc, sandbox, { filename: 'AppsScriptHttpClientAdapter.js' });
vm.runInContext(appsScriptConfigSrc, sandbox, { filename: 'AppsScriptConfigAdapter.js' });
vm.runInContext(repositoryAuditSrc, sandbox, { filename: 'MemberRepositoryAuditAdapter.js' });
vm.runInContext(sheetsAuditQuerySrc, sandbox, { filename: 'SheetsAuditQueryAdapter.js' });
vm.runInContext(sheetsReportQuerySrc, sandbox, { filename: 'SheetsReportQueryAdapter.js' });
vm.runInContext(lineMessagingSrc, sandbox, { filename: 'LineMessagingAdapter.js' });
vm.runInContext(lineMemberMenuSrc, sandbox, { filename: 'LineMemberMenuAdapter.js' });
vm.runInContext(denyIdentitySrc, sandbox, { filename: 'DenyAllIdentityAdapter.js' });
vm.runInContext(lineVerifierSrc, sandbox, { filename: 'LineIdTokenVerifier.js' });
vm.runInContext(lineIdentitySrc, sandbox, { filename: 'LineIdentityAdapter.js' });
vm.runInContext(appsScriptSessionTokenSrc, sandbox, { filename: 'AppsScriptSessionTokenAdapter.js' });
vm.runInContext(appsScriptSessionStoreSrc, sandbox, { filename: 'AppsScriptPropertiesSessionStore.js' });
vm.runInContext(profileUseCaseSrc, sandbox, { filename: 'GetCurrentMemberProfileUseCase.js' });
vm.runInContext(financeUseCaseSrc, sandbox, { filename: 'GetCurrentMemberFinanceUseCase.js' });
vm.runInContext(activateUseCaseSrc, sandbox, { filename: 'ActivateMemberUseCase.js' });
vm.runInContext(renewUseCaseSrc, sandbox, { filename: 'RenewMemberUseCase.js' });
vm.runInContext(expiryUseCaseSrc, sandbox, { filename: 'ExpiryScanUseCase.js' });
vm.runInContext(noticeUseCaseSrc, sandbox, { filename: 'NoticeBroadcastUseCase.js' });
vm.runInContext(reminderUseCaseSrc, sandbox, { filename: 'LoanReminderUseCase.js' });
vm.runInContext(loanCalculatorSrc, sandbox, { filename: 'LoanCalculator.js' });
vm.runInContext(calculateLoanUseCaseSrc, sandbox, { filename: 'CalculateLoanUseCase.js' });
vm.runInContext(getAdminSettingsSrc, sandbox, { filename: 'GetAdminSettingsUseCase.js' });
vm.runInContext(listStaffAccountsSrc, sandbox, { filename: 'ListStaffAccountsUseCase.js' });
vm.runInContext(getAuditLogSrc, sandbox, { filename: 'GetAuditLogUseCase.js' });
vm.runInContext(getSummaryReportSrc, sandbox, { filename: 'GetSummaryReportUseCase.js' });
vm.runInContext(renewWebMemberSrc, sandbox, { filename: 'RenewMemberByStaffUseCase.js' });
vm.runInContext(createWebSessionSrc, sandbox, { filename: 'CreateWebSessionUseCase.js' });
vm.runInContext(exchangeLineForWebSessionSrc, sandbox, { filename: 'ExchangeLineForWebSessionUseCase.js' });
vm.runInContext(verifyWebSessionSrc, sandbox, { filename: 'VerifyWebSessionUseCase.js' });
vm.runInContext(revokeWebSessionSrc, sandbox, { filename: 'RevokeWebSessionUseCase.js' });
vm.runInContext(webSessionIdentitySrc, sandbox, { filename: 'WebSessionIdentityAdapter.js' });
vm.runInContext(listWebMembersSrc, sandbox, { filename: 'ListMembersUseCase.js' });
vm.runInContext(getWebMemberDetailSrc, sandbox, { filename: 'GetMemberDetailUseCase.js' });
vm.runInContext(src, sandbox, { filename: 'SystemFactory.js' });

const createSystem = sandbox.Composition.SystemFactory.createSystem;

const injected = createSystem({
  memberRepository: fakeRepo,
  clock: fakeClock,
  config: fakeConfig,
  audit: fakeAudit,
  auditQuery: fakeAuditQuery,
  reportQuery: fakeReportQuery,
  messaging: fakeMessaging,
  memberMenu: fakeMemberMenu,
  api: fakeApi,
  identity: fakeIdentity,
  authorization: fakeAuthorization,
  lineIdTokenVerifier: fakeLineVerifier,
  lineIdentity: fakeLineIdentity,
  sessionStore: fakeSessionStore,
  sessionTokens: fakeSessionTokens,
  webIdentity: fakeWebIdentity
});

if (injected.memberRepository !== fakeRepo) throw new Error('memberRepository injection failed');
if (injected.clock !== fakeClock) throw new Error('clock injection failed');
if (injected.config !== fakeConfig) throw new Error('config injection failed');
if (injected.audit !== fakeAudit) throw new Error('audit injection failed');
if (injected.auditQuery !== fakeAuditQuery) throw new Error('auditQuery injection failed');
if (injected.reportQuery !== fakeReportQuery) throw new Error('reportQuery injection failed');
if (injected.messaging !== fakeMessaging) throw new Error('messaging injection failed');
if (injected.memberMenu !== fakeMemberMenu) throw new Error('memberMenu injection failed');
if (injected.api !== fakeApi) throw new Error('api injection failed');
if (injected.identity !== fakeIdentity) throw new Error('identity injection failed');
if (injected.authorization !== fakeAuthorization) throw new Error('authorization injection failed');
if (injected.lineIdTokenVerifier !== fakeLineVerifier) throw new Error('line verifier injection failed');
if (injected.lineIdentity !== fakeLineIdentity) throw new Error('line identity injection failed');
if (injected.sessionStore !== fakeSessionStore) throw new Error('session store injection failed');
if (injected.sessionTokens !== fakeSessionTokens) throw new Error('session token injection failed');
if (injected.webIdentity !== fakeWebIdentity) throw new Error('web identity injection failed');
if (!Object.isFrozen(injected)) throw new Error('system bundle must be immutable');

const defaults = createSystem();
if (defaults.memberRepository.name !== 'prod-repo') throw new Error('default repository wiring failed');
if (defaults.config.get().mode !== 'prod') throw new Error('default config wiring failed');
if (!defaults.audit || typeof defaults.audit.record !== 'function') throw new Error('default audit wiring failed');
if (!defaults.auditQuery || typeof defaults.auditQuery.list !== 'function') throw new Error('default audit-query wiring failed');
if (!defaults.reportQuery || typeof defaults.reportQuery.snapshot !== 'function') throw new Error('default report-query wiring failed');
if (!defaults.messaging || typeof defaults.messaging.send !== 'function') throw new Error('default messaging wiring failed');
if (!defaults.memberMenu || typeof defaults.memberMenu.revokeMemberMenu !== 'function') throw new Error('default member-menu wiring failed');
if (!defaults.clock.now()) throw new Error('default clock wiring failed');
if (!defaults.api.handleRequest().ok) throw new Error('default api wiring failed');
if (defaults.identity.authenticate({ channel: 'line' }).authenticated) throw new Error('default identity must fail closed');
if (!defaults.authorization.requireAuthenticated) throw new Error('default authorization wiring failed');
if (!defaults.lineIdentity || typeof defaults.lineIdentity.authenticate !== 'function') throw new Error('default LINE identity wiring failed');
if (!defaults.lineIdTokenVerifier || typeof defaults.lineIdTokenVerifier.verify !== 'function') throw new Error('default LINE verifier wiring failed');
if (!defaults.sessionStore || typeof defaults.sessionStore.findByTokenHash !== 'function') throw new Error('default session store wiring failed');
if (!defaults.sessionTokens || typeof defaults.sessionTokens.hash !== 'function') throw new Error('default session token wiring failed');
if (!defaults.webIdentity || typeof defaults.webIdentity.authenticate !== 'function') throw new Error('default web identity wiring failed');
if (!defaults.getCurrentMemberProfile || typeof defaults.getCurrentMemberProfile.execute !== 'function') {
  throw new Error('default profile use case wiring failed');
}
if (!defaults.getCurrentMemberFinance || typeof defaults.getCurrentMemberFinance.execute !== 'function') {
  throw new Error('default finance use case wiring failed');
}
if (!defaults.activateMember || typeof defaults.activateMember.execute !== 'function') {
  throw new Error('default activation use case wiring failed');
}
if (!defaults.renewMember || typeof defaults.renewMember.execute !== 'function') {
  throw new Error('default renewal use case wiring failed');
}
if (!defaults.expiryScan || typeof defaults.expiryScan.execute !== 'function') {
  throw new Error('default expiry scan wiring failed');
}
if (!defaults.noticeBroadcast || typeof defaults.noticeBroadcast.execute !== 'function') {
  throw new Error('default notice broadcast wiring failed');
}
if (!defaults.loanReminder || typeof defaults.loanReminder.execute !== 'function') {
  throw new Error('default loan reminder wiring failed');
}
if (!defaults.calculateLoan || typeof defaults.calculateLoan.execute !== 'function') {
  throw new Error('default loan calculation wiring failed');
}
if (!defaults.getAdminSettings || typeof defaults.getAdminSettings.execute !== 'function') {
  throw new Error('default admin settings wiring failed');
}
if (!defaults.listStaffAccounts || typeof defaults.listStaffAccounts.execute !== 'function') {
  throw new Error('default staff accounts wiring failed');
}
if (!defaults.getAuditLog || typeof defaults.getAuditLog.execute !== 'function') {
  throw new Error('default audit-log wiring failed');
}
if (!defaults.getSummaryReport || typeof defaults.getSummaryReport.execute !== 'function') {
  throw new Error('default summary-report wiring failed');
}
if (!defaults.renewWebMember || typeof defaults.renewWebMember.execute !== 'function') {
  throw new Error('default Web member renewal wiring failed');
}
if (!defaults.createWebSession || typeof defaults.createWebSession.execute !== 'function') {
  throw new Error('default create web session wiring failed');
}
if (!defaults.verifyWebSession || typeof defaults.verifyWebSession.execute !== 'function') {
  throw new Error('default verify web session wiring failed');
}
if (!defaults.revokeWebSession || typeof defaults.revokeWebSession.execute !== 'function') {
  throw new Error('default revoke web session wiring failed');
}
if (!defaults.exchangeLineForWebSession || typeof defaults.exchangeLineForWebSession.execute !== 'function') {
  throw new Error('default LINE-to-Web session exchange wiring failed');
}
if (!defaults.listWebMembers || typeof defaults.listWebMembers.execute !== 'function') {
  throw new Error('default Web member list wiring failed');
}
if (!defaults.getWebMemberDetail || typeof defaults.getWebMemberDetail.execute !== 'function') {
  throw new Error('default Web member detail wiring failed');
}

console.log('PASS  SystemFactory explicit dependency wiring');
console.log('PASS  SystemFactory production defaults');
console.log('=== ARCHITECTURE TESTS PASS (2/2) ===');
