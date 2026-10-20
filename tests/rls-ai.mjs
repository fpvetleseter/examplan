// Run AFTER E2E creates the QA accounts. Checks the AI-parse limit table: owner-only, append-only, 5 per hour.
// Uses up QA account A's AI allowance for the next hour; QA accounts are disposable.
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
const aid=authA.data.user.id;
try{
 const before=await a.from('ai_parse_calls').select('id');assert.ifError(before.error);
 const room=5-before.data.length;
 for(let i=0;i<room;i++){const r=await a.from('ai_parse_calls').insert({}).select('id,user_id').single();assert.ifError(r.error);assert.equal(r.data.user_id,aid);}
 const sixth=await a.from('ai_parse_calls').insert({}).select('id');
 assert(sixth.error,'6th call in an hour accepted');assert.equal(sixth.error.code,'P0001');assert.equal(sixth.error.hint,'ai_limit');
 const backdated=await a.from('ai_parse_calls').insert({created_at:'2000-01-01T00:00:00Z'}).select('id');assert(backdated.error,'Backdated call bypassed the limit');
 const mine=await a.from('ai_parse_calls').select('id');assert.ifError(mine.error);assert.equal(mine.data.length,5);
 const del=await a.from('ai_parse_calls').delete().eq('user_id',aid).select('id');assert(del.error||del.data.length===0,'Owner deleted limit rows');
 const upd=await a.from('ai_parse_calls').update({created_at:'2000-01-01T00:00:00Z'}).eq('user_id',aid).select('id');assert(upd.error||upd.data.length===0,'Owner rewrote limit rows');
 const other=await b.from('ai_parse_calls').select('id').eq('user_id',aid);assert.ifError(other.error);assert.equal(other.data.length,0,'Other user read limit rows');
 const forged=await b.from('ai_parse_calls').insert({user_id:aid}).select('id');assert(forged.error,'Forged owner insert accepted');
 const publicRead=await anon.from('ai_parse_calls').select('id');assert(publicRead.error||publicRead.data.length===0,'Anonymous read exposed rows');
 const publicWrite=await anon.from('ai_parse_calls').insert({}).select('id');assert(publicWrite.error,'Anonymous insert accepted');
 const still=await a.from('ai_parse_calls').select('id');assert.ifError(still.error);assert.equal(still.data.length,5);
 console.log('PASS: AI parse limit is owner-only, append-only and capped at 5 per hour');
}finally{
 await a.auth.signOut();await b.auth.signOut();
}
