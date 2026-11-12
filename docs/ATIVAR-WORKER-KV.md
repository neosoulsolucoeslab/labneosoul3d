# Worker Neo Soul: Brevo + D1 + KV

Esta versão está preparada para substituir o Worker existente. O código-fonte é `server/cloudflare-worker.mjs`; o arquivo único para colar no editor da Cloudflare é **`server/worker-deploy.js`**, gerado por `npm run build`. O primeiro possui imports locais e não deve ser colado sozinho no editor.

A publicação de produção não foi realizada nesta atualização. As alterações estão na branch de integração para revisão e configuração conjunta do formulário e do Worker.

## Recursos e vínculos

| Recurso existente | Nome da variável no Worker | Responsabilidade |
| --- | --- | --- |
| Workers AI | `AI` | Modelo de imagens já utilizado, `@cf/black-forest-labs/flux-2-klein-4b` |
| D1 | `DB` | Prova do e-mail, sessões, contagem de gerações e reservas atômicas |
| KV `LIMITES_IA` | `LIMITES_IA` | Referências privadas existentes e estudos gerados |
| Brevo | Secret `BREVO_API_KEY` | E-mail transacional solicitado pelo cliente |

Não é necessário vínculo R2. A versão não usa `BUCKET`, não cria namespaces nem inclui qualquer comando de contratação ou upgrade. O adaptador original enviado foi preservado sem nenhuma alteração em `server/banco-kv.mjs`.

## Banco de imagens já importado

Preservados exatamente:

- Manifesto: `neo:refs:v1:manifest`.
- Fotos: `neo:refs:v1:image:...`.
- Schema: `neo-soul-reference-bank/kv-v1`, versão 1.
- Valores JSON com JPEG codificado em `base64`, dimensões e SHA-256.

Não reimporte o banco, não troque o namespace e não converta os valores para binário puro. O adaptador faz a mesma seleção por categoria/tags e a mesma conferência de bytes/hash. O Worker lê as referências; não escreve nem apaga chaves `neo:refs:*`.

São selecionadas até três fotos internas. A logo do cliente é outro JPEG, acrescentado no índice seguinte como quarta imagem no máximo. O formulário foi alinhado a 500 px, conforme o adaptador original. Ausência ou corrupção de referência gera erro antes de reservar a cota e antes de chamar o modelo. Nenhum caminho alternativo cria uma imagem genérica sem o banco.

## Preparar o D1

No banco que já será vinculado como `DB`, execute o conteúdo de **`server/schema.sql`** no console SQL. Ele reúne `0001.sql` e `0002_email_verification_kv.sql`, usa `CREATE ... IF NOT EXISTS` e pode ser reaplicado. Não há DROP, não zera `registrations.used` e não exclui estudos/cadastros existentes.

Se utiliza o fluxo de migrations do Wrangler, aplique os arquivos de `server/migrations/` em ordem, no mesmo D1.

A tabela antiga `sessions` pode continuar existindo para compatibilidade do esquema, mas nenhum token dela é aceito. A nova autenticação usa `verified_accounts` e `verified_sessions`. Contagens prévias em `registrations` continuam valendo após a confirmação do mesmo endereço de e-mail.

## Configuração privada do Worker

Configure em Settings/Variables and Secrets do Worker, sem colocar valores no HTML, `config.js`, no GitHub ou nesta conversa:

| Nome | Tipo | Valor esperado |
| --- | --- | --- |
| `BREVO_API_KEY` | Secret | Credencial existente da conta Brevo |
| `AUTH_SECRET` | Secret | Segredo aleatório privado, com pelo menos 32 caracteres, para HMAC dos códigos; não reutilizar uma senha pessoal |
| `BREVO_SENDER_EMAIL` | Texto | E-mail do remetente já verificado/autorizado na Brevo |
| `BREVO_SENDER_NAME` | Texto | Opcional, padrão `Neo Soul` |
| `ALLOWED_ORIGIN` | Texto | Origem HTTPS, sem caminho ou barra final; padrão `https://neosoulsolucoeslab.github.io` |
| `EMAIL_DAILY_LIMIT` | Texto numérico | Padrão 200; máximo permitido 300 |
| `GENERATION_DAILY_LIMIT` | Texto numérico | Padrão 20; faixa configurável de 1 a 200 |
| `STUDY_RETENTION_DAYS` | Texto numérico | Padrão 30; faixa configurável de 1 a 90 |

Nenhum segredo real foi criado, consultado ou incluído nos arquivos. O exemplo `.dev.vars.example` contém valores vazios para os secrets; a aplicação recusa operar sem configuração válida. Para desenvolvimento local, utilize uma cópia privada `.dev.vars`, ignorada pelo Git.

A Brevo exige remetente configurado. O Worker usa somente o endpoint de e-mail transacional, sem SMS, WhatsApp, automações comerciais ou assinatura paga. O limite padrão de 200 solicitações/dia reserva margem em relação aos 300 e-mails/dia anunciados para o plano gratuito; tráfego de outros projetos da conta também utiliza a franquia da Brevo.

Os recursos existentes continuam sujeitos às franquias da Cloudflare/Brevo. Workers AI possui alocação diária gratuita; o código não compra créditos nem faz upgrade. O teto global de 20 chamadas de imagem/dia é uma proteção do aplicativo, não uma medição do saldo compartilhado da conta. Falhas de disponibilidade/franquia devolvem a reserva do cliente quando detectadas; o orçamento diário de chamadas continua consumido se uma chamada já foi tentada.

## Fluxo de confirmação

1. `send-code`: valida nome, e-mail, telefone e empresa; reserva o envio no D1; envia um código criptograficamente aleatório de seis dígitos pela Brevo.
2. O D1 guarda HMAC do código com nonce, nunca o código em texto. Expiração: dez minutos; uso único; no máximo cinco tentativas; reenvio após sessenta segundos.
3. Limites adicionais de envio: seis por endereço/dia e vinte por IP/hora. IPs são transformados em HMAC antes de compor chaves no D1. Nenhum contador de autenticação fica no KV.
4. `verify-code`: consome o código de forma atômica e emite uma sessão aleatória. Apenas o hash do token fica em `verified_sessions`; validade de sete dias.
5. `session`: valida a sessão no D1 e retorna cota, pedido pendente e metadados dos estudos. O antigo `register` automático responde 410 e não cria sessão.

E-mails são normalizados com trim/minúsculas. O limite é de dois estudos por **endereço de e-mail confirmado**, não por identidade civil. Reconfirmar o endereço não zera a contagem. O formulário existente consome `token` e `remaining`, exatamente como preparado na branch.

## Geração e armazenamento

- `generate` exige Bearer token confirmado no D1, briefing completo e `requestId` UUID v4.
- A reserva de uma das duas gerações acontece no D1 em transação, com um único estudo simultâneo por cadastro. Repetições do mesmo pedido/payload não fazem outra inferência; reuso do ID com outro conteúdo é rejeitado.
- O modelo recebe os pixels das referências e da logo, além do texto completo do projeto. Dados de contato do cadastro e secrets não entram no prompt.
- Projetos especiais têm prioridade. Taças e troféus tradicionais são vetados. Referências volumétricas autorais, como o leão facetado fornecido, podem orientar uma criação especial em base compacta. A identidade das fotos internas não deve ser copiada.
- O servidor aplica a marca d'água antes de salvar ou devolver a imagem.
- O KV usa chaves **`neo:studies:v1:<hash-do-email>:<requestId>`** e armazena SVG privado com a imagem incorporada e marca d'água. Prefixo separado do banco visual.
- Os estudos expiram após 30 dias por padrão. A expiração do arquivo **não devolve a cota de geração**. O prazo exato fica no D1 e na resposta da API. O formulário reconhece o erro 410 na recuperação e limpa o pedido pendente local.
- O orçamento de espaço do aplicativo é de 512 MiB para estudos ativos, reservando margem para o banco e outros dados. Isso não mede o armazenamento total da conta KV. Cada estudo tem limite de 12 MiB.

A resposta inicial usa a imagem já presente em memória. A recuperação usa `generation` com o mesmo `requestId`, após validar o proprietário no D1 e conferir o SHA-256 do SVG. Se o KV ainda não propagou a gravação, retorna 503 e mantém a geração como concluída no D1: não desconta outra cota, não reembolsa uma imagem já concluída e não repete a IA. Um 410 indica recuperação expirada.

Uma falha real de modelo/gravação antes de concluir no D1 libera a reserva do cliente. Reservas abandonadas são liberadas após dez minutos, na próxima consulta desse cadastro. Arquivos órfãos de tentativas com falha são removidos quando possível e possuem expiração como fallback. Nenhuma limpeza toca as chaves do banco de referências.

## Corpo das chamadas

Todas as chamadas são POST JSON para a URL atual do Worker, com `Origin` correspondente a `ALLOWED_ORIGIN`:

```json
{"action":"send-code","name":"Cliente","email":"cliente@example.com","phone":"11999999999","company":"Projeto"}
```

```json
{"action":"verify-code","email":"cliente@example.com","code":"123456"}
```

O segundo exemplo mostra apenas o formato; `123456` não é um código fixo do sistema. `send-code` não devolve o código na resposta.

Chamadas autenticadas levam `Authorization: Bearer <token-da-sessao>`:

```json
{"action":"session"}
```

```json
{"action":"generation","requestId":"<UUID-do-pedido-original>"}
```

`generate` mantém o contrato do formulário: `action`, `requestId`, `brief` e `logo`. `brief` inclui descrição, materiais, uso 3D, filamento, cores, medidas textuais, dimensões numéricas, acabamento, quantidade, objeto e linha de premiação. `logo` é JPEG data URL com até 500 px por lado, ou null. Foto de referência do cliente não é aceita.

O endpoint não expõe o manifesto/fotos, não retorna secrets e não publica URLs de KV. Não registrar códigos, tokens, destinatários, prompts, logos ou corpo bruto de erros da Brevo/IA nos logs.

## Compilar, conferir e publicar quando autorizado

```sh
npm ci
npm test
npm run build
```

Depois da configuração e autorização de publicação, cole **todo** o conteúdo de `server/worker-deploy.js` no editor do Worker existente e publique em conjunto com esta versão do formulário. Mantenha o vínculo KV `LIMITES_IA` que já contém as imagens. Não execute a importação novamente.

Antes de considerar a ativação concluída, faça um teste real: receber o código na caixa de entrada, confirmar, gerar um estudo com logo, recuperar pelo mesmo ID, criar o segundo estudo e conferir o bloqueio do terceiro. Esta preparação executa testes locais com serviços simulados; não envia e-mails reais nem aciona o modelo de produção.

## Documentação consultada

- Brevo API: https://developers.brevo.com/reference/send-transac-email
- Remetentes e envio: https://developers.brevo.com/docs/send-a-transactional-email
- Plano gratuito Brevo: https://help.brevo.com/hc/pt/articles/208580669-FAQ-Quais-s%C3%A3o-os-limites-do-plano-Gr%C3%A1tis
- Transações D1: https://developers.cloudflare.com/d1/worker-api/d1-database/
- Escrita e expiração KV: https://developers.cloudflare.com/kv/api/write-key-value-pairs/
- Workers AI e franquias: https://developers.cloudflare.com/workers-ai/platform/pricing/
- Referências no modelo: https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/
- Boas práticas de códigos: https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
