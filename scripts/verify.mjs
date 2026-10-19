// Run from project root. Fails closed until real implementation and test config exist.
import {readFileSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const run=(cmd,args)=>{const r=spawnSync(cmd,args,{stdio:'inherit',env:process.env});if(r.error||r.status!==0)process.exit(r.status||1);};
run(process.execPath,['scripts/check-scaffold.mjs']);
if(!existsSync('package.json'))throw Error('App not implemented: package.json missing');
const p=JSON.parse(readFileSync('package.json','utf8'));
for(const s of ['lint','typecheck','test','build','test:e2e','test:rls'])if(!p.scripts?.[s])throw Error(`Missing real npm script ${s}`);
for(const key of ['BASE_URL','QA_EMAIL_A','QA_EMAIL_B','QA_PASSWORD_A','QA_PASSWORD_B','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'])if(!process.env[key])throw Error(`Missing test configuration: ${key}`);
if(process.env.QA_EMAIL_A===process.env.QA_EMAIL_B)throw Error('Need distinct disposable accounts');
if(process.env.QA_ALLOW_SIGNUPS!=='yes')throw Error('Set QA_ALLOW_SIGNUPS=yes only for approved disposable account tests');
for(const s of ['lint','typecheck','test','build','test:e2e','test:rls'])run('npm',['run',s]);
console.log('Automated commands passed. Still required: actual mobile/desktop pixel review, public repo review, classmate evidence and production acceptance. This script does not push or deploy.');
