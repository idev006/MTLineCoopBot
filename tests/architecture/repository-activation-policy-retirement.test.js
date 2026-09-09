const fs = require('fs');
const path = require('path');

const root = process.cwd();
const port = fs.readFileSync(path.join(root, 'app/Ports/MemberRepositoryPort.js'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'app/Data/SheetsMemberRepository.js'), 'utf8');
const sheet = fs.readFileSync(path.join(root, 'app/LineBot/SheetService.js'), 'utf8');
const useCase = fs.readFileSync(path.join(root, 'app/Application/Member/ActivateMemberUseCase.js'), 'utf8');
const legacyTests = fs.readFileSync(path.join(root, 'app/Test.js'), 'utf8');

if (/['"]activateMember['"]/.test(port)) {
  throw new Error('MemberRepositoryPort must not expose legacy activateMember policy operation');
}
for (const [name, src] of [['SheetsMemberRepository', adapter], ['SheetService', sheet]]) {
  for (const pattern of [
    /function\s+activateMember\s*\(/,
    /\bactivateMember\s*,/
  ]) {
    if (pattern.test(src)) throw new Error(name + ' must not implement/export activateMember: ' + pattern);
  }
}
if (/\.activateMember\s*\(/.test(legacyTests)) {
  throw new Error('Test.js must not preserve legacy repository activateMember caller');
}
for (const required of [
  'activationEngine.plan(member, lineUserId, clock.now())',
  'repo.saveActivation(member._rowIndex, planned.activation)'
]) {
  if (!useCase.includes(required)) throw new Error('ActivateMemberUseCase missing canonical activation authority: ' + required);
}
if (!/function\s+saveActivation\s*\(/.test(adapter) || !/function\s+saveActivation\s*\(/.test(sheet)) {
  throw new Error('deterministic saveActivation persistence seam must remain');
}

console.log('repository activation policy retirement: PASS');
