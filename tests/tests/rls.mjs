// Requires @supabase/supabase-js installed. Run AFTER E2E creates approved accounts.
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
const aid=authA.data.user.id,bid=authB.data.user.id;assert.notEqual(aid,bid);
let row;
try{
 const made=await a.from('exams').insert({title:'RLS isolated test',user_id:aid}).select().single();assert.ifError(made.error);row=made.data;
 const publicRead=await anon.from('exams').select('id');assert(publicRead.error||publicRead.data.length===0,'Anonymous read exposed rows');
 const publicWrite=await anon.from('exams').insert({title:'must fail',user_id:aid}).select();assert(publicWrite.error,'Anonymous write accepted');
 const other=await b.from('exams').select('id').eq('id',row.id);assert.ifError(other.error);assert.equal(other.data.length,0);
 for(const operation of ['update','delete']){
  const q=operation==='update'?b.from('exams').update({title:'must not change'}):b.from('exams').delete();
  const r=await q.eq('id',row.id).select('id');assert(r.error||r.data.length===0,`Cross-user ${operation} affected row`);
 }
 const unchanged=await a.from('exams').select('title').eq('id',row.id).single();assert.ifError(unchanged.error);assert.equal(unchanged.data.title,'RLS isolated test');
 const forged=await b.from('exams').insert({title:'forged',user_id:aid}).select('id');assert(forged.error,'Forged owner insert accepted');
 const reassigned=await a.from('exams').update({user_id:bid}).eq('id',row.id).select('id');assert(reassigned.error,'Owner reassignment accepted');
 const own=await a.from('exams').update({title:'own update'}).eq('id',row.id).select().single();assert.ifError(own.error);assert.equal(own.data.title,'own update');
 console.log('PASS: direct user-scoped RLS boundary checks');
}finally{
 if(row){const cleanup=await a.from('exams').delete().eq('id',row.id).select('id');assert.ifError(cleanup.error);assert.equal(cleanup.data.length,1,'Test row cleanup failed');}
 await a.auth.signOut();await b.auth.signOut();
}
