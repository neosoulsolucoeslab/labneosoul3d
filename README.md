# Neo Soul · Lab de impressão 3D

Quiz responsivo em oito etapas: cadastro; descrição de até 300 caracteres; filamento; cores; medidas; acabamento; logo; revisão e WhatsApp.

Site: https://neosoulsolucoeslab.github.io/labneosoul3d/

## Uso no GitHub Pages

`index.html` e `config.js` devem ficar na mesma pasta. Sem dependências externas de CSS, fontes, ícones ou JavaScript: os ícones são SVG e as fontes usam Averta quando instalada, com fallback para Arial.

Na configuração padrão, o visitante preenche nome, e-mail, telefone e empresa ou projeto antes de acessar as perguntas. Os dados ficam na memória da página; recarregar exige um novo preenchimento. Este é um cadastro de briefing no navegador, não uma conta autenticada ou uma comprovação da identidade do visitante. Não há armazenamento de contatos no GitHub nem envio de e-mails nesta modalidade. O conteúdo do site é público.

O botão final abre `https://wa.me/551126314876` com cadastro e respostas. O visitante deve confirmar o envio no WhatsApp. A logo original e o estudo visual não são anexados automaticamente pelo link. Em aparelhos compatíveis, há compartilhamento de arquivos; nos demais, é necessário anexá-los na conversa. Nenhuma integração com a API do WhatsApp Business foi adicionada.

## Campos do briefing

- Filamentos: PLA, PETG, ABS, TPU ou orientação da equipe.
- Cores: preto, branco, multicolor ou outras, com campo de texto.
- Medidas de referência (L × A × P): 10 × 10 × 10, 20 × 20 × 20 e 30 × 30 × 30 cm, ou projeto especial.
- Acabamentos: normal, regular e premium, com explicações de referência sujeitas à avaliação da equipe.
- Logo opcional: PNG ou JPG, até 5 MB e 24 megapixels.

## Backend e IA: integração ainda pendente

Nenhum servidor está incluído ou hospedado neste repositório. O GitHub Pages serve arquivos estáticos e não executa serviços de e-mail ou IA. A geração de imagem não funciona enquanto não houver um backend configurado.

Para usar um backend, defina apenas sua URL pública em `window.NEO_CONFIG.apiBase`, no arquivo `config.js`. Não coloque credenciais nesse arquivo. Com URL configurada, o cadastro exige o código de seis dígitos recebido por e-mail e confirmação pelo servidor antes de liberar o quiz. Falhas do serviço não liberam acesso.

Contrato esperado, compatível com as rotas do frontend anterior:

- `POST /api/register`: recebe `{name,email,phone,company}` e envia código por e-mail.
- `POST /api/verify`: recebe cadastro e `code`; valida o código, cria sessão segura e retorna `{user}`. O servidor deve vincular o código ao cadastro e aplicar limites de tentativas.
- `POST /api/generate`: exige a sessão autenticada. Recebe `description`, `filament`, `color`, `size`, `finish`, `logo`, `logoName`, além de `category` e `details` para compatibilidade. Retorna `{url}` da imagem.

O servidor deve usar HTTPS, validar todos os campos e uploads, limitar consumo e aplicar controle de origem e proteção contra requisições indevidas. Em domínios diferentes, configure CORS com a origem exata do site, credenciais e cookies seguros compatíveis; bloqueios de cookies de terceiros podem exigir um domínio próprio. O download da imagem também precisa permitir leitura pelo frontend.

O navegador incorpora ao PNG gerado uma faixa “NEO SOUL · 3D LAB”, identificação de estudo conceitual e marca central semitransparente. Download e compartilhamento usam esse arquivo marcado. Para que todo acesso à imagem original também tenha marca, o backend deve aplicá-la antes de armazenar ou servir a imagem. Nenhuma imagem real de IA foi gerada ou validada nesta atualização.

Credenciais de e-mail e IA devem existir somente no backend. Nunca as publique no HTML, no `config.js` ou em arquivos do GitHub Pages.
