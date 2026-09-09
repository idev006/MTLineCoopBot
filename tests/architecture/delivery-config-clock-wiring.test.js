const fs = require('fs');
const path = require('path');

const root = process.cwd();
const web = fs.readFileSync(path.join(root, 'app/WebApp.js'), 'utf8');
const api = fs.readFileSync(path.join(root, 'app/Api/ApiHandlers.js'), 'utf8');
const factory = fs.readFileSync(path.join(root, 'app/Composition/SystemFactory.js'), 'utf8');

if (/\bConfig\.get\s*\(/.test(web)) {
  throw new Error('WebApp delivery must not read global Config.get() directly');
}
if (!/Composition\.SystemFactory\.createConfig\s*\(\s*\)\.get\s*\(\s*\)/.test(web)) {
  throw new Error('WebApp webhook must resolve config through narrow composition seam');
}
if (/\bnew\s+Date\s*\(/.test(api) || /\bDate\.now\s*\(/.test(api)) {
  throw new Error('ApiHandlers delivery must not read wall-clock directly');
}
if (!/Composition\.SystemFactory\.createClock\s*\(\s*\)/.test(api)) {
  throw new Error('health delivery must resolve time through narrow composition seam');
}
for (const required of [
  'function createClock(override)',
  'function createConfig(override)',
  'createClock,',
  'createConfig'
]) {
  if (!factory.includes(required)) throw new Error('SystemFactory missing narrow delivery seam: ' + required);
}
if (!factory.includes('Ports.ClockPort.assertImplemented') || !factory.includes('Ports.ConfigPort.assertImplemented')) {
  throw new Error('narrow composition seams must enforce canonical ports');
}

console.log('delivery config/clock wiring retirement: PASS');
