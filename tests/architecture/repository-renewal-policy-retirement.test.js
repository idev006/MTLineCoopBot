const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targets = [
  'app/Ports/MemberRepositoryPort.js',
  'app/Data/SheetsMemberRepository.js',
  'app/LineBot/SheetService.js',
  'app/Adapters/Test/InMemoryMemberRepository.js'
];

for (const rel of targets) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  for (const pattern of [
    /['"]renewMember['"]/,
    /function\s+renewMember\s*\(/,
    /\brenewMember\s*,/
  ]) {
    if (pattern.test(src)) {
      throw new Error(rel + ' must not expose legacy renewMember policy seam: ' + pattern);
    }
  }
}

const selfRenew = fs.readFileSync(path.join(root, 'app/Application/Member/RenewMemberUseCase.js'), 'utf8');
const staffRenew = fs.readFileSync(path.join(root, 'app/Application/Web/RenewMemberByStaffUseCase.js'), 'utf8');

for (const [name, src] of [['self renewal', selfRenew], ['staff renewal', staffRenew]]) {
  for (const required of [
    'Core.MemberRules.computeRenewal(member, now)',
    'repo.saveRenewal(member._rowIndex'
  ]) {
    if (!src.includes(required)) {
      throw new Error(name + ' must retain canonical policy->persistence boundary: ' + required);
    }
  }
}

for (const rel of ['app/Data/SheetsMemberRepository.js','app/LineBot/SheetService.js','app/Adapters/Test/InMemoryMemberRepository.js']) {
  const src = fs.readFileSync(path.join(root, rel), 'utf8');
  if (!/function\s+saveRenewal\s*\(/.test(src)) {
    throw new Error(rel + ' must retain deterministic saveRenewal persistence seam');
  }
}

console.log('repository renewal policy retirement: PASS');
