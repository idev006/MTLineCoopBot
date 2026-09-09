const fs=require('fs');
const path=require('path');

const root=process.cwd();
const docsDir=path.join(root,'app','docs');
const entries=fs.readdirSync(docsDir,{withFileTypes:true});
const substantive=entries
  .filter(e=>e.isFile() && e.name.endsWith('.md') && e.name!=='README.md')
  .map(e=>e.name);
if(substantive.length){
  throw new Error('substantive backend documentation copies are forbidden in app/docs: '+substantive.join(', '));
}

const pointer=fs.readFileSync(path.join(docsDir,'README.md'),'utf8');
for(const required of [
  'idev006/MTP6LineCoopBot',
  'docs/ssot/',
  'Single Source of Truth',
  'legacy pointer'
]){
  if(!pointer.includes(required)){
    throw new Error('app/docs/README.md must remain a canonical SSOT pointer: '+required);
  }
}

const rootReadme=fs.readFileSync(path.join(root,'README.md'),'utf8');
if(!rootReadme.includes('idev006/MTP6LineCoopBot/docs/ssot/')){
  throw new Error('backend README must direct project documentation to canonical SSOT');
}
if(/\.\/app\/docs\/(?:KANBAN|data-dictionary|foundation-readiness|metrics-dashboard-template|use-case-member-activation)\.md/.test(rootReadme)){
  throw new Error('backend README must not link retired substantive app/docs copies');
}

console.log('documentation SSOT boundary: PASS');
