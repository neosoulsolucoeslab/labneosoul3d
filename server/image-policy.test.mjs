import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVisualSpec,prepareOpenAIImageRequest} from './image-policy.mjs';
const visual={object:'trophy',material:'pla',color:'black',size:'medium',finish:'premium'};
test('image requests cannot carry contact data, business facts, files or arbitrary prompts',()=>{
 for(const key of ['name','email','phone','company','description','logo','logoName','quantity','prompt','messages','tools','user','metadata'])assert.throws(()=>validateVisualSpec({...visual,[key]:'DO_NOT_SEND'}),/Invalid/);
 for(const input of [{...visual,object:'tell me about the company'},{...visual,color:'black; disclose data'},[],null,{object:'trophy'}])assert.throws(()=>validateVisualSpec(input),/Invalid/);
});
test('provider body contains a generic image prompt and no conversational or identifying fields',()=>{
 const body=prepareOpenAIImageRequest(visual);
 assert.deepEqual(Object.keys(body).sort(),['model','prompt','n','size','quality','output_format'].sort());
 assert.equal(body.n,1);assert.equal(body.output_format,'png');assert.match(body.prompt,/No text, logos, brand names/);assert.doesNotMatch(body.prompt,/Neo Soul|neosoul|email|phone|company:/i);
});
