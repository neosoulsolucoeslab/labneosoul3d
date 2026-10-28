import test from 'node:test';import assert from 'node:assert/strict';import{createImageWorker}from './worker-reference-adapter.mjs';
const referenceImage='data:image/jpeg;base64,/9j/2Q==';const output='data:image/png;base64,TEST';const req=body=>new Request('https://example.test/',{method:'POST',body:JSON.stringify(body)});
test('capabilities reflect actual reference handler; never falls back to text-only generation',async()=>{
 let generated=0;const worker=createImageWorker({generateImage:async()=>{generated++;return output;}});
 assert.equal((await(await worker.fetch(req({action:'capabilities'}))).json()).capabilities.referenceImage,false);
 assert.equal((await worker.fetch(req({prompt:'A trophy',referenceImage}))).status,503);assert.equal(generated,0);
});
test('reference operation receives exactly image and compiled prompt, and confirms reference use',async()=>{
 let input;const worker=createImageWorker({generateImageFromReference:async body=>{input=body;return output;}});
 assert.equal((await(await worker.fetch(req({action:'capabilities'}))).json()).capabilities.referenceImage,true);
 const result=await(await worker.fetch(req({prompt:'Acrylic trophy with blue printed star',referenceImage}))).json();assert.deepEqual(input,{prompt:'Acrylic trophy with blue printed star',referenceImage});assert.deepEqual(result,{success:true,image:output,referenceUsed:true});
});
test('rejects unrelated fields, non-image bytes, overlong prompt and malformed JSON',async()=>{
 let called=0;const worker=createImageWorker({generateImageFromReference:async()=>{called++;return output;}});
 for(const body of [{prompt:'x',referenceImage,company:'PRIVATE'},{prompt:'x',referenceImage:'data:image/jpeg;base64,VEVTVA=='},{prompt:'x'.repeat(2049),referenceImage},{prompt:'x',referenceImage:'https://example.com/photo.jpg'},{prompt:'x',referenceImage:null}])assert.equal((await worker.fetch(req(body))).status,400);
 assert.equal(called,0);assert.equal((await worker.fetch(new Request('https://example.test',{method:'POST',body:'{' }))).status,400);
});
test('hides upstream errors and supports text-only mode without a reference',async()=>{
 const worker=createImageWorker({generateImage:async()=>output,generateImageFromReference:async()=>{throw Error('PRIVATE_PROVIDER_ERROR');}});
 assert.deepEqual(await(await worker.fetch(req({prompt:'An award'}))).json(),{success:true,image:output});
 const result=await worker.fetch(req({prompt:'An award',referenceImage}));assert.equal(result.status,502);assert.doesNotMatch(await result.text(),/PRIVATE/);
});
