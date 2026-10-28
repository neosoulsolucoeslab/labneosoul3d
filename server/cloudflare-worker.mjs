// Cole este arquivo inteiro no Worker gerador-imagens-ia e publique.
// Usa o vínculo AI já existente. Não requer chave no site.
// Referência: https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/
const SITE_ORIGIN = 'https://neosoulsolucoeslab.github.io';
const TEXT_MODEL = '@cf/black-forest-labs/flux-1-schnell';
const REFERENCE_MODEL = '@cf/black-forest-labs/flux-2-klein-4b';
const MAX_BODY_BYTES = 4300000;
const MAX_REFERENCE_CHARACTERS = 4194304;
const corsHeaders = {
  'Access-Control-Allow-Origin': SITE_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  'Vary': 'Origin'
};
function json(body, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}
function invalid(message, status = 400) {
  const error = new Error(message);
  error.httpStatus = status;
  return error;
}
async function readBody(request) {
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) {
    throw invalid('A imagem enviada é muito grande.', 413);
  }
  if (!request.body) throw invalid('Envie uma solicitação JSON.');
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw invalid('A imagem enviada é muito grande.', 413);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  let body;
  try { body = JSON.parse(text); }
  catch { throw invalid('Envie um JSON válido.'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalid('Solicitação inválida.');
  }
  return body;
}
function jpegSize(bytes) {
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216) {
    throw invalid('A referência deve ser uma imagem JPEG válida.');
  }
  const sof = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let i = 2;
  while (i + 1 < bytes.length) {
    if (bytes[i++] !== 255) throw invalid('Referência JPEG inválida.');
    while (i < bytes.length && bytes[i] === 255) i++;
    const marker = bytes[i++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (i + 1 >= bytes.length) break;
    const length = (bytes[i] << 8) | bytes[i + 1];
    if (length < 2 || i + length > bytes.length) break;
    if (sof.has(marker)) {
      if (length < 8) break;
      return { height: (bytes[i + 3] << 8) | bytes[i + 4], width: (bytes[i + 5] << 8) | bytes[i + 6] };
    }
    i += length;
  }
  throw invalid('Não foi possível ler as dimensões da referência.');
}
function referenceBlob(data) {
  if (typeof data !== 'string' || data.length > MAX_REFERENCE_CHARACTERS ||
      !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw invalid('Envie a referência JPEG preparada pelo site.');
  }
  let bytes;
  try { bytes = Uint8Array.from(atob(data.split(',')[1]), c => c.charCodeAt(0)); }
  catch { throw invalid('Referência inválida.'); }
  const { width, height } = jpegSize(bytes);
  if (!width || !height || width > 512 || height > 512) {
    throw invalid('A referência para IA deve ter até 512 pixels por lado. Atualize a página do site.');
  }
  return new Blob([bytes], { type: 'image/jpeg' });
}
function resultImage(result) {
  if (!result || typeof result.image !== 'string' || !result.image) {
    throw new Error('Missing image output');
  }
  const raw = result.image;
  const match = raw.match(/^data:image\/(jpeg|png|webp);base64,(.*)$/s);
  const base64 = match ? match[2] : raw;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error('Invalid image output');
  let prefix;
  try { prefix = atob(base64.slice(0, 64)); }
  catch { throw new Error('Invalid image output'); }
  let mime;
  if (prefix.charCodeAt(0) === 255 && prefix.charCodeAt(1) === 216) mime = 'image/jpeg';
  else if (prefix.startsWith('\x89PNG\r\n\x1a\n')) mime = 'image/png';
  else if (prefix.startsWith('RIFF') && prefix.slice(8, 12) === 'WEBP') mime = 'image/webp';
  else throw new Error('Invalid image output');
  return 'data:' + mime + ';base64,' + base64;
}
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== 'POST') return json({ success: false, error: 'Envie uma requisição POST.' }, 405);
    try {
      const body = await readBody(request);
      if (body.action === 'capabilities' && Object.keys(body).length === 1) {
        return json({ success: true, capabilities: { referenceImage: typeof env.AI?.run === 'function', referenceImageMaxSide: 512 } });
      }
      if (Object.keys(body).some(key => !['prompt', 'referenceImage'].includes(key))) {
        throw invalid('Envie somente as especificações visuais e a imagem de referência.');
      }
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      if (!prompt) throw invalid('Digite uma descrição para gerar a imagem.');
      if (prompt.length > 2048) throw invalid('A descrição deve ter no máximo 2048 caracteres.');
      if (typeof env.AI?.run !== 'function') throw invalid('O vínculo AI do Worker não está configurado.', 503);
      const hasReference = Object.hasOwn(body, 'referenceImage');
      let result;
      if (hasReference) {
        const image = referenceBlob(body.referenceImage);
        const form = new FormData();
        form.append('prompt', prompt);
        form.append('width', '1024');
        form.append('height', '1024');
        form.append('input_image_0', image, 'reference.jpg');
        // O Response serializa o FormData e inclui o boundary necessário.
        const multipartResponse = new Response(form);
        result = await env.AI.run(REFERENCE_MODEL, {
          multipart: {
            body: multipartResponse.body,
            contentType: multipartResponse.headers.get('content-type')
          }
        });
      } else {
        result = await env.AI.run(TEXT_MODEL, { prompt, steps: 4 });
      }
      return json({ success: true, image: resultImage(result), ...(hasReference ? { referenceUsed: true } : {}) });
    } catch (error) {
      if (error.httpStatus) return json({ success: false, error: error.message }, error.httpStatus);
      // Não registrar prompts, fotos, cadastros ou mensagens brutas do provedor.
      console.error('image_generation_failed');
      return json({ success: false, error: 'Não foi possível gerar a imagem. Verifique a disponibilidade do modelo no Workers AI.' }, 502);
    }
  }
};
