/** Server-side adapter for the prepared reference bank. No endpoint, credentials, or model calls. */
export const MANIFEST_KEY = 'neo:refs:v1:manifest';
const PREFIX = 'neo:refs:v1:image:';
const OBJECTS = new Set(['special','trophy','medal','keychain','display','prototype','decor','symbol','channel-letter']);
const clean = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const aliases = {
 'chaveiro':/\bchaveir[oa]s?\b/,
 'letra-caixa':/\b(?:letras? caixa|letreiros?|logotipos?)\b/,
 'medalha':/\bmedalhas?\b/,
 'porta-copo':/\bporta[ -]?(?:copos?|latas?)\b/,
 'articulado':/\barticulad[oa]s?\b/,
 'trofeu':/\b(?:trofeus?|premiacao|premiacoes|homenagem|homenagens)\b/
};
export async function readKvManifest(env) {
 if(!env.LIMITES_IA?.get)throw Error('Vincule o namespace KV à variável LIMITES_IA no Worker.');
 const manifest = await env.LIMITES_IA.get(MANIFEST_KEY,'json');
 if(!manifest||manifest.version!==1||manifest.schema!=='neo-soul-reference-bank/kv-v1'||!Array.isArray(manifest.images))throw Error('O manifesto do banco ainda não está disponível no KV.');
 const images=manifest.images.filter(i=>i?.approved===true&&typeof i.key==='string'&&new RegExp('^'+PREFIX+'[a-z0-9-]+$').test(i.key)&&Array.isArray(i.objects)&&i.objects.every(o=>OBJECTS.has(o))&&Array.isArray(i.tags)&&i.tags.every(t=>typeof t==='string'&&t.length<=40)&&typeof i.caption==='string'&&i.caption.length<=180);
 if(!images.length)throw Error('O manifesto não contém referências aprovadas.');
 return {...manifest,images};
}
export function selectKvReferences(manifest,brief) {
 const text=clean([brief.description,brief.materials,brief.printUsage,brief.color].filter(Boolean).join(' '));
 const categories=Object.entries(aliases).filter(([,pattern])=>pattern.test(text)).map(([category])=>category);
 // Object choice prevails. A special project uses explicit category words; no unrelated fallback.
 const object=brief.object||'special';
 const candidates=manifest.images.filter(i=>object==='special'?categories.includes(i.category):i.objects.includes(object));
 const words=new Set(text.match(/[a-z0-9]+/g)||[]);
 return candidates.map((image,index)=>({image,index,score:(categories.includes(image.category)?100:0)+image.tags.reduce((n,tag)=>n+(clean(tag).split(/[ -]+/).every(t=>words.has(t))?5:0),0)})).sort((a,b)=>b.score-a.score||a.index-b.index).slice(0,3).map(x=>x.image);
}
async function sha256(bytes){const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');}
function jpegDimensions(bytes){
 if(bytes[0]!==255||bytes[1]!==216)throw Error('Referência JPEG inválida.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let i=2;
 while(i+8<bytes.length){
  if(bytes[i++]!==255)break;while(bytes[i]===255)i++;const marker=bytes[i++];if(marker===0xda||marker===0xd9)break;
  if(marker===1||(marker>=0xd0&&marker<=0xd8))continue;const size=view.getUint16(i);if(size<2||i+size>bytes.length)break;
  if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return {width:view.getUint16(i+5),height:view.getUint16(i+3)};
  i+=size;
 }
 throw Error('Não foi possível ler as dimensões da referência.');
}
export async function readKvReferenceImages(env,references){
 if(!Array.isArray(references)||!references.length||references.length>3)throw Error('Selecione entre uma e três referências internas compatíveis.');
 const images=[];
 for(const entry of references){
  if(typeof entry.key!=='string'||!new RegExp('^'+PREFIX+'[a-z0-9-]+$').test(entry.key))throw Error('Chave fora do banco de referências.');
  const value=await env.LIMITES_IA.get(entry.key,'json');
  if(!value||value.version!==1||value.id!==entry.id||value.mime!=='image/jpeg'||typeof value.base64!=='string'||value.base64.length>1500000||!/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value.base64))throw Error('Referência ausente ou inválida no KV: '+entry.id);
  const bytes=Uint8Array.from(atob(value.base64),c=>c.charCodeAt(0));const {width,height}=jpegDimensions(bytes);
  if(!width||!height||width>500||height>500||width!==entry.width||height!==entry.height||bytes.length!==entry.bytes||await sha256(bytes)!==entry.sha256)throw Error('A referência não corresponde ao manifesto: '+entry.id);
  images.push(new Blob([bytes],{type:'image/jpeg'}));
 }
 return images;
}
/** Appends actual JPEG pixels, not URLs/captions. FormData may subsequently receive prompt/width/height. */
export async function appendKvReferences(form,env,brief,{logoBlob=null}={}){
 const manifest=await readKvManifest(env);const references=selectKvReferences(manifest,brief);
 if(!references.length)throw Error('Adicione ao banco uma referência aprovada compatível com este projeto.');
 const images=await readKvReferenceImages(env,references);
 images.forEach((blob,index)=>form.append('input_image_'+index,blob,references[index].id+'.jpg'));
 if(logoBlob){
  if(!(logoBlob instanceof Blob)||logoBlob.type!=='image/jpeg')throw Error('Prepare a logo como JPEG com até 500 pixels por lado.');
  const dimensions=jpegDimensions(new Uint8Array(await logoBlob.arrayBuffer()));if(dimensions.width>500||dimensions.height>500)throw Error('Reduza a logo para até 500 pixels por lado.');
  form.append('input_image_'+images.length,logoBlob,'client-logo.jpg');
 }
 return {references,logoIndex:logoBlob?images.length:null,manifest};
}
