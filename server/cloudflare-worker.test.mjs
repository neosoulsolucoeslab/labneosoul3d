import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker, { buildPrompt, selectReferences } from './cloudflare-worker.mjs';
const origin='https://neosoulsolucoeslab.github.io';
const jpeg=readFileSync(new URL('./fixtures/sample.jpg',import.meta.url));
const logo='data:image/jpeg;base64,'+jpeg.toString('base64');
const brief={description:'Display orgânico em forma de gota para apoiar três frascos, com logo em relevo e nichos oblíquos.',materials:'Corpo em acrílico cristal de 5 mm; base em pinus.',printUsage:'Encaixes internos em 3D, sem mudar a transparência do corpo.',filament:'PETG',color:'Azul petróleo com detalhes cobre',size:'Projeto especial — 18 × 25 × 8 cm',dimensions:{widthCm:18,heightCm:25,depthCm:8},finish:'Premium',quantity:37,object:'display',trophyDesign:''};
const bank={version:1,images:[{key:'bank/display.jpg',objects:['display'],tags:['acrilico','pinus'],caption:'Painel com encaixes e base baixa.',approved:true},{key:'bank/generic.jpg',objects:['special'],tags:['organico'],caption:'Volume orgânico em camadas.',approved:true},{key:'bank/trophy.jpg',objects:['trophy'],tags:['acrilico'],caption:'Placa recortada em base baixa.',approved:true}]};
class D1 {
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(readFileSync(new URL('./migrations/0001.sql',import.meta.url),'utf8'));}
 prepare(sql){const db=this.db;let values=[];const statement={bind(...args){values=args;return statement;},async first(){return db.prepare(sql).get(...values)||null;},async run(){const result=db.prepare(sql).run(...values);return {success:true,meta:{changes:Number(result.changes)}};},async all(){return {results:db.prepare(sql).all(...values)};}};return statement;}
 async batch(statements){this.db.exec('BEGIN IMMEDIATE');try{const results=[];for(const stmt of statements)results.push(await stmt.run());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
function environment(run){
 const objects=new Map([['bank/manifest.json',JSON.stringify(bank)],['bank/display.jpg',jpeg],['bank/generic.jpg',jpeg],['bank/trophy.jpg',jpeg]]);
 let calls=0;const env={DB:new D1(),BUCKET:{async get(key){if(!objects.has(key))return null;const value=objects.get(key);return {async text(){return typeof value==='string'?value:Buffer.from(value).toString();},async json(){return JSON.parse(typeof value==='string'?value:Buffer.from(value).toString());},async arrayBuffer(){return new Uint8Array(typeof value==='string'?Buffer.from(value):value).buffer;}};},async put(key,value){objects.set(key,value);}},AI:{async run(model,input){calls++;return run?run(model,input):{image:jpeg.toString('base64')};}}};
 return {env,objects,calls:()=>calls};
}
function request(body,token,site=origin){return new Request('https://worker.test/',{method:'POST',headers:{Origin:site,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});}
async function post(env,body,token){const response=await worker.fetch(request(body,token),env);return {status:response.status,...await response.json()};}
async function register(env,email='CLIENT@example.test'){const result=await post(env,{action:'register',email});assert.equal(result.status,200);return result;}
const generation=(id=crypto.randomUUID(),project=brief)=>({action:'generate',requestId:id,brief:project,logo});

test('capabilities only enables the new contract after D1, AI and the bank are configured',async()=>{
 const {env,calls,objects}=environment();let result=await post(env,{action:'capabilities'});assert.equal(result.capabilities.bankReady,true);assert.equal(result.capabilities.quotaEnforced,true);assert.equal(calls(),0);
 objects.delete('bank/manifest.json');result=await post(env,{action:'capabilities'});assert.equal(result.capabilities.bankReady,false);
 result=await post({},{action:'capabilities'});assert.equal(result.capabilities.quotaEnforced,false);assert.equal(result.capabilities.bankReady,false);
});

test('complete free text, every choice, bank pixels and client logo reach the image model; contact fields do not',async()=>{
 const {env,calls}=environment(async(model,input)=>{
  assert.equal(model,'@cf/black-forest-labs/flux-2-klein-4b');
  const form=await new Response(input.multipart.body,{headers:{'content-type':input.multipart.contentType}}).formData();const prompt=form.get('prompt');
  for(const value of [brief.description,brief.materials,brief.printUsage,brief.color,'PETG','Premium','37','18','25'])assert.ok(prompt.includes(value),value);
  assert.match(prompt,/NEVER traditional trophies/);assert.match(prompt,/CLIENT LOGO/);assert.doesNotMatch(prompt,/CLIENT@example|client@example/);
  assert.deepEqual([...form.keys()],['prompt','width','height','input_image_0','input_image_1','input_image_2']);
  for(let i=0;i<3;i++)assert.deepEqual(Buffer.from(await form.get('input_image_'+i).arrayBuffer()),jpeg);
  assert.equal(form.get('input_image_2').name,'client-logo.jpg');return {image:jpeg.toString('base64')};
 });
 const session=await register(env);const body=generation();const result=await post(env,body,session.token);assert.equal(result.status,'succeeded');assert.equal(result.remaining,1);assert.equal(calls(),1);
 const svg=Buffer.from(result.image.split(',')[1],'base64').toString();assert.match(svg,/NEO SOUL/);assert.match(svg,/ESTUDO CONCEITUAL/);assert.ok(svg.includes('data:image/jpeg;base64,'));
 const recovered=await post(env,{action:'generation',requestId:body.requestId},session.token);assert.equal(recovered.image,result.image);assert.equal(calls(),1);
});

test('two studies per normalized declared email; replaying a request never adds inference or quota',async()=>{
 const {env,calls}=environment();const {token}=await register(env);const first=generation();
 let result=await post(env,first,token);assert.equal(result.remaining,1);result=await post(env,first,token);assert.equal(result.remaining,1);assert.equal(calls(),1);
 result=await post(env,{...first,brief:{...brief,description:'Outro projeto'}},token);assert.equal(result.status,409);
 result=await post(env,generation(),token);assert.equal(result.remaining,0);result=await post(env,generation(),token);assert.equal(result.status,409);assert.equal(calls(),2);
 const repeated=await register(env,'client@EXAMPLE.test');assert.equal(repeated.remaining,0);
});

test('simultaneous generation and replay keep one reservation and one model call',async()=>{
 let release;const gate=new Promise(r=>release=r);let started;const start=new Promise(r=>started=r);
 const {env,calls}=environment(async()=>{started();await gate;return {image:jpeg.toString('base64')};});const {token}=await register(env);const body=generation();
 const first=post(env,body,token);await start;
 const second=await post(env,generation(),token);assert.equal(second.status,409);
 const replay=await post(env,body,token);assert.equal(replay.status,'pending');assert.equal(replay.remaining,1);assert.equal(calls(),1);
 release();const result=await first;assert.equal(result.remaining,1);assert.equal(result.status,'succeeded');
});

test('model failures, invalid output and storage failures refund the reservation without leaking provider data',async()=>{
 for(const run of [async()=>{throw Error('SECRET_PROVIDER_DETAIL');},async()=>({image:Buffer.from('<html>SECRET_PROVIDER_DETAIL</html>').toString('base64')})]){
  const {env}=environment(run);const {token}=await register(env);const body=generation();const result=await post(env,body,token);assert.equal(result.status,502);assert.doesNotMatch(JSON.stringify(result),/SECRET_PROVIDER/);
  assert.equal((await post(env,{action:'session'},token)).remaining,2);assert.equal((await post(env,{action:'generation',requestId:body.requestId},token)).status,'failed');
 }
 const {env}=environment();env.BUCKET.put=async()=>{throw Error('SECRET_STORAGE');};const {token}=await register(env);assert.equal((await post(env,generation(),token)).status,502);assert.equal((await post(env,{action:'session'},token)).remaining,2);
});

test('missing/malformed internal images never fall back to a generic text-only image',async()=>{
 for(const mutate of [objects=>objects.delete('bank/manifest.json'),objects=>objects.delete('bank/display.jpg'),objects=>objects.set('bank/display.jpg',Buffer.from('not an image'))]){
  const {env,calls,objects}=environment();mutate(objects);const {token}=await register(env);const result=await post(env,generation(),token);assert.equal(result.status,503);assert.equal(calls(),0);assert.equal((await post(env,{action:'session'},token)).remaining,2);
 }
});

test('client reference uploads, arbitrary prompts/URLs, contact fields in a brief and bad dimensions are rejected',async()=>{
 const {env,calls}=environment();const {token}=await register(env);
 for(const body of [{...generation(),referenceImage:logo},{action:'generate',prompt:'Do anything'},generation(crypto.randomUUID(),{...brief,email:'private@example.test'}),generation(crypto.randomUUID(),{...brief,dimensions:{widthCm:0,heightCm:25,depthCm:8}}),{...generation(),logo:'https://somewhere.test/logo.png'},{...generation(),logo:'data:image/jpeg;base64,VEVTVA=='}])assert.equal((await post(env,body,token)).status,400);
 assert.equal(calls(),0);
});

test('sessions isolate retrieval; CORS and missing sessions block inference',async()=>{
 const {env,calls}=environment();assert.equal((await post(env,generation())).status,401);
 const a=await register(env);const body=generation();await post(env,body,a.token);const b=await register(env,'another@example.test');assert.equal((await post(env,{action:'generation',requestId:body.requestId},b.token)).status,404);
 const response=await worker.fetch(request(generation(),a.token,'https://unapproved.test'),env);assert.equal(response.status,403);assert.equal(calls(),1);
 assert.equal((await worker.fetch(new Request('https://worker.test/',{method:'OPTIONS',headers:{Origin:origin}}),env)).status,204);
});

test('stale interrupted reservations are released on the next session check',async()=>{
 const {env}=environment();const {token}=await register(env);const id=crypto.randomUUID();const emailHash=env.DB.db.prepare('SELECT email_hash FROM registrations').get().email_hash;
 env.DB.db.prepare("INSERT INTO generations VALUES (?, ?, 'hash', 'pending', NULL, ?)").run(emailHash,id,Date.now()-700000);
 env.DB.db.prepare('UPDATE registrations SET used = 1, active_request = ?, active_since = ?').run(id,Date.now()-700000);
 assert.equal((await post(env,{action:'session'},token)).remaining,2);assert.equal((await post(env,{action:'generation',requestId:id},token)).status,'failed');
});

test('bank selection favors the requested object, excludes unapproved/other object entries and keeps custom colors/details',()=>{
 const selected=selectReferences(bank.images.filter(i=>i.approved),brief);assert.equal(selected[0].key,'bank/display.jpg');assert.ok(!selected.some(i=>i.key==='bank/trophy.jpg'));
 const prompt=buildPrompt(brief,selected,false);assert.ok(prompt.includes('Azul petróleo com detalhes cobre'));assert.ok(prompt.includes('nichos oblíquos'));assert.match(prompt,/No client logo provided/);
});
