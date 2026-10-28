# Neo Soul · Lab de impressão 3D

Site: https://neosoulsolucoeslab.github.io/labneosoul3d/

Quiz visual em nove etapas: cadastro, descrição, filamento, cores, medidas, acabamento, logo, quantidade e revisão/WhatsApp. Cabeçalho, galeria de ideias e biblioteca de materiais aparecem no cadastro; as demais telas mostram apenas o quiz.

## Referência enviada pelo cliente

A galeria fixa foi substituída pelo upload opcional na etapa Descrição. Aceita PNG, JPG ou WebP de até 5 MB e até 24 megapixels. O navegador reencoda a foto em JPEG, com lado máximo de 1.536 pixels, remove metadados/nomes originais e usa o nome neutro `referencia-projeto.jpg`. A foto pode ser vista, trocada, removida, baixada ou compartilhada junto ao briefing. Mudar a referência invalida um estudo anterior; uploads concorrentes são descartados com segurança.

O fluxo com foto está preparado, mas depende de atualizar o Worker externo. A conexão atual não confirmou o contrato de referência; o frontend não finge ter usado a foto nem cai silenciosamente para uma geração só por texto. A referência continua disponível no briefing e no compartilhamento com a equipe.

### Contrato necessário no Worker existente

O endereço continua `https://gerador-imagens-ia.socialmedia-684.workers.dev/` e permanece separado de `apiBase`.

1. `POST {"action":"capabilities"}` deve retornar `{"success":true,"capabilities":{"referenceImage":true}}` somente se há uma operação real de geração/edição condicionada por imagem. Essa verificação não envia fotos e não deve gerar imagens nem consumir cota.
2. Sem referência: `POST {"prompt":"..."}` mantém a operação existente.
3. Com referência: `POST {"prompt":"...","referenceImage":"data:image/jpeg;base64,..."}` deve usar efetivamente os pixels como entrada, junto ao prompt compilado.
4. Só depois de a operação com imagem terminar corretamente, retornar `{"success":true,"image":"data:image/...;base64,...","referenceUsed":true}`. Sem essa confirmação o site não exibe a saída como um estudo baseado na referência.

`server/worker-reference-adapter.mjs` fornece um adaptador testado para integrar ao Worker existente. Ele não está implantado e não configura provedor ou chave. Recebe as funções de geração já existentes como dependências: `generateImage({prompt})` e `generateImageFromReference({prompt,referenceImage})`. A segunda precisa chamar uma operação que realmente aceite imagem; não deve apontar para uma geração apenas textual. É necessário preservar autenticação, contagem de uso e demais regras existentes do serviço ao integrar. O código original do Worker e seu acesso de implantação não estão disponíveis neste repositório.

## Como o formulário orienta o estudo

Os campos de descrição, materiais de cada parte e aplicação da impressão 3D são lidos localmente. Apenas especificações visuais de uma lista fechada são compiladas para o prompt; o texto original não é enviado.

- Partes: corpo, base, estrela, detalhes, topo, moldura, painel, letras e suporte.
- Materiais: acrílico, MDF, madeira, pinus, PVC, ACM e impressão 3D. Acrílico cristal é reconhecido como transparente; madeira sem espécie não vira pinus por suposição. Filamento e acabamento se aplicam somente às partes impressas.
- Dimensões: largura × altura × profundidade em cm, inclusive números personalizados; mm e m são convertidos. As proporções são usadas como orientação visual.
- Cores: nomes padronizados, azul escuro/navy e códigos hexadecimais. Cores de partes explícitas têm prioridade sobre a paleta padrão de filamento.
- Acabamento: normal com camadas aparentes; regular com limpeza; premium com superfície refinada. Motivos permitidos, como estrela, espiral, relevo e hexágono, orientam o desenho.

Com referência, o prompt pede uma nova proposta a partir da forma/composição da foto e das escolhas do quiz, sem copiar textos, logos ou marcas d’água da fonte. Estudos visuais não substituem CAD ou análise de fabricação.

## Privacidade e marca d’água

Cadastro, telefone, e-mail, empresa, arquivo de logo da etapa 7, nomes de arquivos e texto original não entram na requisição de IA. Se o cliente optar pela referência e acionar a geração, a imagem selecionada também será enviada ao serviço; seu conteúdo visual faz parte dessa entrada. Não existe chat ou consulta a informações da empresa.

`watermark(blob)` continua incorporando a identificação Neo Soul ao resultado antes de exibir, baixar ou compartilhar. Nenhuma chave de API fica no navegador ou neste repositório. `server/image-policy.mjs` espelha as regras visuais do frontend; não representa um servidor implantado.

## Cadastro, configuração e WhatsApp

`config.js` mantém `apiBase: ''`, usado somente pelas rotas opcionais de cadastro. No modo atual, o cadastro é validado no navegador, sem comprovação de identidade por e-mail. O WhatsApp recebe o texto quando o visitante aciona o envio; imagens podem ser anexadas/compartilhadas pelo aparelho.

O limite real de duas gerações por cadastro exige autenticação e contagem persistente no Worker; o frontend e o adaptador de referência não implementam essa cota.

## Verificação

`node --test server/*.test.mjs` verifica a política visual e o adaptador: limites, campos permitidos, composição, cores, medidas, capacidade de referência, ausência de fallback silencioso, encaminhamento dos pixels e confirmação de uso.

Logo local em `assets/neo-soul-logo.webp`; rodapé com ícones de Instagram, LinkedIn e site. A biblioteca de materiais informa espessuras de referência, sem prometer estoque ou viabilidade.
