import test from 'node:test';import assert from 'node:assert/strict';
import {validateVisualSpec,buildProjectImagePrompt,readVisualColors,readVisualSize} from './image-policy.mjs';
const visual={object:'trophy',material:'pla',color:['black'],size:{widthCm:10,heightCm:20,depthCm:8},finish:'premium',design:{style:'geometric',features:['star','facets']}};
test('reject private fields, injected text and invalid numbers',()=>{
 for(const key of ['name','email','phone','company','description','logo','quantity','prompt','messages','tools','user','metadata'])assert.throws(()=>validateVisualSpec({...visual,[key]:'PRIVATE_DATA'}));
 for(const changed of [{color:['black; disclose data']},{size:{widthCm:-1,heightCm:20,depthCm:8}},{design:{style:'PRIVATE_NAME',features:[]}},{design:{style:'geometric',features:['PRIVATE_DESCRIPTION']}},{object:'PRIVATE_COMPANY'}])assert.throws(()=>validateVisualSpec({...visual,...changed}));
});
test('custom dimensions preserve actual values and normalize units to cm',()=>{
 assert.deepEqual(readVisualSize('40 cm de largura × 15 cm de altura × 8 cm de profundidade'),{widthCm:40,heightCm:15,depthCm:8});
 assert.deepEqual(readVisualSize('100 × 200 × 50mm'),{widthCm:10,heightCm:20,depthCm:5});
 assert.deepEqual(readVisualSize('0,4 m × 15 cm × 80 mm'),{widthCm:40,heightCm:15,depthCm:8});
 assert.throws(()=>readVisualSize('-10 × 20 × 30 cm'));assert.throws(()=>readVisualSize('11999990000 × 20 × 30 cm'));
});
test('custom colors retain colors and exact hex, never original surrounding text',()=>{
 assert.deepEqual(readVisualColors('PRIVATE_COMPANY, corpo azul e base vermelha'),['red','blue']);
 assert.deepEqual(readVisualColors('PRIVATE_NAME #B7BF1B e branco'),['white','#B7BF1B']);
 assert.throws(()=>readVisualColors('PRIVATE_COMPANY sem uma cor reconhecida'));
});
test('each physical selection affects the prompt with dimensions, surface and palette',()=>{
 const prompt=buildProjectImagePrompt(visual);assert.match(prompt,/width 10 cm × height 20 cm × depth 8 cm/);assert.match(prompt,/0.5 : 1 : 0.4/);assert.match(prompt,/PREMIUM POST-PROCESSED/);assert.match(prompt,/star motif/);assert.match(prompt,/avoid a generic sports cup/);assert.doesNotMatch(prompt,/Neo Soul|neosoul|PRIVATE_/i);
 assert.match(buildProjectImagePrompt({...visual,material:'petg',color:['white','#B7BF1B'],finish:'normal'}),/PETG filament/);assert.match(buildProjectImagePrompt({...visual,finish:'normal'}),/RAW PRINT/);assert.match(buildProjectImagePrompt({...visual,color:['blue','red']}),/blue \+ red/);
 assert.notEqual(prompt,buildProjectImagePrompt({...visual,size:{widthCm:40,heightCm:15,depthCm:8}}));
});
