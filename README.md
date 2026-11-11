# Lab Neo Soul 3D

Site público no GitHub Pages: https://neosoulsolucoeslab.github.io/labneosoul3d/

O cliente preenche cadastro e projeto e anexa **somente a logo**. O briefing completo do projeto vira a instrução da IA. As imagens que orientam a linguagem de criação pertencem ao banco interno aprovado pela Neo Soul; o cliente não envia foto de referência.

## O que está pronto

- Quiz de nove etapas, validação, progresso com foguete animado, cursor de foguete, materiais reais e favicon com o símbolo Neo Soul.
- Rascunho e logo guardados no navegador, vinculados à aba; não são arquivos do repositório. GitHub Pages serve apenas arquivos estáticos. O cadastro do briefing não é um login verificado por e-mail.
- PDF real, com cadastro, respostas, logo Neo Soul, contatos, logo do cliente e estudo gerado quando disponível.
- Mensagem revisável e aprovação explícita antes de abrir o WhatsApp. O site não envia mensagens nem anexa arquivos automaticamente.
- Novo backend Cloudflare com prompt completo, logo e até três referências internas enviadas como pixels ao modelo FLUX.2 klein. O servidor seleciona as referências por tipo de objeto e tags do briefing.
- Marca d’água aplicada no servidor, arquivos em R2 privado, duas gerações por e-mail normalizado declarado no cadastro, reserva atômica em D1, devolução em erro, idempotência e recuperação de estudo.

**A ativação do novo fluxo de IA depende de publicar o Worker atualizado, configurar D1/R2 e carregar as imagens aprovadas pela Neo Soul.** O botão fica indisponível com uma mensagem clara enquanto o serviço não anuncia o novo contrato e um banco pronto. Não há geração fictícia nem uso silencioso do gerador antigo sem o banco.

## Publicar o site

O GitHub Pages pode servir diretamente a raiz de `main` (Settings → Pages → Deploy from a branch → main / root). A raiz já contém o bundle de PDF e todos os assets necessários. `.nojekyll` evita processamento desnecessário. A publicação do front-end não publica o Worker.

```sh
npm ci
npm test
npm run build
```

O build atualiza `assets/briefing-pdf.js`, gera `server/worker-deploy.js` (arquivo único para o editor da Cloudflare) e prepara `dist/` com os arquivos estáticos. As dependências são fixadas em `package-lock.json`.

## Ativar a IA existente na Cloudflare

A URL pública já configurada em `config.js` é o Worker existente `gerador-imagens-ia.socialmedia-684.workers.dev`. A URL não é uma credencial. Não adicione tokens ou chaves em `config.js`, no HTML, no GitHub ou nas conversas.

1. Abra **Workers & Pages → gerador-imagens-ia** na sua conta Cloudflare.
2. Em **Bindings**, mantenha o vínculo **Workers AI** chamado `AI`.
3. Crie um banco **D1** chamado `lab-neosoul3d` e execute o SQL de `server/migrations/0001.sql` no console do D1. Vincule-o ao Worker com o nome `DB`.
4. Crie um bucket **R2 privado** para o laboratório. Não habilite domínio público ou `r2.dev`. Vincule-o com o nome `BUCKET`.
5. Prepare e carregue o banco interno como explicado abaixo. Preserve os caminhos `bank/...`, incluindo `bank/manifest.json`.
6. No editor do Worker, substitua o código pelo conteúdo **inteiro** de `server/worker-deploy.js` e publique. Esse bundle inclui os módulos necessários; não cole apenas `cloudflare-worker.mjs`, pois ele possui imports locais.
7. Abra o site e confira o cadastro, o resumo e uma geração real. O indicador só libera a IA se Worker, D1 e banco responderem. Confira no resultado o atendimento ao briefing e a aplicação da logo antes de considerar a integração validada.

O vínculo `AI` usa a conta Cloudflare já existente. Esta implementação não requer criar ou expor uma chave OpenAI. Disponibilidade, limites e cobrança dos modelos seguem a conta Cloudflare existente.

## Banco interno de imagens

As fotos ainda serão fornecidas pela Neo Soul. Nenhuma das imagens ilustrativas do site foi promovida automaticamente a referência aprovada da IA.

Copie `docs/bank-manifest.example.json` para um arquivo local, troque `source` pelo arquivo enviado e atribua tipo, tags e uma legenda descritiva a cada modelo aprovado. `objects` aceita `special`, `trophy`, `medal`, `keychain`, `display`, `prototype`, `decor`, `symbol` e `channel-letter`. Use `special` somente para uma referência realmente aplicável a vários tipos de projeto; referências específicas têm preferência na seleção.

Com Python e Pillow instalados:

```sh
python scripts/prepare-bank.py --manifest /caminho/manifesto.json --input /caminho/imagens --output bank-private
```

O script reduz para JPEG com até 512 px, remove metadados da imagem exportada e cria `bank-private/bank/manifest.json`. Carregue o conteúdo no R2 privado, mantendo o prefixo `bank/`. A pasta `bank-private/` está ignorada pelo Git. Não publique o banco de referências no repositório público.

O Worker recebe de 1 a 3 imagens internas e, quando anexada, a logo como quarta imagem. Ele nunca aceita URLs ou fotos de referência fornecidas pelo cliente. Sem referências compatíveis, informa a pendência e não consome cota. As referências orientam forma e construção; isso não treina um modelo dedicado, e a fidelidade de texto/logo precisa de revisão humana.

## Dados, cota e recuperação

Nome, telefone e empresa permanecem no rascunho local e no PDF/mensagem que o cliente decide compartilhar. O e-mail é enviado ao endpoint de cadastro para calcular SHA-256 e controlar a cota; não entra no prompt. D1 guarda hash de e-mail, hash de sessão e contagem. O prompt contém os textos completos de projeto, materiais, aplicação 3D, filamento, cores, medidas, acabamento e quantidade. A logo reduzida e as referências são enviadas ao Workers AI somente ao gerar. Os estudos com marca d’água são guardados no R2 privado e recuperados mediante sessão.

A cota é por **e-mail declarado**, sem verificação de posse: repetir o mesmo e-mail preserva a contagem, mas usar outro e-mail cria outro cadastro. Não representa autenticação de identidade. Se for necessário um limite por pessoa verificada, a próxima etapa é adicionar confirmação de e-mail e proteção contra cadastros automatizados antes de anunciar essa garantia.

A sessão expira em sete dias. Uma reserva interrompida é liberada após dez minutos, na próxima consulta. Após timeout, o botão “Verificar estudo” consulta a solicitação original sem iniciar outra inferência. Repetir a mesma solicitação retorna o estudo salvo. Erros de modelo ou gravação devolvem a reserva. Não são registrados prompts, logos ou respostas brutas do provedor nos logs.

Os resultados são estudos conceituais, sujeitos à análise técnica. Projetos especiais são prioridade. Premiações usam painéis, placas, silhuetas recortadas e bases baixas; o prompt proíbe taças e troféus tradicionais.

Documentação do modelo e imagens de entrada: https://developers.cloudflare.com/changelog/post/2026-01-15-flux-2-klein-4b-workers-ai/
