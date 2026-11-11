export function imageSize(bytes, mime) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mime === 'image/png' && bytes.length > 24 &&
      bytes.slice(0, 8).join() === '137,80,78,71,13,10,26,10') {
    return [v.getUint32(16), v.getUint32(20)];
  }
  if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216) {
    let i = 2;
    while (i + 8 < bytes.length) {
      if (bytes[i++] !== 255) break;
      while (bytes[i] === 255) i++;
      const marker = bytes[i++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd8)) continue;
      const n = v.getUint16(i);
      if (n < 2 || i + n > bytes.length) break;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))
        return [v.getUint16(i+5),v.getUint16(i+3)];
      i += n;
    }
  }
  if (mime === 'image/webp' && bytes.length > 30 &&
      String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') {
    const codec=String.fromCharCode(...bytes.slice(12,16));
    if(codec==='VP8X') return [1+bytes[24]+(bytes[25]<<8)+(bytes[26]<<16),1+bytes[27]+(bytes[28]<<8)+(bytes[29]<<16)];
    if(codec==='VP8 '&&bytes[23]===157&&bytes[24]===1&&bytes[25]===42) return [v.getUint16(26,true)&16383,v.getUint16(28,true)&16383];
    if(codec==='VP8L'&&bytes[20]===47) return [1+(((bytes[22]&63)<<8)|bytes[21]),1+(((bytes[24]&15)<<10)|(bytes[23]<<2)|(bytes[22]>>6))];
  }
  throw Error('Envie uma imagem PNG, JPG ou WebP válida.');
}
export function validateImage(bytes, mime, maxSide=Infinity) {
  const [width,height]=imageSize(bytes,mime);
  if(!width||!height||width*height>24000000||width>maxSide||height>maxSide)
    throw Error('Revise o tamanho da imagem (até 24 megapixels).');
  return {width,height};
}
export function watermarkedSvg(data) {
  const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(data);
  if(!match||data.length>15000000)throw Error('O gerador retornou uma imagem inválida.');
  const bytes=Uint8Array.from(atob(match[2]),c=>c.charCodeAt(0));
  const {width:w,height:h}=validateImage(bytes,match[1]);
  const band=Math.max(62,h*.1);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image width="${w}" height="${h}" href="${data}"/><g transform="translate(${w/2} ${h/2}) rotate(-24)"><text text-anchor="middle" fill="white" fill-opacity=".3" font-family="Arial,sans-serif" font-weight="bold" font-size="${w*.09}">NEO SOUL</text></g><rect x="0" y="${h-band}" width="${w}" height="${band}" fill="#080e09" fill-opacity=".94"/><text x="${w*.035}" y="${h-band*.47}" fill="#B7BF1B" font-size="${Math.max(16,w*.033)}" font-family="Arial,sans-serif" font-weight="bold">NEO SOUL · 3D LAB</text><text x="${w*.035}" y="${h-band*.15}" fill="white" font-size="${Math.max(10,w*.015)}" font-family="Arial,sans-serif">ESTUDO CONCEITUAL · neosoul.com.br</text></svg>`;
}
