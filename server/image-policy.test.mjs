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
 const prompt=buildProjectImagePrompt(visual);assert.match(prompt,/width 10 cm × height 20 cm × depth 8 cm/);assert.match(prompt,/0.5 : 1 : 0.4/);assert.match(prompt,/PREMIUM POST-PROCESSED/);assert.match(prompt,/star motif/);assert.match(prompt,/Never cups, chalices/);assert.doesNotMatch(prompt,/Neo Soul|neosoul|PRIVATE_/i);
 assert.match(buildProjectImagePrompt({...visual,material:'petg',color:['white','#B7BF1B'],finish:'normal'}),/PETG filament/);assert.match(buildProjectImagePrompt({...visual,finish:'normal'}),/RAW PRINT/);assert.match(buildProjectImagePrompt({...visual,color:['blue','red']}),/blue \+ red/);
 assert.notEqual(prompt,buildProjectImagePrompt({...visual,size:{widthCm:40,heightCm:15,depthCm:8}}));
});

test('detailed prompts fit the Worker 2048 character limit',()=>{
 for(const object of ['trophy','keychain','display','prototype','decor','symbol'])
 for(const material of ['pla','petg','abs','tpu'])
 for(const finish of ['normal','regular','premium'])
 for(const style of ['geometric','minimal','organic','futuristic','industrial']){
  const prompt=buildProjectImagePrompt({...visual,object,material,finish,color:['gold','silver','#FFFFFF','#B7BF1B','transparent','black'],size:{widthCm:.123,heightCm:999.999,depthCm:888.888},design:{style,features:['relief','hole','slot','lattice','facets']}});
  assert.ok(prompt.length<=2048);assert.match(prompt,/999.999 cm/);assert.match(prompt,/#B7BF1B/);
 }
});
test('description assigns acrylic body, MDF base and printed star without private text',async()=>{
 const {readVisualComposition}=await import('./image-policy.mjs');
 const composition=readVisualComposition('PRIVATE_COMPANY PRIVATE_PHONE: troféu em acrílico 5mm com base em MDF preto 10mm e estrela em 3D dourada');
 assert.deepEqual(composition.parts.map(p=>[p.role,p.material,p.thicknessMm]),[['main','acrylic',5],['base','mdf',10],['star','print',null]]);
 assert.deepEqual(composition.parts[1].color,['black']);assert.deepEqual(composition.parts[2].color,['gold']);
 const prompt=buildProjectImagePrompt({...visual,composition});assert.match(prompt,/MAIN BODY: acrylic, 5 mm sheet/);assert.match(prompt,/BASE: mdf, 10 mm sheet, color black/);assert.match(prompt,/STAR: print, color gold/);assert.match(prompt,/Finish only the printed parts/);assert.doesNotMatch(prompt,/PRIVATE_/);
 const acrylicOnly=buildProjectImagePrompt({...visual,composition:readVisualComposition('Troféu de acrílico 5mm')});assert.match(acrylicOnly,/No printed parts requested/);assert.doesNotMatch(acrylicOnly,/PLA filament/);
 for(const composition of [null,{parts:[{role:'main',material:'PRIVATE_DATA',thicknessMm:null,color:[]}]},{parts:[{role:'main',material:'acrylic',thicknessMm:5,color:[],company:'PRIVATE'}]}])assert.throws(()=>validateVisualSpec({...visual,composition}));
});
test('six mixed material parts remain within the Worker limit',()=>{
 const colors=['gold','silver','#B7BF1B','transparent','white','purple'];
 const composition={parts:['main','base','details','star','top','frame'].map((role,i)=>({role,material:['acrylic','mdf','pine','pvc','acm','print'][i],thicknessMm:99.999,color:colors}))};
 const prompt=buildProjectImagePrompt({...visual,color:colors,composition,size:{widthCm:999.999,heightCm:.123,depthCm:888.888},design:{style:'industrial',features:['star','spiral','hexagon','relief','lattice']}});assert.ok(prompt.length<=2048,prompt.length);
});

test('crystal acrylic, generic wood and dark blue printed star are preserved',async()=>{
 const {readVisualComposition}=await import('./image-policy.mjs');
 const composition=readVisualComposition('Troféu em acrílico cristal com base em madeira; estrela azul escuro em relevo em 3D, aplicada no corpo do troféu');
 assert.equal(composition.parts[0].material,'acrylic');assert.deepEqual(composition.parts[0].color,['transparent']);
 assert.equal(composition.parts[1].material,'wood');assert.equal(composition.parts[2].role,'star');assert.equal(composition.parts[2].material,'print');assert.deepEqual(composition.parts[2].color,['navy']);
 assert.deepEqual(readVisualColors('azul escuro'),['navy']);
 const prompt=buildProjectImagePrompt({...visual,composition});assert.match(prompt,/natural wood/);assert.match(prompt,/STAR: print, color navy/);
});
test('uploaded reference prompt combines an image instruction and structured quiz choices',()=>{
 const prompt=buildProjectImagePrompt(visual,{useReferenceImage:true});assert.match(prompt,/attached image as a visual reference/);assert.match(prompt,/width 10 cm × height 20 cm × depth 8 cm/);assert.match(prompt,/PREMIUM POST-PROCESSED/);assert.match(prompt,/Do not copy source text, logos or watermarks/);assert.doesNotMatch(buildProjectImagePrompt(visual),/attached image/);
 assert.throws(()=>validateVisualSpec({...visual,reference:'PRIVATE_IMAGE_FILENAME'}));
 const colors=['gold','silver','#B7BF1B','transparent','white','purple'];
 const composition={parts:['main','base','details','star','top','frame'].map((role,i)=>({role,material:['acrylic','mdf','pine','pvc','acm','print'][i],thicknessMm:99.999,color:colors}))};
 assert.ok(buildProjectImagePrompt({...visual,color:colors,composition,size:{widthCm:999.999,heightCm:.123,depthCm:888.888},design:{style:'industrial',features:['star','spiral','hexagon','relief','lattice']}},{useReferenceImage:true}).length<=2048);
});
test('trophies are limited to the six approved plaque/cutout designs, without a cup exception',async()=>{
 const {TROPHY_DESIGNS,TROPHY_POLICY,inferTrophyDesign}=await import('./image-policy.mjs');assert.equal(Object.keys(TROPHY_DESIGNS).length,6);
 assert.throws(()=>validateVisualSpec({...visual,trophyDesign:'traditional-cup'}));assert.throws(()=>validateVisualSpec({...visual,object:'medal',trophyDesign:'clean-plaque'}));assert.throws(()=>validateVisualSpec({...visual,design:{style:'geometric',features:['cup']}}));
 for(const [trophyDesign,approved]of Object.entries(TROPHY_DESIGNS))for(const useReferenceImage of [false,true]){
  const prompt=buildProjectImagePrompt({...visual,trophyDesign},{useReferenceImage});assert.ok(prompt.startsWith('PERMITTED FORM: '+approved.shape));assert.ok(prompt.includes(TROPHY_POLICY));assert.match(prompt,/Never cups, chalices, bowls, handles/);assert.match(prompt,/even if requested or shown in an input image/);assert.doesNotMatch(prompt,/unless cup|cup-shaped body|PETRONAS|ISAAC|ICONIC|TOTVS|Smith/i);
 }
 assert.equal(inferTrophyDesign('painel horizontal'), 'wide-plaque');assert.equal(inferTrophyDesign('silhueta de motocicleta'), 'themed-cutout');assert.equal(inferTrophyDesign('arco com estrela'), 'geometric-base');assert.equal(inferTrophyDesign('placa iluminada'), 'angled-panel');assert.equal(inferTrophyDesign('madeira em camadas'), 'layered-panel');assert.equal(inferTrophyDesign('placa simples'), 'clean-plaque');assert.equal(inferTrophyDesign('',{widthCm:30,heightCm:10}),'wide-plaque');
 const colors=['gold','silver','#B7BF1B','transparent','white','purple'];const composition={parts:['main','base','details','star','top','frame'].map((role,i)=>({role,material:['acrylic','mdf','pine','pvc','acm','print'][i],thicknessMm:99.999,color:colors}))};
 for(const trophyDesign of Object.keys(TROPHY_DESIGNS))assert.ok(buildProjectImagePrompt({...visual,trophyDesign,color:colors,composition,size:{widthCm:999.999,heightCm:.123,depthCm:888.888},design:{style:'industrial',features:['star','spiral','hexagon','relief','lattice']}},{useReferenceImage:true}).length<=2048);
 assert.doesNotMatch(buildProjectImagePrompt({...visual,object:'keychain'}),/TROPHY POLICY/);
});
test('Letra Caixa uses channel-letter geometry while preserving quiz materials and dimensions',()=>{
 const spec={...visual,object:'channel-letter',material:'petg',color:['white'],size:{widthCm:20,heightCm:30,depthCm:5}};
 const prompt=buildProjectImagePrompt(spec);assert.match(prompt,/dimensional channel letter sign/);assert.match(prompt,/deep box-shaped sidewalls and front face/);assert.match(prompt,/width 20 cm × height 30 cm × depth 5 cm/);assert.match(prompt,/PETG filament/);assert.match(prompt,/Only the generic A letter shape; no captions/);assert.doesNotMatch(prompt,/TROPHY POLICY|No text,/);assert.ok(prompt.length<=2048);
});
