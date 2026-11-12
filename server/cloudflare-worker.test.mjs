import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createWorker } from './cloudflare-worker.mjs';
const origin='https://neosoulsolucoeslab.github.io';
const jpeg=readFileSync(new URL('./fixtures/sample.jpg',import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const logo='data:image/jpeg;base64,'+jpeg.toString('base64');
const user={name:'Cliente de Teste',email:'CLIENT@example.test',phone:'11999999999',company:'Projeto de teste'};
const brief={description:'Troféu especial orgânico em forma de gota, com logo em relevo e nichos oblíquos.',materials:'Corpo em acrílico cristal de 5 mm; base em pinus.',printUsage:'Encaixes internos em 3D, sem mudar a transparência do corpo.',filament:'PETG',color:'Azul petróleo com detalhes cobre',size:'Projeto especial — 18 × 25 × 8 cm',dimensions:{widthCm:18,heightCm:25,depthCm:8},finish:'Premium',quantity:37,object:'trophy',trophyDesign:''};
class D1 {
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec('PRAGMA foreign_keys=ON');for(const name of ['0001.sql','0002_email_verification_kv.sql'])this.db.exec(readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8'));}
 prepare(sql){const db=this.db;let args=[];const statement={sql,bind(...values){args=values;return statement;},async first(){return db.prepare(sql).get(...args)||null;},async all(){return {results:db.prepare(sql).all(...args)};},runSync(){const result=db.prepare(sql).run(...args);return {success:true,meta:{changes:Number(result.changes)}};},async run(){return statement.runSync();}};return statement;}
 async batch(statements){this.db.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.runSync());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
function setup({aiRun,mailStatus=201,mailError}={}){
 let time=Date.parse('2026-11-12T12:00:00Z'),aiCalls=0;const mail=[],writes=[],deletes=[];const values=new Map();
 const images=Array.from({length:3},(_,i)=>({id:'trofeu-0'+(i+1),key:'neo:refs:v1:image:trofeu-0'+(i+1),category:'trofeu',objects:['trophy'],tags:['acrilico','madeira','organico'],caption:'Painel em camadas com base baixa.',guidance:'Inspirar a construção sem copiar marcas.',approved:true,width:32,height:24,bytes:jpeg.length,sha256:digest(jpeg)}));
 const manifest={version:1,schema:'neo-soul-reference-bank/kv-v1',designRules:{awards:'Projetos especiais; sem taças tradicionais.'},images};values.set('neo:refs:v1:manifest',JSON.stringify(manifest));for(const image of images)values.set(image.key,JSON.stringify({version:1,id:image.id,mime:'image/jpeg',base64:jpeg.toString('base64')}));
 const env={DB:new D1(),LIMITES_IA:{async get(key,type){const value=values.get(key);return value===undefined?null:type==='json'?JSON.parse(value):value;},async put(key,value,options){writes.push({key,value,options});values.set(key,value);},async delete(key){deletes.push(key);values.delete(key);}},AI:{async run(model,input){aiCalls++;return aiRun?aiRun(model,input):{image:jpeg.toString('base64')};}},AUTH_SECRET:'unit-test-only-auth-secret-with-at-least-32-characters',BREVO_API_KEY:'unit-test-mail-key',BREVO_SENDER_EMAIL:'lab@example.test'};
 const worker=createWorker({clock:()=>time,async mailFetch(url,init){mail.push({url,init,body:JSON.parse(init.body)});if(mailError)throw Error('PRIVATE_PROVIDER_DETAIL');return new Response(JSON.stringify({messageId:'test-message-id'}),{status:mailStatus});}});
 async function post(body,token,{site=origin,ip='192.0.2.1'}={}){const response=await worker.fetch(new Request('https://worker.test/',{method:'POST',headers:{Origin:site,'Content-Type':'application/json','CF-Connecting-IP':ip,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}),env);return {httpStatus:response.status,...await response.json()};}
 const lastCode=()=>mail.at(-1).body.htmlContent.match(/>(\d{6})<\/p>/)[1];
 async function verified(email=user.email){const send=await post({action:'send-code',...user,email});assert.equal(send.httpStatus,200,JSON.stringify(send));const result=await post({action:'verify-code',email,code:lastCode()});assert.equal(result.httpStatus,200,JSON.stringify(result));return result;}
 return {env,worker,post,values,mail,writes,deletes,lastCode,verified,aiCalls:()=>aiCalls,now:()=>time,advance:ms=>{time+=ms;}};
}
const generation=(id=crypto.randomUUID(),project=brief)=>({action:'generate',requestId:id,brief:project,logo});

test('capabilities needs migrated D1, mail configuration and existing private KV; no R2 binding',async()=>{
 const s=setup();assert.equal(s.env.BUCKET,undefined);const result=await s.post({action:'capabilities'});assert.equal(result.capabilities.quotaEnforced,true);assert.equal(result.capabilities.emailVerificationReady,true);assert.equal(result.capabilities.bankReady,true);assert.equal(s.aiCalls(),0);assert.equal(s.mail.length,0);
 s.values.delete('neo:refs:v1:manifest');assert.equal((await s.post({action:'capabilities'})).capabilities.bankReady,false);delete s.env.AUTH_SECRET;assert.equal((await s.post({action:'capabilities'})).capabilities.emailVerificationReady,false);
});

test('send-code validates registration and uses Brevo without returning/storing plaintext code or contact details',async()=>{
 const s=setup();const result=await s.post({action:'send-code',...user,name:'Teste <b>&"'});assert.equal(result.httpStatus,200);assert.deepEqual(Object.keys(result).sort(),['expiresIn','httpStatus','retryAfter','success']);assert.match(s.lastCode(),/^\d{6}$/);
 const sent=s.mail[0];assert.equal(sent.url,'https://api.brevo.com/v3/smtp/email');assert.equal(sent.init.headers['api-key'],s.env.BREVO_API_KEY);assert.equal(sent.body.to[0].email,'client@example.test');assert.match(sent.body.htmlContent,/Teste &lt;b&gt;&amp;&quot;/);assert.ok(!sent.body.htmlContent.includes(user.phone));assert.equal(sent.body.textContent,undefined);
 const row=s.env.DB.db.prepare('SELECT * FROM email_challenges').get();assert.equal(row.status,'pending');assert.equal(row.code_mac.length,64);assert.ok(!JSON.stringify(row).includes(s.lastCode()));assert.ok(!JSON.stringify(row).includes('client@example.test'));assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM registrations').get().n,0);
});

test('invalid registration, old automatic register, missing secret and unverified requests never create sessions or call AI',async()=>{
 const s=setup();for(const patch of [{name:' '},{email:'bad'},{phone:'123'},{company:''}])assert.equal((await s.post({action:'send-code',...user,...patch})).httpStatus,400);
 assert.equal((await s.post({action:'register',email:user.email})).httpStatus,410);assert.equal((await s.post(generation())).httpStatus,401);delete s.env.AUTH_SECRET;assert.equal((await s.post({action:'send-code',...user})).httpStatus,503);assert.equal(s.mail.length,0);assert.equal(s.aiCalls(),0);
});

test('six-digit proof is single-use; sessions and the two-study quota are issued only after confirmation',async()=>{
 const s=setup();await s.post({action:'send-code',...user});const code=s.lastCode();assert.equal((await s.post({action:'verify-code',email:user.email,code:'12'})).httpStatus,400);
 const confirmed=await s.post({action:'verify-code',email:user.email,code});assert.equal(confirmed.httpStatus,200);assert.match(confirmed.token,/^[a-f0-9]{64}$/);assert.equal(confirmed.remaining,2);assert.equal((await s.post({action:'verify-code',email:user.email,code})).httpStatus,400);assert.equal((await s.post({action:'session'},confirmed.token)).remaining,2);
 const saved=s.env.DB.db.prepare('SELECT * FROM verified_sessions').get();assert.notEqual(saved.token_hash,confirmed.token);assert.equal(saved.token_hash,digest(confirmed.token));assert.equal(s.env.DB.db.prepare('SELECT code_mac FROM email_challenges').get().code_mac,'');
});

test('expired codes, five failed guesses and replays cannot issue tokens',async()=>{
 const s=setup();await s.post({action:'send-code',...user});const code=s.lastCode();s.advance(600001);assert.equal((await s.post({action:'verify-code',email:user.email,code})).httpStatus,400);
 await s.post({action:'send-code',...user});const correct=s.lastCode();const wrong=correct==='000000'?'000001':'000000';for(let i=0;i<5;i++)assert.equal((await s.post({action:'verify-code',email:user.email,code:wrong})).httpStatus,400);
 assert.equal((await s.post({action:'verify-code',email:user.email,code:correct})).httpStatus,400);assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM verified_sessions').get().n,0);
});

test('resending enforces a cooldown and invalidates the previous challenge; parallel proof only consumes one',async()=>{
 const s=setup();await s.post({action:'send-code',...user});const old=s.env.DB.db.prepare('SELECT challenge_id FROM email_challenges').get().challenge_id;assert.equal((await s.post({action:'send-code',...user})).httpStatus,429);assert.equal(s.mail.length,1);
 s.advance(60001);await s.post({action:'send-code',...user});assert.notEqual(s.env.DB.db.prepare('SELECT challenge_id FROM email_challenges').get().challenge_id,old);
 const body={action:'verify-code',email:user.email,code:s.lastCode()};const results=await Promise.all([s.post(body),s.post(body)]);assert.equal(results.filter(r=>r.httpStatus===200).length,1);assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM verified_sessions').get().n,1);
});

test('D1 limits mail globally, per email and per source; provider failures never verify an account or leak errors',async()=>{
 const s=setup();s.env.EMAIL_DAILY_LIMIT='1';assert.equal((await s.post({action:'send-code',...user})).httpStatus,200);s.advance(60001);assert.equal((await s.post({action:'send-code',...user,email:'second@example.test'})).httpStatus,429);assert.equal(s.mail.length,1);
 for(const options of [{mailStatus:401},{mailStatus:429},{mailError:true}]){const f=setup(options);const result=await f.post({action:'send-code',...user});assert.equal(result.httpStatus,502);assert.doesNotMatch(JSON.stringify(result),/PRIVATE_PROVIDER|unit-test-mail-key/);assert.equal((await f.post({action:'verify-code',email:user.email,code:f.lastCode()})).httpStatus,400);}
});

test('legacy unverified tokens and expired verified sessions are rejected, while reconfirmation preserves an existing count',async()=>{
 const s=setup();const emailHash=digest('client@example.test'),legacy='a'.repeat(64);s.env.DB.db.prepare('INSERT INTO registrations (email_hash, used) VALUES (?,1)').run(emailHash);s.env.DB.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(legacy),emailHash,s.now()+86400000);
 assert.equal((await s.post({action:'session'},legacy)).httpStatus,401);const account=await s.verified();assert.equal(account.remaining,1);s.advance(8*86400000);assert.equal((await s.post({action:'session'},account.token)).httpStatus,401);const renewed=await s.verified('client@EXAMPLE.test');assert.equal(renewed.remaining,1);
});

test('full client fields, three untouched KV references and client logo reach the image model as pixels',async()=>{
 let modelPrompt;const s=setup({async aiRun(model,input){assert.equal(model,'@cf/black-forest-labs/flux-2-klein-4b');const form=await new Response(input.multipart.body,{headers:{'content-type':input.multipart.contentType}}).formData();modelPrompt=form.get('prompt');assert.deepEqual([...form.keys()],['prompt','width','height','input_image_0','input_image_1','input_image_2','input_image_3']);for(let i=0;i<4;i++)assert.deepEqual(Buffer.from(await form.get('input_image_'+i).arrayBuffer()),jpeg);assert.equal(form.get('input_image_3').name,'client-logo.jpg');return {image:jpeg.toString('base64')};}});
 const bankBefore=[...s.values].filter(([key])=>key.startsWith('neo:refs:'));const {token}=await s.verified();const result=await s.post(generation(),token);assert.equal(result.httpStatus,200);assert.equal(result.remaining,1);for(const value of [brief.description,brief.materials,brief.printUsage,brief.filament,brief.color,brief.finish,'37'])assert.ok(modelPrompt.includes(value));assert.match(modelPrompt,/CLIENT LOGO/);assert.doesNotMatch(modelPrompt,/client@example|11999999999|Cliente de Teste/);assert.match(modelPrompt,/NEVER traditional cups/);assert.deepEqual([...s.values].filter(([key])=>key.startsWith('neo:refs:')),bankBefore);
 const svg=Buffer.from(result.image.split(',')[1],'base64').toString();assert.match(svg,/NEO SOUL/);assert.match(svg,/ESTUDO CONCEITUAL/);assert.ok(s.writes.every(x=>x.key.startsWith('neo:studies:v1:')));assert.equal(s.writes[0].options.expirationTtl,30*86400);
});

test('two successful generations per verified address; replay returns saved KV image without another charge or inference',async()=>{
 const s=setup();const {token}=await s.verified();const first=generation();const result=await s.post(first,token);assert.equal(result.remaining,1);const replay=await s.post(first,token);assert.equal(replay.image,result.image);assert.equal(s.aiCalls(),1);
 assert.equal((await s.post({...first,brief:{...brief,description:'Outro projeto'}},token)).httpStatus,409);assert.equal((await s.post(generation(),token)).remaining,0);assert.equal((await s.post(generation(),token)).httpStatus,409);assert.equal(s.aiCalls(),2);
 s.advance(60001);assert.equal((await s.verified('client@example.test')).remaining,0);const session=await s.post({action:'session'},token);assert.equal(session.studies.length,2);assert.ok(session.studies.every(x=>x.requestId&&!('kv_key' in x)));
});

test('parallel requests and pending replays preserve one reservation and one model call',async()=>{
 let release,started;const gate=new Promise(r=>release=r),start=new Promise(r=>started=r);const s=setup({async aiRun(){started();await gate;return {image:jpeg.toString('base64')};}});const {token}=await s.verified();const body=generation();const first=s.post(body,token);await start;
 assert.equal((await s.post(generation(),token)).httpStatus,409);const replay=await s.post(body,token);assert.equal(replay.status,'processing');const poll=await s.post({action:'generation',requestId:body.requestId},token);assert.equal(poll.status,'processing');assert.equal(poll.requestId,body.requestId);assert.equal(poll.remaining,1);assert.equal(s.aiCalls(),1);release();assert.equal((await first).remaining,1);assert.equal((await s.post({action:'generation',requestId:body.requestId},token)).status,'succeeded');
});

test('KV visibility delays do not refund successful D1 counts or start another inference',async()=>{
 const s=setup();const {token}=await s.verified();const get=s.env.LIMITES_IA.get;s.env.LIMITES_IA.get=async(key,type)=>key.startsWith('neo:studies:')?null:get(key,type);
 const body=generation();const result=await s.post(body,token);assert.equal(result.httpStatus,200);assert.equal(result.remaining,1);assert.equal((await s.post({action:'generation',requestId:body.requestId},token)).httpStatus,503);assert.equal((await s.post(body,token)).httpStatus,503);assert.equal(s.aiCalls(),1);assert.equal((await s.post({action:'session'},token)).remaining,1);
 s.env.LIMITES_IA.get=get;assert.equal((await s.post({action:'generation',requestId:body.requestId},token)).image,result.image);
});

test('model/KV errors refund a pending reservation; invalid image output never becomes a successful study',async()=>{
 for(const aiRun of [async()=>{throw Error('PRIVATE_AI_DETAIL');},async()=>({image:Buffer.from('<html>PRIVATE_AI_DETAIL</html>').toString('base64')})]){const s=setup({aiRun});const {token}=await s.verified();const body=generation();const result=await s.post(body,token);assert.equal(result.httpStatus,502);assert.doesNotMatch(JSON.stringify(result),/PRIVATE_AI/);assert.equal((await s.post({action:'session'},token)).remaining,2);assert.equal((await s.post({action:'generation',requestId:body.requestId},token)).status,'failed');}
 const s=setup();const {token}=await s.verified();s.env.LIMITES_IA.put=async()=>{throw Error('PRIVATE_KV_ERROR');};assert.equal((await s.post(generation(),token)).httpStatus,502);assert.equal((await s.post({action:'session'},token)).remaining,2);assert.ok(s.deletes.every(k=>k.startsWith('neo:studies:')));
});

test('missing/corrupt reference images and unrelated objects never consume a generation or fall back to text-only mode',async()=>{
 for(const mode of ['manifest','photo','corrupt','wrong-object']){const s=setup();const {token}=await s.verified();if(mode==='manifest')s.values.delete('neo:refs:v1:manifest');if(mode==='photo')s.values.delete('neo:refs:v1:image:trofeu-01');if(mode==='corrupt')s.values.set('neo:refs:v1:image:trofeu-01',JSON.stringify({version:1,id:'trofeu-01',mime:'image/jpeg',base64:'VEVTVA=='}));const body=generation(undefined,mode==='wrong-object'?{...brief,object:'display'}:brief);assert.equal((await s.post(body,token)).httpStatus,503);assert.equal(s.aiCalls(),0);assert.equal((await s.post({action:'session'},token)).remaining,2);}
});

test('studies remain private to their D1 session; forged KV/session values cannot authorize retrieval',async()=>{
 const s=setup();const a=await s.verified();const body=generation();await s.post(body,a.token);const b=await s.verified('another@example.test');assert.equal((await s.post({action:'generation',requestId:body.requestId},b.token)).httpStatus,404);
 const fake='f'.repeat(64);s.values.set(fake,JSON.stringify({email_hash:digest('client@example.test'),remaining:2}));assert.equal((await s.post({action:'session'},fake)).httpStatus,401);
 const write=s.writes[0];s.values.set(write.key,write.value+'tampered');assert.equal((await s.post({action:'generation',requestId:body.requestId},a.token)).httpStatus,503);assert.equal((await s.post({action:'session'},a.token)).remaining,1);
});

test('bad origins, arbitrary image URLs, customer references, extra PII and invalid sizes are blocked',async()=>{
 const s=setup();const {token}=await s.verified();for(const body of [{...generation(),referenceImage:logo},{...generation(),logo:'https://elsewhere.test/image.jpg'},generation(undefined,{...brief,email:'private@example.test'}),generation(undefined,{...brief,dimensions:{widthCm:0,heightCm:1,depthCm:1}})])assert.equal((await s.post(body,token)).httpStatus,400);
 assert.equal((await s.post(generation(),token,{site:'https://unapproved.test'})).httpStatus,403);assert.equal(s.aiCalls(),0);assert.equal((await s.worker.fetch(new Request('https://worker.test/',{method:'OPTIONS',headers:{Origin:origin}}),s.env)).status,204);
});

test('daily image budget refunds a refused user reservation and avoids another model call',async()=>{
 const s=setup();s.env.GENERATION_DAILY_LIMIT='1';const {token}=await s.verified();assert.equal((await s.post(generation(),token)).remaining,1);assert.equal((await s.post(generation(),token)).httpStatus,429);assert.equal((await s.post({action:'session'},token)).remaining,1);assert.equal(s.aiCalls(),1);
});

test('interrupted reservations expire once in D1; expired downloads never reset the lifetime quota',async()=>{
 const s=setup();const {token}=await s.verified();const emailHash=digest('client@example.test'),id=crypto.randomUUID();s.env.DB.db.prepare("INSERT INTO generations VALUES (?, ?, 'hash', 'pending', NULL, ?)").run(emailHash,id,s.now()-700000);s.env.DB.db.prepare('UPDATE registrations SET used = 1, active_request = ?, active_since = ?').run(id,s.now()-700000);assert.equal((await s.post({action:'session'},token)).remaining,2);assert.equal((await s.post({action:'session'},token)).remaining,2);
 const body=generation();await s.post(body,token);s.advance(31*86400000);const renewed=await s.verified();assert.equal(renewed.remaining,1);assert.equal((await s.post({action:'generation',requestId:body.requestId},renewed.token)).httpStatus,410);assert.equal((await s.post({action:'session'},renewed.token)).remaining,1);
});

test('application storage guard refuses new inference without spending a user generation',async()=>{
 const s=setup();const {token}=await s.verified();const hash=digest('client@example.test'),id=crypto.randomUUID();s.env.DB.db.prepare("INSERT INTO generations VALUES (?, ?, 'hash', 'succeeded', 'legacy', ?)").run(hash,id,s.now());s.env.DB.db.prepare('INSERT INTO study_artifacts VALUES (?,?,?,?,?,?)').run(hash,id,'neo:studies:v1:occupied','hash',512*1024*1024,s.now()+86400000);assert.equal((await s.post(generation(),token)).httpStatus,409);assert.equal(s.aiCalls(),0);assert.equal((await s.post({action:'session'},token)).remaining,2);
});

test('six sends per address/day and twenty per IP/hour are independent D1 limits',async()=>{
 const perEmail=setup();for(let i=0;i<6;i++){assert.equal((await perEmail.post({action:'send-code',...user})).httpStatus,200);perEmail.advance(60001);}assert.equal((await perEmail.post({action:'send-code',...user})).httpStatus,429);assert.equal(perEmail.mail.length,6);
 const perIp=setup();for(let i=0;i<20;i++)assert.equal((await perIp.post({action:'send-code',...user,email:'client'+i+'@example.test'})).httpStatus,200);assert.equal((await perIp.post({action:'send-code',...user,email:'blocked@example.test'})).httpStatus,429);assert.equal(perIp.mail.length,20);assert.equal((await perIp.post({action:'send-code',...user,email:'allowed@example.test'},undefined,{ip:'192.0.2.2'})).httpStatus,200);
});

test('late inference cannot complete or refund a newer reservation after its own lease expires',async()=>{
 let release,started;const gate=new Promise(r=>release=r),start=new Promise(r=>started=r);let count=0;
 const s=setup({async aiRun(){if(++count===1){started();await gate;}return {image:jpeg.toString('base64')};}});const {token}=await s.verified();const oldBody=generation();const old=s.post(oldBody,token);await start;s.advance(600001);assert.equal((await s.post({action:'session'},token)).remaining,2);
 const next=await s.post(generation(),token);assert.equal(next.httpStatus,200);assert.equal(next.remaining,1);release();assert.equal((await old).httpStatus,502);assert.equal((await s.post({action:'session'},token)).remaining,1);assert.equal((await s.post({action:'generation',requestId:oldBody.requestId},token)).status,'failed');assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM study_artifacts').get().n,1);assert.equal(s.values.has(s.deletes[0]),false);
});

test('D1 failure after KV write rolls back the completion, refunds once and removes only the orphan study',async()=>{
 const s=setup();const {token}=await s.verified();const batch=s.env.DB.batch.bind(s.env.DB);s.env.DB.batch=async statements=>{if(statements[0].sql.includes('INSERT INTO study_artifacts'))throw Error('PRIVATE_D1_FAILURE');return batch(statements);};
 const body=generation();const result=await s.post(body,token);assert.equal(result.httpStatus,502);assert.equal((await s.post({action:'session'},token)).remaining,2);assert.equal(s.env.DB.db.prepare('SELECT COUNT(*) n FROM study_artifacts').get().n,0);assert.equal(s.deletes.length,1);assert.ok(s.deletes[0].startsWith('neo:studies:v1:'));assert.equal(s.values.has(s.deletes[0]),false);assert.ok(s.values.has('neo:refs:v1:manifest'));assert.equal(s.aiCalls(),1);
});
