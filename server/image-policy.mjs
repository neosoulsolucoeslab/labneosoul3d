// No cadastro, business facts, arbitrary prompt, logo, free text or identifiers.
export const VISUAL_CHOICES=Object.freeze({
 object:Object.freeze({trophy:'a geometric award trophy',keychain:'a geometric keychain',display:'a countertop product display',prototype:'a functional mechanical prototype',decor:'a sculptural decorative vase',symbol:'an abstract geometric 3D symbol'}),
 material:Object.freeze({pla:'matte PLA filament',petg:'PETG filament',abs:'ABS filament',tpu:'flexible TPU filament'}),
 color:Object.freeze({black:'black',white:'white',multicolor:'a generic combination of black, white and green',neutral:'neutral gray'}),
 size:Object.freeze({small:'small object',medium:'medium object',large:'large object'}),
 finish:Object.freeze({normal:'visible FDM layer lines',regular:'cleaned edges with subtle FDM layer lines',premium:'refined smooth satin finish'})
});
export function validateVisualSpec(input){
 const keys=Object.keys(VISUAL_CHOICES);
 if(!input||typeof input!=='object'||Array.isArray(input)||!([Object.prototype,null].includes(Object.getPrototypeOf(input)))||Reflect.ownKeys(input).length!==keys.length||keys.some(k=>!Object.hasOwn(input,k)||typeof input[k]!=='string'||!Object.hasOwn(VISUAL_CHOICES[k],input[k])))throw new Error('Invalid image-only request');
 return Object.freeze(Object.fromEntries(keys.map(k=>[k,input[k]])));
}
export function prepareOpenAIImageRequest(input){
 const spec=validateVisualSpec(input);
 const prompt=['Photorealistic product study of a single FDM 3D printed object on a plain neutral studio background.','No text, logos, brand names, lettering, labels, watermarks or people.','Render '+VISUAL_CHOICES.object[spec.object]+'.','Material: '+VISUAL_CHOICES.material[spec.material]+'.','Color: '+VISUAL_CHOICES.color[spec.color]+'.','Scale: '+VISUAL_CHOICES.size[spec.size]+'.','Surface: '+VISUAL_CHOICES.finish[spec.finish]+'.'].join(' ');
 return {model:'gpt-image-2',prompt,n:1,size:'1024x1024',quality:'low',output_format:'png'};
}
// This module does not call OpenAI. A production backend must pass only the
// prepared body to POST /v1/images/generations. Never spread a registration,
// user, briefing or request object into that provider request. Never forward
// visitor headers, cookies, file names, logos, IPs or organization knowledge.
// The provider image must be handled as private bytes, with no conversational
// response or raw provider URL returned to the browser. Apply branding using
// application code, independently of the provider prompt.
