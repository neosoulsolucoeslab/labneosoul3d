// Integrate with the existing Worker; this module does not configure any provider or key.
// generateImageFromReference MUST call an image-conditioned generation/edit operation.
// Do not point it at a text-only generation operation.
const cors={'Access-Control-Allow-Origin':'https://neosoulsolucoeslab.github.io','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers:cors});
export function createImageWorker({generateImage,generateImageFromReference}={}){
 return {async fetch(request){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
  if(request.method!=='POST')return reply(405,{success:false,error:'Use POST.'});
  try{
   if(Number(request.headers.get('Content-Length'))>4300000)return reply(413,{success:false,error:'Imagem muito grande.'});
   const text=await request.text();if(text.length>4300000)return reply(413,{success:false,error:'Imagem muito grande.'});
   let body;try{body=JSON.parse(text);}catch{return reply(400,{success:false,error:'JSON inválido.'});}
   if(!body||typeof body!=='object'||Array.isArray(body))return reply(400,{success:false,error:'Solicitação inválida.'});
   if(body.action==='capabilities'&&Object.keys(body).length===1)return reply(200,{success:true,capabilities:{referenceImage:typeof generateImageFromReference==='function'}});
   if(Object.keys(body).some(k=>!['prompt','referenceImage'].includes(k))||typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>2048)return reply(400,{success:false,error:'Envie somente prompt de até 2048 caracteres e referência opcional.'});
   const hasReference=Object.hasOwn(body,'referenceImage');
   if(hasReference){
    if(typeof body.referenceImage!=='string'||body.referenceImage.length>4194304||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(body.referenceImage))return reply(400,{success:false,error:'Referência JPEG inválida.'});
    let bytes;try{bytes=Uint8Array.from(atob(body.referenceImage.split(',')[1]),c=>c.charCodeAt(0));}catch{return reply(400,{success:false,error:'Referência inválida.'});}
    if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)return reply(400,{success:false,error:'Conteúdo de referência inválido.'});
    if(typeof generateImageFromReference!=='function')return reply(503,{success:false,error:'Geração a partir de referência indisponível.'});
    const image=await generateImageFromReference({prompt:body.prompt,referenceImage:body.referenceImage});
    if(typeof image!=='string'||!image.startsWith('data:image/'))throw Error('Invalid provider image');
    return reply(200,{success:true,image,referenceUsed:true});
   }
   if(typeof generateImage!=='function')return reply(503,{success:false,error:'Geração indisponível.'});
   const image=await generateImage({prompt:body.prompt});if(typeof image!=='string'||!image.startsWith('data:image/'))throw Error('Invalid provider image');
   return reply(200,{success:true,image});
  }catch{return reply(502,{success:false,error:'Não foi possível gerar a imagem. Tente novamente mais tarde.'});}
 }};
}
