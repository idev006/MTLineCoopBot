const fs = require('fs');
const path = require('path');

const root = process.cwd();
const appRoot = path.join(root, 'app');
const allowedDirectConfigCallers = new Set([
  'app/Adapters/Config/AppsScriptConfigAdapter.js'
]);

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
  if (rel === 'app/Config.js') continue;
  const src = fs.readFileSync(full, 'utf8');
  const directCalls = [
    ...src.matchAll(/\bConfig\.get\s*\(/g),
    ...src.matchAll(/\bConfig\.validate\s*\(/g)
  ];
  if (directCalls.length && !allowedDirectConfigCallers.has(rel)) {
    violations.push({ rel, count:directCalls.length });
  }
}

if (violations.length) {
  throw new Error('direct Config global callers remain outside canonical adapter: ' + JSON.stringify(violations));
}

const adapter = fs.readFileSync(path.join(root, 'app/Adapters/Config/AppsScriptConfigAdapter.js'), 'utf8');
for (const required of ['return Config.get();', 'return Config.validate();']) {
  if (!adapter.includes(required)) {
    throw new Error('canonical AppsScript Config adapter must delegate global Config boundary: ' + required);
  }
}

const factory = fs.readFileSync(path.join(root, 'app/Composition/SystemFactory.js'), 'utf8');
for (const required of [
  'Ports.ConfigPort.assertImplemented',
  'Ports.ConfigPort.assertValidatable'
]) {
  if (!factory.includes(required)) {
    throw new Error('SystemFactory must preserve ConfigPort composition authority: ' + required);
  }
}

console.log('repository-wide ConfigPort authority: PASS');
