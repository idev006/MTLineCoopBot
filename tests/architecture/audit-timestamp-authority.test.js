const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const sheetPath = path.join(root, 'app/LineBot/SheetService.js');
const sheetSrc = fs.readFileSync(sheetPath, 'utf8');
const adapterSrc = fs.readFileSync(path.join(root, 'app/Adapters/Audit/DurableAuditAdapter.js'), 'utf8');
const renewSrc = fs.readFileSync(path.join(root, 'app/Application/Member/RenewMemberUseCase.js'), 'utf8');
const staffRenewSrc = fs.readFileSync(path.join(root, 'app/Application/Web/RenewMemberByStaffUseCase.js'), 'utf8');

for (const forbidden of [
  /activated_dt:\s*DataDict\.formatDateTime\(new Date\(\)\)/,
  /checked_dt:\s*DataDict\.formatDateTime\([^\n]*\|\|\s*new Date\(\)\)/,
  /reminded_dt:\s*DataDict\.formatDateTime\([^\n]*\|\|\s*new Date\(\)\)/,
  /created_dt:\s*DataDict\.formatDateTime\([^\n]*\|\|\s*new Date\(\)\)/
]) {
  if (forbidden.test(sheetSrc)) throw new Error('durable audit persistence must not synthesize audit timestamps: ' + forbidden);
}

for (const required of [
  /activatedDt\s*:\s*e\.occurredAt/,
  /occurredAt\s*:\s*now/
]) {
  if (!required.test(adapterSrc + renewSrc + staffRenewSrc)) {
    throw new Error('audit timestamp propagation missing: ' + required);
  }
}

let spreadsheetTouches = 0;
const sandbox = {
  LineBot: {},
  Logger: { log: () => {} },
  DataDict: {},
  Date,
  Object,
  String
};
Object.defineProperty(sandbox, 'SpreadsheetApp', {
  get() {
    spreadsheetTouches += 1;
    throw new Error('SpreadsheetApp must not be touched for invalid audit events');
  }
});
vm.createContext(sandbox);
vm.runInContext(sheetSrc, sandbox, { filename: 'SheetService.js' });

const cases = [
  ['logActivation', 'Activation audit timestamp is required'],
  ['appendExpiryLog', 'Expiry audit timestamp is required'],
  ['appendReminderLog', 'Reminder audit timestamp is required'],
  ['appendAdminAuditLog', 'Admin audit timestamp is required']
];
for (const [method, expected] of cases) {
  let rejected = false;
  try {
    sandbox.LineBot.SheetService[method]({});
  } catch (e) {
    rejected = String(e.message).includes(expected);
  }
  if (!rejected) throw new Error(method + ' must fail closed when audit timestamp is missing');
}
if (spreadsheetTouches !== 0) {
  throw new Error('missing audit timestamp must be rejected before persistence access');
}

console.log('audit timestamp authority: PASS');
