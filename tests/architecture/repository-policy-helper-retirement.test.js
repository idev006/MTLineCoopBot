const fs = require('fs');
const path = require('path');

const targets = [
  'app/Data/SheetsMemberRepository.js',
  'app/LineBot/SheetService.js'
];

for (const rel of targets) {
  const src = fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
  for (const forbidden of [
    /function\s+isActiveMember\s*\(/,
    /function\s+hasRole\s*\(/,
    /\bisActiveMember\s*,/,
    /\bhasRole\s*,/,
    /Core\.MemberRules\.isActiveMember/,
    /Core\.MemberRules\.hasRole/
  ]) {
    if (forbidden.test(src)) {
      throw new Error(rel + ' must not own/export member validity or role policy: ' + forbidden);
    }
  }
}

const port = fs.readFileSync(path.join(process.cwd(), 'app/Ports/MemberRepositoryPort.js'), 'utf8');
if (/['"]isActiveMember['"]|['"]hasRole['"]/.test(port)) {
  throw new Error('MemberRepositoryPort must remain persistence-only');
}

const engine = fs.readFileSync(path.join(process.cwd(), 'app/Engine/MemberAccessEngine.js'), 'utf8');
for (const required of ['Core.MemberRules.isActiveMember', 'Core.MemberRules.hasRole', 'Ports.ClockPort.assertImplemented']) {
  if (!engine.includes(required)) throw new Error('MemberAccessEngine missing canonical policy authority: ' + required);
}

console.log('repository policy helper retirement: PASS');
