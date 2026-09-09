const fs=require('fs');
const path=require('path');

const root=process.cwd();
const appRoot=path.join(root,'app');
const restrictedPrefixes=[
  'app/Core/',
  'app/Application/',
  'app/Engine/',
  'app/Ports/',
  'app/Composition/',
  'app/Data/',
  'app/Security/'
];
const runtimeGlobals=[
  'SpreadsheetApp',
  'UrlFetchApp',
  'PropertiesService',
  'Utilities',
  'ContentService',
  'HtmlService',
  'ScriptApp',
  'DriveApp',
  'MailApp',
  'LockService',
  'CacheService'
];

function listJs(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const full=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...listJs(full));
    else if(entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const violations=[];
for(const full of listJs(appRoot)){
  const rel=path.relative(root,full).replace(/\\/g,'/');
  if(!restrictedPrefixes.some(prefix=>rel.startsWith(prefix))) continue;
  const src=fs.readFileSync(full,'utf8');
  for(const name of runtimeGlobals){
    const pattern=new RegExp('\\b'+name+'\\s*\\.');
    if(pattern.test(src)) violations.push({rel,global:name});
  }
}
if(violations.length){
  throw new Error('Apps Script runtime global leaked into business/composition layer: '+JSON.stringify(violations));
}

const imperativeBoundaries=[
  'app/Adapters/',
  'app/Api/',
  'app/LineBot/',
  'app/RichMenu/',
  'app/WebApp.js',
  'app/Config.js',
  'app/Util.js',
  'app/Dashboard.js',
  'app/SeedData.js',
  'app/Test.js'
];
if(!imperativeBoundaries.length) throw new Error('imperative boundary inventory missing');

console.log('runtime global layer boundary: PASS');
