const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const files = [
  'app/Core/MemberRules.js',
  'app/Core/NoticeRules.js',
  'app/Core/LoanRules.js'
];

const sources = {};
for (const rel of files) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  sources[rel] = src;
  if (/new\s+Date\s*\(\s*\)/.test(src)) {
    throw new Error(rel + ' must not read implicit wall clock with zero-argument new Date()');
  }
}

const sandbox = { Core:{}, Date, Object, Array, String, Number, Math };
vm.createContext(sandbox);
for (const rel of files) {
  vm.runInContext(sources[rel], sandbox, { filename: rel });
}

const active = {
  mem_status:'active',
  mem_role:'member',
  mem_eff_dt:'2026-01-01',
  mem_exp_dt:'2026-12-31'
};

const cases = [
  () => sandbox.Core.MemberRules.isActiveMember(active),
  () => sandbox.Core.MemberRules.hasRole(active, 'member'),
  () => sandbox.Core.MemberRules.getExpiryStatus(active),
  () => sandbox.Core.MemberRules.computeRenewal(active),
  () => sandbox.Core.NoticeRules.getPendingNotices([{status:'published',published_dt:'2026-01-01 00:00:00'}]),
  () => sandbox.Core.LoanRules.getDueLoans([{due_dt:'2026-09-15'}])
];

for (const fn of cases) {
  let rejected = false;
  try { fn(); } catch (e) { rejected = /now is required/.test(String(e.message)); }
  if (!rejected) throw new Error('time-sensitive Core rule must fail explicitly when now is missing');
}

const fixed = new Date(2026, 8, 9, 10, 0, 0);
if (!sandbox.Core.MemberRules.isActiveMember(active, fixed)) throw new Error('explicit MemberRules now path regressed');
if (sandbox.Core.NoticeRules.getPendingNotices([{status:'published',published_dt:'2026-09-10 00:00:00'}], fixed).length !== 0) {
  throw new Error('explicit NoticeRules now path regressed');
}
if (sandbox.Core.LoanRules.getDueLoans([{due_dt:'2026-09-15'}], fixed, 14).length !== 1) {
  throw new Error('explicit LoanRules now path regressed');
}

console.log('functional core time determinism: PASS');
