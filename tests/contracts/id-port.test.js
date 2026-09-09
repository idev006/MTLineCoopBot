#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const root=path.join(__dirname,'..','..');

const sandbox={
  Ports:{},
  Adapters:{},
  Utilities:{ getUuid:()=> '00000000-0000-4000-8000-000000000001' },
  Object,String
};
vm.createContext(sandbox);
for(const rel of [
  'app/Ports/IdPort.js',
  'app/Adapters/Id/AppsScriptIdAdapter.js'
]){
  vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),sandbox,{filename:rel});
}

const IdPort=sandbox.Ports.IdPort;
const prod=sandbox.Adapters.Id.AppsScriptIdAdapter;
IdPort.assertImplemented(prod);
if(prod.next('LOG')!=='LOG-00000000-0000-4000-8000-000000000001'){
  throw new Error('production ID adapter prefix/UUID mapping failed');
}

let invalid=false;
try{ IdPort.assertImplemented({}); }catch(e){ invalid=/next/.test(String(e.message)); }
if(!invalid) throw new Error('invalid ID adapter must be rejected');

let prefix=false;
try{ prod.next(''); }catch(e){ prefix=/prefix/.test(String(e.message)); }
if(!prefix) throw new Error('empty ID prefix must fail closed');

console.log('PASS  IdPort production adapter + invalid adapter rejection');
console.log('=== ID PORT TESTS PASS (1/1) ===');
