# Neo Soul 3D Lab

Simulador de projetos de impressão 3D da Neo Soul.

## Site

Arquivo principal: `index.html`.

Endereço configurado no repositório: https://neosoulsolucoeslab.github.io/labneosoul3d/

## Estado da integração

O HTML foi adicionado ao repositório. O fluxo de cadastro, verificação de e-mail, geração de imagens e compartilhamento depende de um backend, que não está incluído neste repositório.

O frontend faz chamadas relativas para `/api/session`, `/api/register`, `/api/verify`, `/api/generate` e `/api/prepare-share`. Esses endpoints precisam ser implementados em um serviço de backend e o frontend precisa apontar para esse serviço antes de usar essas funções no GitHub Pages. O fluxo atual exige a confirmação do cadastro para liberar o quiz.

O GitHub Pages hospeda apenas os arquivos estáticos deste projeto. Não executa o backend nem envia e-mails.

Destino comercial: vendas@neosoul.com.br. WhatsApp: +55 11 2631-4876.

Credenciais de e-mail e chaves de IA devem ficar exclusivamente no serviço de backend. Não devem ser adicionadas ao HTML, ao código público ou aos arquivos publicados pelo GitHub Pages.
