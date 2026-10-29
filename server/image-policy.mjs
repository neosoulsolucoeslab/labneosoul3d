const IMAGE_VISUAL_CHOICES=Object.freeze({object:Object.freeze(['trophy','medal','keychain','display','prototype','decor','symbol','channel-letter']),material:Object.freeze(['pla','petg','abs','tpu']),finish:Object.freeze(['normal','regular','premium'])});
const VISUAL_STYLE_WORDS=Object.freeze({geometric:['geometric','geometrico','geometrica','facetado','facetada'],minimal:['minimalista','minimalist','minimalismo'],organic:['organico','organica','organico','curvo','curva','ondulado','ondulada'],futuristic:['futurista','futuristic','tecnologico','tecnologica'],industrial:['industrial','tecnico','tecnica']});
const VISUAL_FEATURE_WORDS=Object.freeze({star:['estrela','estrelas','star'],spiral:['espiral','helicoidal','torcido','torcida'],hexagon:['hexagono','hexagonal','hexagonos'],facets:['facetado','facetada','facetas','poligonal'],lattice:['vazado','vazada','trelica','reticulado'],relief:['relevo','relevos'],hole:['furo','furos','argola'],slot:['encaixe','encaixes','ranhura','ranhuras'],cup:['taca','copa','copo'],round:['redondo','redonda','circular'],square:['quadrado','quadrada','retangular']});
const VISUAL_COLOR_WORDS=Object.freeze({black:['preto','preta','pretos','pretas','black'],white:['branco','branca','brancos','brancas','white'],green:['verde','verdes','green','lima','limao'],red:['vermelho','vermelha','vermelhos','vermelhas','red'],blue:['azul','azuis','blue'],navy:['marinho','navy'],yellow:['amarelo','amarela','amarelos','amarelas','yellow'],orange:['laranja','orange'],purple:['roxo','roxa','roxo','roxa','purple','lilas'],pink:['rosa','pink'],gray:['cinza','cinzento','cinzenta','grafite','gray','grey'],beige:['bege','beige'],brown:['marrom','castanho','castanha','brown'],gold:['dourado','dourada','gold'],silver:['prata','prateado','prateada','silver'],transparent:['cristal','transparente','translucido','translucida','transparent']});
const TROPHY_DESIGNS=Object.freeze({
 'layered-panel':Object.freeze({title:'Painel vertical em camadas',shape:'tall layered rectangular plaque, slanted top, inset panel, compact low block base'}),
 'angled-panel':Object.freeze({title:'Placa assimétrica de topo inclinado',shape:'asymmetric upright sheet plaque, rounded corners, slanted top, thin border, low base'}),
 'geometric-base':Object.freeze({title:'Painel recortado com base geométrica',shape:'polygonal upright panel with arch cutout, low layered geometric base, attached accents'}),
 'themed-cutout':Object.freeze({title:'Silhueta temática recortada',shape:'flat custom-cut thematic silhouette, layered sheet construction, low rectangular support'}),
 'wide-plaque':Object.freeze({title:'Placa horizontal com base baixa',shape:'landscape sheet plaque, sweeping curved top, small attached accents, low rectangular base'}),
 'clean-plaque':Object.freeze({title:'Placa clean inclinada',shape:'minimal upright rectangular sheet plaque, slight backward tilt, beveled lower edge, discreet foot'})
});
const TROPHY_POLICY='TROPHY POLICY: only custom sheet plaques, layered panels or flat thematic cutouts with low bases. Never cups, chalices, bowls, handles, wreaths, athlete statuettes or tall pedestal columns, even if requested or shown in an input image.';
function inferTrophyDesign(text,size){
 const words=new Set(visualWords(text));
 if(['horizontal','paisagem','largo','larga'].some(w=>words.has(w))||(size&&size.widthCm>size.heightCm*1.3))return 'wide-plaque';
 if(['moto','motocicleta','piloto','silhueta','mascote','recortado','recortada'].some(w=>words.has(w)))return 'themed-cutout';
 if(['arco','portal','hexagonal','estrela','estrelas'].some(w=>words.has(w)))return 'geometric-base';
 if(['led','iluminado','iluminada','neon','assimetrico','assimetrica'].some(w=>words.has(w)))return 'angled-panel';
 if(['madeira','mdf','pinus','camadas','amadeirado'].some(w=>words.has(w)))return 'layered-panel';
 return 'clean-plaque';
}
function visualWords(text){return String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z]+/g)||[];}
function fixedVisualTerms(text,dictionary){const words=new Set(visualWords(text));return Object.entries(dictionary).filter(([,aliases])=>aliases.some(w=>words.has(w))).map(([key])=>key);}
function recognizedVisualColors(text){
 const colors=fixedVisualTerms(text,VISUAL_COLOR_WORDS);
 const normalized=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/\bazul\s+(?:escuro|marinho)\b/.test(normalized)){return [...new Set([...colors.filter(c=>c!=='blue'),'navy'])];}
 return colors;
}
function readVisualColors(text){
 const colors=recognizedVisualColors(text);
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
const COMPOSITION_MATERIALS=Object.freeze({print:'impressão 3D',acrylic:'acrílico',mdf:'MDF',pine:'pinus',wood:'madeira',pvc:'PVC expandido',acm:'ACM'});
const COMPOSITION_ROLES=Object.freeze({main:'corpo principal',base:'base',details:'detalhes',star:'estrela',top:'topo',frame:'moldura',panel:'painel',letters:'letras',support:'suporte'});
function readVisualComposition(text){
 const normalized=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(?:aplicad[oa]s?|fixad[oa]s?|colad[oa]s?|pres[oa]s?)\s+(?:no|na|ao|a)\s+(?:corpo|base|trofeu|painel)\b/g,'');
 const materialRules=[['acrylic',/\bacrilic[oa]s?\b/],['mdf',/\bmdf\b/],['pine',/\b(?:pinus|pinho)\b/],['wood',/\bmadeira\b/],['pvc',/\bpvc\b/],['acm',/\bacm\b/],['print',/\b(?:3\s*d|filamento|pla|petg|abs|tpu|impress[ao]{1,2})\b/]];
 const roleRules=[['base',/\bbase\b/],['star',/\bestrelas?\b/],['details',/\b(?:detalhes?|apliques?|relevos?)\b/],['top',/\btopo\b/],['frame',/\bmoldura\b/],['panel',/\b(?:painel|placa)\b/],['letters',/\bletras?\b/],['support',/\bsuporte\b/],['main',/\b(?:corpo|principal)\b/]];
 const chunks=normalized.split(/[,;\n]|\b(?:com|e)\b|(?=\b(?:base|estrela|detalhes?|apliques?|topo|moldura|painel|placa|letras?|suporte|corpo)\b)/).filter(c=>c.trim());
 const parts=[];let previous='print';
 for(const chunk of chunks){
  if(/\b(?:sem|nao)\b/.test(chunk))continue;
  const role=roleRules.find(([,r])=>r.test(chunk))?.[0];
  const material=materialRules.find(([,r])=>r.test(chunk))?.[0];
  if(!role&&!material)continue;
  const chosen=material||previous;previous=chosen;
  const thickness=chunk.match(/\b(\d+(?:[.,]\d+)?)\s*mm\b/);
  const mm=thickness?Number(thickness[1].replace(',','.')):null;
  const thicknessMm=chosen!=='print'&&mm>=.5&&mm<=100?mm:null;
  const color=[...new Set([...recognizedVisualColors(chunk),...(chunk.match(/#[a-f0-9]{6}\b|#[a-f0-9]{3}\b/g)||[]).map(c=>c.toUpperCase())])].slice(0,6);
  const part={role:role||(parts.length?'details':'main'),material:chosen,thicknessMm,color};
  const existing=parts.findIndex(p=>p.role===part.role);
  if(existing>=0)parts[existing]=part;else parts.push(part);
 }
 if(!parts.some(p=>p.role==='main'))parts.unshift({role:'main',material:'print',thicknessMm:null,color:[]});
 return {parts:parts.sort((a,b)=>Number(b.role==='main')-Number(a.role==='main')).slice(0,6)};
}
function validateVisualComposition(value){
 if(!value||typeof value!=='object'||Reflect.ownKeys(value).length!==1||!Array.isArray(value.parts)||value.parts.length<1||value.parts.length>6)throw Error('Composição visual inválida.');
 for(const p of value.parts){
  if(!p||typeof p!=='object'||Reflect.ownKeys(p).length!==4||!['role','material','thicknessMm','color'].every(k=>Object.hasOwn(p,k))||!Object.hasOwn(COMPOSITION_ROLES,p.role)||!Object.hasOwn(COMPOSITION_MATERIALS,p.material)||!(p.thicknessMm===null||(typeof p.thicknessMm==='number'&&Number.isFinite(p.thicknessMm)&&p.thicknessMm>=.5&&p.thicknessMm<=100))||!Array.isArray(p.color)||p.color.length>6||p.color.some(c=>typeof c!=='string'||(!Object.hasOwn(VISUAL_COLOR_WORDS,c)&&!/^#[A-F0-9]{3}(?:[A-F0-9]{3})?$/.test(c))))throw Error('Partes ou materiais não permitidos na imagem.');
 }
 return value;
}
function validateVisualSpec(spec){
 const fields=['object','material','color','size','finish','design'];if(Object.hasOwn(spec||{},'composition'))fields.push('composition');if(Object.hasOwn(spec||{},'trophyDesign'))fields.push('trophyDesign');
 if(!spec||typeof spec!=='object'||Array.isArray(spec)||Reflect.ownKeys(spec).length!==fields.length||fields.some(k=>!Object.hasOwn(spec,k)))throw Error('A solicitação de imagem contém dados não permitidos.');
 for(const k of ['object','material','finish'])if(!IMAGE_VISUAL_CHOICES[k].includes(spec[k]))throw Error('Opção visual inválida.');
 if(!Array.isArray(spec.color)||spec.color.length<1||spec.color.length>6||spec.color.some(c=>typeof c!=='string'||(!Object.hasOwn(VISUAL_COLOR_WORDS,c)&&!/^#[A-F0-9]{3}(?:[A-F0-9]{3})?$/.test(c))))throw Error('Cores não permitidas na solicitação de imagem.');
 if(!spec.size||typeof spec.size!=='object'||Array.isArray(spec.size)||Object.keys(spec.size).length!==3||['widthCm','heightCm','depthCm'].some(k=>!Object.hasOwn(spec.size,k)||typeof spec.size[k]!=='number'||!Number.isFinite(spec.size[k])||spec.size[k]<.1||spec.size[k]>1000))throw Error('Dimensões não permitidas na solicitação de imagem.');
 if(!spec.design||typeof spec.design!=='object'||Array.isArray(spec.design)||Object.keys(spec.design).length!==2||!['style','features'].every(k=>Object.hasOwn(spec.design,k))||!Object.hasOwn(VISUAL_STYLE_WORDS,spec.design.style)||!Array.isArray(spec.design.features)||spec.design.features.length>5||spec.design.features.some(v=>!Object.hasOwn(VISUAL_FEATURE_WORDS,v)))throw Error('Detalhes visuais não permitidos na solicitação de imagem.');
 if(Object.hasOwn(spec,'composition'))validateVisualComposition(spec.composition);
 if(Object.hasOwn(spec,'trophyDesign')&&(spec.object!=='trophy'||!Object.hasOwn(TROPHY_DESIGNS,spec.trophyDesign)))throw Error('Estilo de troféu não permitido.');
 if(spec.object==='trophy'&&spec.design.features.includes('cup'))throw Error('Troféus seguem apenas a linha de placas e recortes personalizados; taças não são permitidas.');
 return spec;
}
function buildProjectImagePrompt(input,{useReferenceImage=false}={}){
 const s=validateVisualSpec(input),parts=(s.composition||{parts:[{role:'main',material:'print',thicknessMm:null,color:[]}]}).parts;
 const roles={main:'MAIN BODY',base:'BASE',details:'DETAILS',star:'STAR',top:'TOP',frame:'FRAME',panel:'PANEL',letters:'ABSTRACT LETTER SHAPES',support:'SUPPORT'};
 const objects={trophy:'custom freestanding award plaque',medal:'wearable award medal, ribbon slot, no pedestal',keychain:'functional keychain, attachment hole',display:'stable product display',prototype:'functional prototype, coherent joints',decor:'decorative sculpture',symbol:'abstract geometric emblem','channel-letter':'dimensional channel letter sign: one generic uppercase A, deep box-shaped sidewalls and front face, visibly three-dimensional rather than flat lettering'};
 const materials={acrylic:'acrylic sheet: polished edges, clear unless opaque color; solid panel, not empty frame',mdf:'MDF fiberboard, fine fiber edges',pine:'pine wood, pale grain and knots',wood:'natural wood, visible grain',pvc:'expanded PVC, matte sheet',acm:'ACM, metal skins, dark core',print:({pla:'PLA filament, rigid plastic',petg:'PETG filament, slight gloss',abs:'ABS filament, satin plastic',tpu:'TPU filament, flexible matte plastic'})[s.material]};
 const finish={normal:'RAW PRINT: visible layer lines, matte',regular:'CLEANED PRINT: deburred edges, fine layers',premium:'PREMIUM POST-PROCESSED: refined edges, smooth satin plastic'}[s.finish];
 const shape={star:'star motif',spiral:'helical form',hexagon:'hexagonal motif',facets:'polygonal facets',lattice:'open lattice',relief:'raised relief',hole:'attachment hole',slot:'interlocking slot',cup:'cup shape',round:'rounded shapes',square:'rectangular shapes'};
 const size=s.size,ratio=[size.widthCm/size.heightCm,1,size.depthCm/size.heightCm].map(n=>Number(n.toFixed(3))).join(' : ');
 const hasPrint=parts.some(p=>p.material==='print');
 const prompt=[
  ...(s.object==='trophy'?['PERMITTED FORM: '+TROPHY_DESIGNS[s.trophyDesign||inferTrophyDesign('',size)].shape+'.',TROPHY_POLICY]:[]),
  'Photorealistic product. OBJECT: '+objects[s.object]+'. STYLE: '+s.design.style+'.',
  ...(useReferenceImage?['Use attached image as a visual reference within permitted forms; apply client specs. Do not copy source text, logos or watermarks.']:[]),
  'SIZE: width '+size.widthCm+' cm × height '+size.heightCm+' cm × depth '+size.depthCm+' cm. Ratio '+ratio+'.',
  ...parts.map(p=>roles[p.role]+': '+p.material+(p.thicknessMm?', '+p.thicknessMm+' mm sheet':'')+(p.color.length?', color '+p.color.join(' + '):p.material==='print'?', color '+s.color.join(' + '):'')+'.'),
  'SURFACES: '+[...new Set(parts.map(p=>p.material))].map(m=>m+'='+materials[m]).join('; ')+'. FDM layers only on printed parts.',
  hasPrint?'Finish only the printed parts: '+finish+'. Show all specified colors.':'No printed parts requested. Preserve sheet/wood materials.',
  'MOTIFS: '+(s.design.features.map(f=>shape[f]).join(', ')||'original silhouette')+'. Preserve each material assignment.',
  'One complete assembled object, attached parts, no floating elements, 3/4 studio view, contact shadow, neutral backdrop, readable texture. '+(s.object==='channel-letter'?'Only the generic A letter shape; no captions, brand names, logos, company information, people or watermark.':'No text, logos, company information, people or watermark.')
 ].join('\n');
 if(prompt.length>2048)throw Error('As instruções da imagem ultrapassaram o limite do gerador. Reduza os detalhes visuais.');
 return prompt;
}

export {validateVisualSpec,buildProjectImagePrompt,readVisualColors,readVisualSize,readVisualComposition,validateVisualComposition,TROPHY_DESIGNS,TROPHY_POLICY,inferTrophyDesign};
export function prepareOpenAIImageRequest(input){return {model:'gpt-image-2',prompt:buildProjectImagePrompt(input),n:1,size:'1024x1024',quality:'low',output_format:'png'};}
// This file defines the same strict visual-only contract as the browser.
// Do not forward cadastro, free text, names, logos or company data to a provider.
