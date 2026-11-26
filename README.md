# luizflaviomatias.github.io

Página pessoal de Luiz Flávio Matias dos Santos — Gestor de TI e Tech Lead Oracle PL/SQL.

Site estático (HTML + CSS), publicado pelo GitHub Pages a partir da branch `main`.

Ao alterar `assets/style.css` ou algum `.js`, troque o `?v=` nos links das páginas (`index.html`, `en/`, `es/`, `artigos/`, `noticias/`, `en/news/` e `es/noticias/`) para que os navegadores baixem a versão nova em vez da guardada em cache.

## Notícias

A área de Notícias (`noticias/`, `en/news/` e `es/noticias/`) mostra as 5 manchetes mais relevantes de cada assunto, sempre nesta ordem: Tecnologia, Gestão de negócios, Política nacional, Política internacional (só em português), Economia e Curiosidades. A página mostra só título, fonte e data, com link para a matéria original.

- **Engine** (`motor-noticias/`, Node 22, sem dependências): lê os feeds RSS/Atom de `motor-noticias/fontes.json`, descarta ofertas e seções fora do assunto, junta a mesma história vinda de fontes diferentes e escolhe as 5 com mais fontes e mais recentes (no máximo 2 por fonte). Grava `noticias/dados/<idioma>.json`.
- **Feed fora do ar:** vira aviso no log; a categoria é completada com as notícias da publicação anterior que ainda tenham até 7 dias. A execução só falha se uma categoria ficar vazia.
- **Agendamento:** `.github/workflows/atualizar-noticias.yml` roda todo dia às 06:00 de Brasília (e pode ser disparado à mão em Actions), roda os testes e faz o commit dos JSONs como `github-actions[bot]`.
- **Fontes:** para incluir ou trocar uma fonte, edite `fontes.json`. Cada fonte aceita `incluirLinks`/`excluirLinks` (regex sobre o link), `filtrarPorTema` (feeds gerais: só entra o que casar com as `palavrasChave` da categoria) e, em curiosidades, `exigirExplicativa`. Use só feeds públicos e oficiais e confira os termos de uso de cada veículo.

```
npm install       # uma vez (instala o SDK da Claude API)
npm test          # testes da engine e do post
npm run noticias  # atualiza os JSONs com os feeds de agora
```

## Post diário no LinkedIn

Todo dia às 07:30 de Brasília, `.github/workflows/publicar-linkedin.yml` publica no seu perfil um resumo das notícias da manhã (`noticias/dados/pt.json`): um destaque por assunto, escrito pela Claude API só a partir de título e fonte, com o link para `/noticias/` e hashtags.

- **Código:** `motor-linkedin/`. `resumo.mjs` escreve o texto; se a IA falhar, recusar ou devolver texto fora das regras (link, hashtag, markdown, tamanho), sai um post padrão com a manchete principal de cada assunto. `linkedin.mjs` publica pela Posts API oficial.
- **Proteções:** no máximo um post por dia (registro em `motor-linkedin/ultimo-post.json`, gravado pelo bot); não publica se as notícias tiverem mais de 30 h; sem token cadastrado, só avisa e não publica.
- **Token:** dura 60 dias. A partir de 7 dias antes de vencer, o workflow abre uma issue. Para renovar, rode `npm run autorizar-linkedin` no seu terminal.

Configuração (uma vez):

1. Em developer.linkedin.com, crie o app (ligado a uma Company Page), adicione os produtos **Share on LinkedIn** e **Sign In with LinkedIn using OpenID Connect** e cadastre `http://localhost:8765/callback` como Redirect URL.
2. No seu terminal, defina `LINKEDIN_CLIENT_ID` e `LINKEDIN_CLIENT_SECRET` e rode `npm run autorizar-linkedin`. Ele abre o login, recebe o retorno em localhost e grava `LINKEDIN_TOKEN`, `LINKEDIN_AUTOR` e `LINKEDIN_TOKEN_EXPIRA_EM` com `gh secret set`, sem mostrar os valores.
3. Opcional: `gh secret set ANTHROPIC_API_KEY` para o texto escrito pela IA (sem ela, sai sempre o post padrão).

```
npm run linkedin -- --rascunho   # mostra o post de hoje sem publicar
```
