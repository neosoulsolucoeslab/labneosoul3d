const IMAGE_VISUAL_CHOICES=Object.freeze({object:Object.freeze(['trophy','keychain','display','prototype','decor','symbol']),material:Object.freeze(['pla','petg','abs','tpu']),finish:Object.freeze(['normal','regular','premium'])});
const VISUAL_STYLE_WORDS=Object.freeze({geometric:['geometric','geometrico','geometrica','facetado','facetada'],minimal:['minimalista','minimalist','minimalismo'],organic:['organico','organica','organico','curvo','curva','ondulado','ondulada'],futuristic:['futurista','futuristic','tecnologico','tecnologica'],industrial:['industrial','tecnico','tecnica']});
const VISUAL_FEATURE_WORDS=Object.freeze({star:['estrela','estrelas','star'],spiral:['espiral','helicoidal','torcido','torcida'],hexagon:['hexagono','hexagonal','hexagonos'],facets:['facetado','facetada','facetas','poligonal'],lattice:['vazado','vazada','trelica','reticulado'],relief:['relevo','relevos'],hole:['furo','furos','argola'],slot:['encaixe','encaixes','ranhura','ranhuras'],cup:['taca','copa','copo'],round:['redondo','redonda','circular'],square:['quadrado','quadrada','retangular']});
const VISUAL_COLOR_WORDS=Object.freeze({black:['preto','preta','pretos','pretas','black'],white:['branco','branca','brancos','brancas','white'],green:['verde','verdes','green','lima','limao'],red:['vermelho','vermelha','vermelhos','vermelhas','red'],blue:['azul','azuis','blue'],yellow:['amarelo','amarela','amarelos','amarelas','yellow'],orange:['laranja','orange'],purple:['roxo','roxa','roxo','roxa','purple','lilas'],pink:['rosa','pink'],gray:['cinza','cinzento','cinzenta','grafite','gray','grey'],beige:['bege','beige'],brown:['marrom','castanho','castanha','brown'],gold:['dourado','dourada','gold'],silver:['prata','prateado','prateada','silver'],transparent:['transparente','translucido','translucida','transparent']});
function visualWords(text){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z]+/g)||[];}
function fixedVisualTerms(text,dictionary){const words=new Set(visualWords(text));return Object.entries(dictionary).filter(([,aliases])=>aliases.some(w=>words.has(w))).map(([key])=>key);}
function readVisualColors(text){
 const colors=fixedVisualTerms(text,VISUAL_COLOR_WORDS);
 const hex=String(text||'').match(/#[a-fA-F0-9]{6}\b|#[a-fA-F0-9]{3}\b/g)||[];
 const result=[...new Set([...colors,...hex.map(c=>c.toUpperCase())])].slice(0,6);
 if(!result.length)throw Error('Não reconheci a cor para a imagem. Use nomes de cores ou um código hexadecimal, como #B7BF1B.');
 return result;
}
function readVisualSize(text){
 const raw=String(text||'').toLowerCase().replace(/(\d),(\d)/g,'$1.$2');
 const values=[...raw.matchAll(/\d+(?:\.\d+)?\s*(?:mm|cm|m\b)?/g)];
 if(values.length!==3)throw Error('Informe três medidas para a imagem: largura × altura × profundidade, com unidade cm, mm ou m.');
 if(/(^|[^\d])-\s*\d/.test(raw))throw Error('As medidas devem ser positivas.');
 const units=values.map(m=>m[0].match(/mm|cm|m\b/)?.[0]).filter(Boolean);
 const common=units.length===1?units[0]:'cm';
 const dims=values.map(m=>{const n=parseFloat(m[0]);const u=m[0].match(/mm|cm|m\b/)?.[0]||common;return Math.round(n*(u==='mm'?.1:u==='m'?100:1)*1000)/1000;});
 if(dims.some(n=>!Number.isFinite(n)||n<.1||n>1000))throw Error('Revise as medidas: cada dimensão deve estar entre 0,1 e 1.000 cm.');
 return {widthCm:dims[0],heightCm:dims[1],depthCm:dims[2]};
}
function validateVisualSpec(spec){
 const fields=['object','material','color','size','finish','design'];
 if(!spec||typeof spec!=='object'||Array.isArray(spec)||Reflect.ownKeys(spec).length!==fields.length||fields.some(k=>!Object.hasOwn(spec,k)))throw Error('A solicitação de imagem contém dados não permitidos.');
 for(const k of ['object','material','finish'])if(!IMAGE_VISUAL_CHOICES[k].includes(spec[k]))throw Error('Opção visual inválida.');
 if(!Array.isArray(spec.color)||spec.color.length<1||spec.color.length>6||spec.color.some(c=>typeof c!=='string'||(!Object.hasOwn(VISUAL_COLOR_WORDS,c)&&!/^#[A-F0-9]{3}(?:[A-F0-9]{3})?$/.test(c))))throw Error('Cores não permitidas na solicitação de imagem.');
 if(!spec.size||typeof spec.size!=='object'||Array.isArray(spec.size)||Object.keys(spec.size).length!==3||['widthCm','heightCm','depthCm'].some(k=>!Object.hasOwn(spec.size,k)||typeof spec.size[k]!=='number'||!Number.isFinite(spec.size[k])||spec.size[k]<.1||spec.size[k]>1000))throw Error('Dimensões não permitidas na solicitação de imagem.');
 if(!spec.design||typeof spec.design!=='object'||Array.isArray(spec.design)||Object.keys(spec.design).length!==2||!['style','features'].every(k=>Object.hasOwn(spec.design,k))||!Object.hasOwn(VISUAL_STYLE_WORDS,spec.design.style)||!Array.isArray(spec.design.features)||spec.design.features.length>5||spec.design.features.some(v=>!Object.hasOwn(VISUAL_FEATURE_WORDS,v)))throw Error('Detalhes visuais não permitidos na solicitação de imagem.');
 return spec;
}
function buildProjectImagePrompt(input){
 const spec=validateVisualSpec(input);
 const objects={trophy:'a bespoke sculptural award trophy with a purposeful base and a distinctive designed silhouette; avoid a generic sports cup unless the selected features explicitly request a cup',keychain:'a custom-designed compact keychain with a practical attachment hole and sculpted readable silhouette',display:'a purpose-designed countertop product display stand with credible support surfaces and a stable base',prototype:'an engineered functional product prototype with purposeful interfaces, believable wall thickness, clear joints and mechanically coherent detailing',decor:'a sculptural decorative vase or object with an original coherent form, designed volume and a stable base',symbol:'an abstract three-dimensional geometric emblem with intentional positive and negative space, without any identifiable logo or letters'};
 const materials={pla:'PLA filament: solid opaque thermoplastic with credible subtle FDM layer striations and precise printed edges; never make it look like ceramic or metal',petg:'PETG filament: a durable thermoplastic appearance, slightly glossy surface and subtle fused deposition lines; do not substitute glass or polished metal',abs:'ABS filament: solid technical thermoplastic, robust walls, a satin matte surface and subtle FDM layers; no metal appearance',tpu:'TPU filament: flexible elastomeric plastic with soft matte texture, rounded transitions and credible flexible geometry; avoid a rigid metal-like surface'};
 const finishes={normal:'RAW PRINT finish: clearly visible horizontal layer lines, printed texture, honest support cleanup and a matte unpainted appearance; no polished or painted surface',regular:'CLEANED PRINT finish: removed supports, clean deburred edges and basic surface cleanup; fine FDM layers remain visible, moderately even matte/satin surface',premium:'PREMIUM POST-PROCESSED finish: carefully refined edges and smooth treated surface with controlled satin highlights; retain a believable plastic identity, not chrome, marble or ceramic'};
 const styles={geometric:'a distinctive geometric architectural design with intentional faceted volumes and well-balanced proportions',minimal:'a refined minimalist design using a strong original silhouette and a few deliberate structural details',organic:'an organic flowing design with smooth sculptural transitions and controlled curved volumes',futuristic:'a sophisticated futuristic industrial design with coherent sculptural surfaces and purposeful cutouts',industrial:'a mature technical industrial design with structurally meaningful components and precise interfaces'};
 const features={star:'incorporate a recognizable star motif into the physical geometry',spiral:'include a deliberate spiral or helical form',hexagon:'use hexagonal geometry as a visual motif',facets:'make faceted polygonal surfaces visually distinct',lattice:'include purposeful open lattice or perforated structure',relief:'include physical raised or recessed relief without text or identifiable logos',hole:'include practical through-holes or an attachment eye',slot:'include clearly defined slots or interlocking interfaces',cup:'use a cup or chalice-shaped main body',round:'emphasize circular or rounded geometry',square:'emphasize square or rectangular geometry'};
 const size=spec.size;const ratio=[size.widthCm/size.heightCm,1,size.depthCm/size.heightCm].map(n=>Number(n.toFixed(3))).join(' : ');
 const palette=spec.color.map(c=>c==='green'?'green':c==='gold'?'gold-colored plastic, not metal':c==='silver'?'silver-gray plastic, not metal':c).join(' + ');
 return [
  'Create a highly detailed, professionally art-directed product concept visualization for an FDM 3D-printed object. Follow the visual specifications below rather than producing a generic catalog placeholder.',
  'OBJECT: '+objects[spec.object]+'.',
  'PHYSICAL BOUNDING DIMENSIONS: width '+size.widthCm+' cm × height '+size.heightCm+' cm × depth '+size.depthCm+' cm. Width : height : depth ratio = '+ratio+'. Treat these dimensions as geometric constraints on the main object, not as text to print. Keep its silhouette and depth consistent with those proportions.',
  'MATERIAL: '+materials[spec.material]+'.',
  'EXACT COLOR PALETTE: '+palette+'. '+(spec.color.length>1?'Make every listed color visibly present in separate intentional components, surfaces or accents. Do not render the entire object in a single color.':'Keep the main printed object in this selected color; do not replace it with white or gray.'),
  'SURFACE FINISH: '+finishes[spec.finish]+'.',
  'DESIGN DIRECTION: '+styles[spec.design.style]+'.',
  ...spec.design.features.map(f=>'REQUIRED SHAPE DETAIL: '+features[f]+'.'),
  'Show one complete object in a three-quarter product view so the front, side, thickness and material texture are readable. Use a close product framing with breathing room, a realistic contact shadow, a subtle studio gradient backdrop and controlled side/rim lighting that clearly separates the selected color from the background. Dark objects need edge separation; white objects need visible depth and surface contrast. No cropped object, no flat featureless silhouette.',
  'No text, letters, captions, dimensions written in the image, brand names, logos, identifiable company information, people or watermark. Render only the specified physical product. Branding is applied separately by the application.'
 ].join('\n');
}

export {validateVisualSpec,buildProjectImagePrompt,readVisualColors,readVisualSize};
export function prepareOpenAIImageRequest(input){return {model:'gpt-image-2',prompt:buildProjectImagePrompt(input),n:1,size:'1024x1024',quality:'low',output_format:'png'};}
// This file defines the same strict visual-only contract as the browser.
// Do not forward cadastro, free text, names, logos or company data to a provider.
