import { jsPDF } from 'jspdf';

const INK = '#151A16';
const LIME = '#B7BF1B';
const MUTED = '#586052';
const MARGIN = 18;
const WIDTH = 174;
const BOTTOM = 272;
const clean = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[\u2010-\u2015]/g, '-').trim();

/** Create a real, selectable-text PDF without sending the briefing to a service. */
export function buildBriefingPdf({ user, project, brand, study, clientLogo, fonts, createdAt = new Date() }) {
  if (!user || !project || !brand?.data) throw Error('Não foi possível preparar a identidade do PDF. Atualize a página e tente novamente.');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true });
  if(!fonts?.regular||!fonts?.bold)throw Error('Não foi possível carregar as fontes do PDF. Atualize a página e tente novamente.');
  doc.addFileToVFS('briefing-regular.ttf', fonts.regular);
  doc.addFont('briefing-regular.ttf', 'BriefingSans', 'normal');
  doc.addFileToVFS('briefing-bold.ttf', fonts.bold);
  doc.addFont('briefing-bold.ttf', 'BriefingSans', 'bold');
  doc.setProperties({ title: 'Briefing de Projeto - Neo Soul 3D Lab', author: 'Neo Soul', subject: 'Dados do projeto para avaliação e orçamento', creator: 'Lab Neo Soul 3D' });
  doc.setLanguage('pt-BR');
  let y = 0;

  function header() {
    doc.setFillColor(INK); doc.rect(0, 0, 210, 37, 'F');
    const logoWidth = 53, logoHeight = logoWidth * brand.height / brand.width;
    doc.addImage(brand.data, 'PNG', MARGIN, (37 - logoHeight) / 2, logoWidth, logoHeight, 'neo-soul', 'FAST');
    doc.setFont('BriefingSans', 'bold'); doc.setFontSize(10); doc.setTextColor(LIME);
    doc.text('LAB NEO SOUL 3D', 192, 16, { align: 'right' });
    doc.setFont('BriefingSans', 'normal'); doc.setFontSize(8); doc.setTextColor('#FFFFFF');
    doc.text('Ideias em outra dimensão.', 192, 23, { align: 'right' });
    doc.setFillColor(LIME); doc.rect(0, 37, 210, 1.2, 'F');
    y = 50;
  }
  function page(continuation = false) {
    doc.addPage(); header();
    if (continuation) { doc.setFontSize(9); doc.setFont('BriefingSans', 'bold'); doc.setTextColor(MUTED); doc.text('CONTINUAÇÃO DO BRIEFING', MARGIN, y); y += 10; }
  }
  function ensure(height) { if (y + height > BOTTOM) page(true); }
  function section(title) {
    ensure(27); doc.setFont('BriefingSans', 'bold'); doc.setFontSize(12); doc.setTextColor(INK);
    doc.text(title, MARGIN, y); y += 8;
  }
  function fields(items) {
    const gap = 5, width = (WIDTH - gap * (items.length - 1)) / items.length;
    doc.setFont('BriefingSans', 'normal'); doc.setFontSize(10);
    const values = items.map(([, value]) => doc.splitTextToSize(clean(value) || 'Não informado', width - 10));
    const height = Math.max(...values.map(lines => lines.length)) * 4.7 + 9;
    ensure(height + 3);
    items.forEach(([label], i) => {
      const x = MARGIN + i * (width + gap);
      doc.setFillColor('#F3F5EF'); doc.roundedRect(x, y, width, height, 2, 2, 'F');
      doc.setFont('BriefingSans', 'bold'); doc.setFontSize(7.4); doc.setTextColor(MUTED);
      doc.text(clean(label).toUpperCase(), x + 5, y + 5);
      doc.setFont('BriefingSans', 'normal'); doc.setFontSize(10); doc.setTextColor(INK);
      doc.text(values[i], x + 5, y + 10, { lineHeightFactor: 1.33 });
    });
    y += height + 3;
  }
  function note(text) {
    doc.setFont('BriefingSans', 'normal'); doc.setFontSize(8); doc.setTextColor(MUTED);
    const lines = doc.splitTextToSize(clean(text), WIDTH); ensure(lines.length * 4 + 8);
    doc.setFont('BriefingSans', 'normal'); doc.setFontSize(8); doc.setTextColor(MUTED);
    doc.text(lines, MARGIN, y, { lineHeightFactor: 1.4 }); y += lines.length * 4 + 8;
  }
  function picture(image, title, caption, maxHeight) {
    if (!image?.data || !image.width || !image.height) return;
    const width = Math.min(WIDTH - 10, maxHeight * image.width / image.height);
    const height = width * image.height / image.width;
    ensure(height + (caption ? 36 : 22));
    doc.setFont('BriefingSans', 'bold'); doc.setFontSize(11); doc.setTextColor(INK);
    doc.text(title, MARGIN, y); y += 6;
    doc.setFillColor(title === 'Logo enviada' ? '#D6DAD0' : '#F7F8F4');
    doc.roundedRect(MARGIN, y, WIDTH, height + 8, 2, 2, 'F');
    doc.addImage(image.data, 'PNG', MARGIN + (WIDTH - width) / 2, y + 4, width, height, undefined, 'FAST');
    y += height + 14;
    if (caption) note(caption);
  }

  header();
  doc.setFont('BriefingSans', 'bold'); doc.setFontSize(25); doc.setTextColor(INK);
  doc.text('Briefing do Projeto', MARGIN, y + 4); y += 14;
  const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(createdAt));
  note('Gerado em ' + date + ' (horário de Brasília). Projeto para avaliação e orçamento.');
  section('01 / Seu cadastro');
  fields([['Nome', user.name], ['Empresa ou projeto', user.company]]);
  fields([['E-mail', user.email], ['Telefone / WhatsApp', user.phone]]);
  y += 4; section('02 / Seu projeto');
  fields([['Descrição do projeto', project.description]]);
  fields([['Materiais de cada parte', project.materials || 'Quero orientação']]);
  fields([['Aplicação da impressão 3D', project.printUsage || 'Quero orientação']]);
  fields([['Filamento', project.filament], ['Cores', project.color]]);
  fields([['Medidas - largura x altura x profundidade', project.size], ['Acabamento', project.finish]]);
  fields([['Quantidade', project.quantity + (Number(project.quantity) === 1 ? ' unidade' : ' unidades')], ['Linha do troféu', project.trophyDesign || 'Não se aplica']]);
  fields([['Logo do cliente', clientLogo ? 'Logo anexada ao projeto' : 'Sem logo anexada'], ['Imagem do projeto', study ? 'Estudo com IA e marca d’água Neo Soul' : 'Sem imagem anexada']]);
  note('Briefing conceitual: materiais, medidas finais, cores, acabamento, viabilidade, prazo e valores serão confirmados pela equipe Neo Soul. Este documento não é um orçamento aprovado ou arquivo técnico de produção.');

  if (study || clientLogo) {
    page(); section('03 / Imagens do projeto');
    picture(study, 'Estudo visual com IA', 'Estudo conceitual gerado a partir das escolhas do projeto. A marca d’água Neo Soul está incorporada à imagem.', 160);
    picture(clientLogo, 'Logo enviada', '', 30);
  }

  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i); doc.setDrawColor('#D7DCCE'); doc.setLineWidth(.3); doc.line(MARGIN, 279, 192, 279);
    doc.setFont('BriefingSans', 'bold'); doc.setFontSize(8); doc.setTextColor(INK);
    doc.text('NEO SOUL | Comunicação visual e produção 360°', MARGIN, 284);
    doc.setFont('BriefingSans', 'normal'); doc.setFontSize(7.6); doc.setTextColor(MUTED);
    doc.text('neosoul.com.br  |  WhatsApp: (11) 2631-4876  |  @neosoulsolucoes', MARGIN, 289);
    doc.text('Guarulhos, São Paulo', MARGIN, 293);
    doc.text(i + ' / ' + total, 192, 289, { align: 'right' });
  }
  return doc;
}

export async function pdfImage(blobOrUrl) {
  const blob = typeof blobOrUrl === 'string' ? await fetch(blobOrUrl).then(r => {
    if (!r.ok) throw Error('Não foi possível carregar uma imagem do PDF.'); return r.blob();
  }) : blobOrUrl;
  const source = URL.createObjectURL(blob);
  try {
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(Error('Não foi possível preparar uma imagem do PDF.')); img.src = source; });
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return { data: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
  } finally { URL.revokeObjectURL(source); }
}

async function pdfFont(url) {
 const response=await fetch(url);if(!response.ok)throw Error('Não foi possível carregar as fontes do PDF.');
 const bytes=new Uint8Array(await response.arrayBuffer());let binary='';
 for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
 return btoa(binary);
}

export async function downloadBriefingPdf(input) {
  const [brand, study, clientLogo, regular, bold] = await Promise.all([
    pdfImage('./assets/neo-soul-logo.webp'),
    input.study ? pdfImage(input.study) : null,
    input.clientLogo ? pdfImage(input.clientLogo) : null,
    pdfFont('./assets/fonts/briefing-regular.ttf'),
    pdfFont('./assets/fonts/briefing-bold.ttf'),
  ]);
  const doc = buildBriefingPdf({ ...input, brand, study, clientLogo, fonts:{regular,bold} });
  const blob = doc.output('blob');
  const source = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = source; link.download = 'briefing-neo-soul.pdf'; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(source), 60000);
  return blob;
}
