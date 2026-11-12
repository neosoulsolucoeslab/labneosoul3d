# Lab Neo Soul 3D

Código do site e do Worker da Neo Soul. A branch de integração contém confirmação de e-mail por código, geração com referências privadas no KV e limite de duas imagens por cadastro confirmado.

- Site: https://neosoulsolucoeslab.github.io/labneosoul3d/
- Front-end: `index.html`; somente a logo do cliente é anexada.
- Worker-fonte: `server/cloudflare-worker.mjs`.
- Worker em arquivo único para o editor da Cloudflare: `server/worker-deploy.js`.
- Adaptador privado original, sem alterações: `server/banco-kv.mjs`.
- Esquema D1: `server/schema.sql` (mantém cadastros e contagens).
- **Configuração e publicação: [docs/ATIVAR-WORKER-KV.md](docs/ATIVAR-WORKER-KV.md).**

O D1 é a autoridade para prova de e-mail, sessões, reservas e cota. O namespace KV existente `LIMITES_IA` conserva as 16 referências nos mesmos nomes e guarda os estudos com marca d'água em outro prefixo. Esta versão não utiliza R2 nem cria serviços/planos. A execução continua sujeita às franquias dos recursos existentes. Os valores de configuração privados não estão no repositório.

```sh
npm ci
npm test
npm run build
```

O build prepara o bundle do PDF, o Worker único e `dist/` estático. O site pode ser servido pela raiz da branch configurada no GitHub Pages. Alterações da branch de integração não foram mescladas em `main` nem publicadas pela atualização do Worker.

O fluxo preserva a estética espacial, fotos reais dos materiais, cursor e progresso com foguete, símbolo Neo Soul no favicon, PDF com briefing/logo/imagem e revisão antes de abrir o WhatsApp. Nenhuma mensagem de WhatsApp é enviada automaticamente.

O manifesto e as fotos privadas não são arquivos públicos deste repositório e não precisam ser importados novamente. Os testes usam uma imagem técnica neutra. Os passos de importação antigos que visavam R2 foram retirados para evitar confusão com o banco já carregado no KV.
