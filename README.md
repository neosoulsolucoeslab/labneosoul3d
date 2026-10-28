# Neo Soul · Lab de impressão 3D

Site: https://neosoulsolucoeslab.github.io/labneosoul3d/

Quiz visual em nove etapas: cadastro, descrição, filamento, cores, medidas, acabamento, logo, quantidade, revisão e WhatsApp. Cabeçalho e galeria ficam na página de cadastro; nas outras telas aparece apenas o quiz. Marca d’água, envio e compartilhamento são preservados.

## Geração de imagens com as especificações do quiz

O botão usa o Worker de imagens já fornecido pelo usuário. Ele recebe exclusivamente `{prompt}` e deve retornar `{success: true, image: "data:image/...;base64,..."}`. O modelo e a qualidade de execução são definidos no Worker, cujo código não está neste repositório. Não há chave de API no navegador.

- Material: as escolhas PLA, PETG, ABS e TPU produzem instruções visuais diferentes sobre textura, rigidez, bordas e brilho. Se o visitante pede orientação sobre material, o estudo usa PLA como referência e informa isso no resumo visual.
- Composição da descrição: a leitura local reconhece acrílico, MDF, pinus, PVC, ACM e impressão 3D, associando corpo, base, estrela, detalhes, topo, moldura, painel, letras e suporte a materiais. Espessuras em mm e cores explícitas são preservadas por parte. Exemplo: corpo de acrílico 5 mm + base de MDF + estrela em 3D. Filamento e acabamento se aplicam somente às partes impressas; não existe obrigação de imprimir a peça inteira. O texto livre continua no navegador; apenas valores visuais validados entram no prompt. A leitura aparece no formulário para conferência.
- Cores: preto e branco são respeitados. Em multicolor ou outras cores, são reconhecidos nomes de cores e códigos hexadecimais. A paleta é explicitada no prompt; textos não reconhecidos exigem correção, em vez de virar cinza silenciosamente.
- Medidas: largura × altura × profundidade são usadas como números em centímetros, inclusive no projeto especial. mm e m são convertidos para cm. As proporções são incluídas no prompt. A ordem segue a indicada no quiz (L × A × P); não é inferida de uma ordem alternativa em texto livre.
- Acabamento: normal pede linhas de impressão aparentes; regular pede limpeza e rebarbas removidas mantendo linhas finas; premium pede superfície refinada e brilho controlado.
- Desenho: termos visuais de uma lista fechada, como estrela, espiral, hexágono, vazado e relevo, são identificados localmente na descrição. A descrição original nunca é enviada.
- Imagem: enquadramento de produto em três quartos, textura de filamento, volumes, sombra de contato e contraste adequado às cores escolhidas. Troféus devem ter desenho próprio, evitando uma taça esportiva genérica quando ela não foi pedida.

O resumo visual antes da geração mostra material, dimensões, acabamento e cores efetivamente reconhecidos. O tipo de objeto pode ser reconhecido por palavras permitidas da descrição ou escolhido no seletor da imagem. Esses estudos são referências visuais; não são CAD nem garantia de dimensões ou viabilidade de fabricação.

## Proteção dos dados

Somente seis campos visuais estruturados são aceitos: `object`, `material`, `color`, `size`, `finish`, `design`. Cores são nomes padronizados ou códigos hexadecimais; medidas são três números; estilo e detalhes são enums fechados. Dados extras e valores fora dessas listas são bloqueados.

Nome, e-mail, telefone, empresa, logo, nome do arquivo, quantidade, texto original e informações comerciais não entram no prompt. Não existe chat, consulta a informações da empresa ou resposta textual de atendimento. A marca da empresa é aplicada pelo código da aplicação, depois que a imagem é recebida; não é informada ao gerador.

`server/image-policy.mjs` define e testa o mesmo contrato visual para uma futura implementação de servidor. Não representa um servidor publicado. Nunca encaminhe cadastros, objetos de requisição completos, cookies, cabeçalhos ou dados comerciais ao provedor.

## Cadastro, WhatsApp e configuração

`config.js` mantém `apiBase: ''`. Esse endereço é usado pelas rotas opcionais de cadastro; não recebe o endereço do Worker. No modo atual, o cadastro é um briefing validado no navegador, sem comprovação de identidade por e-mail. Os dados ficam na memória da página e são incluídos no WhatsApp apenas quando o visitante aciona o envio para a equipe.

`watermark(blob)` incorpora identificação Neo Soul ao arquivo, antes de exibir, baixar ou compartilhar. `send` e `shareFiles` mantêm seu fluxo. Nenhuma chave de API foi publicada; os arquivos `.env` são ignorados.

O limite real de duas gerações por cadastro precisa ser implementado no Worker, com autenticação e contagem persistente; o frontend não garante esse limite.

## Verificação

`node --test server/image-policy.test.mjs` verifica a lista de campos, bloqueio de dados privados, conversão de medidas, interpretação de cores e influência das escolhas no prompt.

A logo oficial é servida do arquivo local `assets/neo-soul-logo.webp`. O rodapé contém links acessíveis com ícones para Instagram, LinkedIn e site. A biblioteca de materiais e a ajuda do filamento apresentam referências de composição e espessuras, sem prometer estoque ou viabilidade.

A etapa Descrição contém campos próprios para materiais de cada parte e aplicação da impressão 3D. Eles aparecem na revisão e no WhatsApp e alimentam a leitura visual local. Acrílico cristal é reconhecido como transparente; madeira sem espécie fica genérica; azul escuro é representado como navy. O serviço atual recebe um prompt textual; o uso de arquivos de imagem como entrada exige suporte no gerador.
