const fs = require('fs');
const path = require('path');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const appFiles = walk(path.join(process.cwd(), 'app')).filter((file) => file.endsWith('.js'));
const offenders = [];
for (const file of appFiles) {
  const src = fs.readFileSync(file, 'utf8');
  if (/Data\.MemberRepository\b/.test(src)) offenders.push(path.relative(process.cwd(), file));
}

if (offenders.length) {
  throw new Error('Legacy Data.MemberRepository reference(s): ' + offenders.join(', '));
}

const factory = fs.readFileSync(path.join(process.cwd(), 'app/Composition/SystemFactory.js'), 'utf8');
for (const required of [
  'Ports.MemberRepositoryPort.assertImplemented',
  'Data.SheetsMemberRepository',
  'DB_TYPE',
  "type !== 'sheets'"
]) {
  if (!factory.includes(required)) throw new Error('SystemFactory missing canonical repository selection guard: ' + required);
}

if (fs.existsSync(path.join(process.cwd(), 'app/Data/MemberRepository.js'))) {
  throw new Error('Legacy app/Data/MemberRepository.js must remain retired');
}

console.log('member repository factory retirement: PASS');
