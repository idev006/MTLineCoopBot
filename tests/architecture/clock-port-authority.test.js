const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appRoot = path.join(root, 'app');
const allowed = new Set(['app/Ports/ClockPort.js']);

function listJs(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes:true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJs(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const violations = [];
for (const full of listJs(appRoot)) {
  const rel = path.relative(root, full).replace(/\\/g, '/');
  const src = fs.readFileSync(full, 'utf8');
  const hits = [...src.matchAll(/\bnew\s+Date\s*\(\s*\)/g)];
  if (hits.length && !allowed.has(rel)) {
    violations.push({ rel, count:hits.length });
  }
}
if (violations.length) {
  throw new Error('zero-argument new Date() remains outside ClockPort: ' + JSON.stringify(violations));
}

const dataDict = fs.readFileSync(path.join(root, 'app/DataDict.js'), 'utf8');
if (!/function\s+generateDocumentation\s*\(generatedAt\)/.test(dataDict) ||
    !dataDict.includes("DataDict documentation generatedAt is required")) {
  throw new Error('DataDict documentation generation must require caller-supplied time');
}

const clockPort = fs.readFileSync(path.join(root, 'app/Ports/ClockPort.js'), 'utf8');
if (!/systemClock\s*\(\)[\s\S]*now:\s*\(\)\s*=>\s*new Date\s*\(\s*\)/.test(clockPort)) {
  throw new Error('ClockPort.systemClock() must remain the canonical current-time boundary');
}

console.log('repository-wide ClockPort wall-clock authority: PASS');
