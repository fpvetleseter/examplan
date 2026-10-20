// Run AFTER E2E creates the QA accounts. Checks the syllabus columns stay owner-only.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const env=k=>{if(!process.env[k])throw Error(`Missing ${k}`);return process.env[k];};
if(process.env.QA_ALLOW_SIGNUPS!=='yes')throw Error('Disposable test approval required');
const url=env('NEXT_PUBLIC_SUPABASE_URL'),key=env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const client=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const a=client(),b=client(),anon=client();
const authA=await a.auth.signInWithPassword({email:env('QA_EMAIL_A'),password:env('QA_PASSWORD_A')});
const authB=await b.auth.signInWithPassword({email:env('QA_EMAIL_B'),password:env('QA_PASSWORD_B')});
assert.ifError(authA.error);assert.ifError(authB.error);
const secret=`private syllabus ${crypto.randomUUID()}`;
let row;
try{
 const made=await a.from('exams').insert({title:'RLS syllabus test',syllabus_text:secret,syllabus_sessions:[{title:'Session 1: '+secret,shaky:false}],scope_end:1,professor_note:secret}).select('id,syllabus_text').single();
 assert.ifError(made.error);row=made.data;assert.equal(row.syllabus_text,secret);
 const other=await b.from('exams').select('id,syllabus_text,syllabus_sessions,professor_note').eq('id',row.id);assert.ifError(other.error);assert.equal(other.data.length,0,'Other user read the syllabus');
 const search=await b.from('exams').select('id').ilike('syllabus_text',`%${secret}%`);assert.ifError(search.error);assert.equal(search.data.length,0,'Other user matched syllabus text');
 const publicRead=await anon.from('exams').select('syllabus_text').eq('id',row.id);assert(publicRead.error||publicRead.data.length===0,'Anonymous read exposed syllabus');
 const overwrite=await b.from('exams').update({syllabus_text:'overwritten'}).eq('id',row.id).select('id');assert(overwrite.error||overwrite.data.length===0,'Other user changed the syllabus');
 const own=await a.from('exams').select('syllabus_text').eq('id',row.id).single();assert.ifError(own.error);assert.equal(own.data.syllabus_text,secret);
 const tooLong=await a.from('exams').update({syllabus_text:'x'.repeat(100001)}).eq('id',row.id).select('id');assert(tooLong.error,'Oversized syllabus accepted');
 console.log('PASS: syllabus columns are owner-only');
}finally{
 if(row){const cleanup=await a.from('exams').delete().eq('id',row.id).select('id');assert.ifError(cleanup.error);assert.equal(cleanup.data.length,1,'Test row cleanup failed');}
 await a.auth.signOut();await b.auth.signOut();
}
