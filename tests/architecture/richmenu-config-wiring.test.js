const fs = require('fs');
const path = require('path');

const root = process.cwd();
const deployer = fs.readFileSync(path.join(root, 'app/RichMenu/Deployer.js'), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'app/Adapters/Config/AppsScriptConfigAdapter.js'), 'utf8');
const port = fs.readFileSync(path.join(root, 'app/Ports/ConfigPort.js'), 'utf8');
const factory = fs.readFileSync(path.join(root, 'app/Composition/SystemFactory.js'), 'utf8');

if (/\bConfig\.validate\s*\(/.test(deployer)) {
  throw new Error('RichMenu.Deployer must not call global Config.validate() directly');
}
const seamUses = deployer.match(/Composition\.SystemFactory\.createValidatedConfig\s*\(\s*\)\.validate\s*\(\s*\)/g) || [];
if (seamUses.length !== 2) {
  throw new Error('RichMenu.Deployer must use validated composition seam for deploy and testConnection');
}
if (!/validate\s*:\s*function\s*\(\s*\)\s*\{\s*return\s+Config\.validate\s*\(\s*\)/s.test(adapter)) {
  throw new Error('production config adapter must preserve existing Config.validate() semantics');
}
if (!port.includes('function assertValidatable(config)') || !port.includes("requires validate()")) {
  throw new Error('ConfigPort validatable capability missing');
}
if (!factory.includes('function createValidatedConfig(override)') ||
    !factory.includes('Ports.ConfigPort.assertValidatable')) {
  throw new Error('SystemFactory validated config seam missing');
}

console.log('richmenu validated config wiring: PASS');
