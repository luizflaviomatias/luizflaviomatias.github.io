// Lista os repositórios públicos do GitHub (sem forks), do mais recente para o mais antigo.
// Usa a API pública (sem token) e guarda o resultado por 1 hora para não esbarrar no limite de requisições.
(function () {
  const USUARIO = "luizflaviomatias";
  const URL = "https://api.github.com/users/" + USUARIO + "/repos?per_page=100&sort=updated";
  const CHAVE = "repos-cache-v1";
  const VALIDADE = 60 * 60 * 1000;

  // Textos por idioma (definido pelo atributo lang da página).
  const IDIOMA = (document.documentElement.lang || "pt-BR").slice(0, 2);
  const TEXTOS = {
    pt: { local: "pt-BR", semDescricao: "Repositório público no GitHub.", atualizado: "Atualizado em ", codigo: "Código →", online: "Ver online", vazio: "Nenhum projeto público por aqui ainda.", erro: "Não consegui carregar a lista agora. ", erroLink: "Veja os projetos direto no GitHub →" },
    en: { local: "en-US", semDescricao: "Public repository on GitHub.", atualizado: "Updated ", codigo: "Code →", online: "Live site", vazio: "No public projects here yet.", erro: "Couldn't load the list right now. ", erroLink: "See the projects on GitHub →" },
    es: { local: "es-ES", semDescricao: "Repositorio público en GitHub.", atualizado: "Actualizado en ", codigo: "Código →", online: "Ver en línea", vazio: "Todavía no hay proyectos públicos.", erro: "No he podido cargar la lista ahora. ", erroLink: "Ver los proyectos en GitHub →" }
  };
  const T = TEXTOS[IDIOMA] || TEXTOS.pt;

  function lerCache() {
    try {
      const c = JSON.parse(sessionStorage.getItem(CHAVE) || "null");
      if (c && Date.now() - c.t < VALIDADE) return c.dados;
    } catch (e) { /* sem cache */ }
    return null;
  }
  function gravarCache(dados) {
    try { sessionStorage.setItem(CHAVE, JSON.stringify({ t: Date.now(), dados: dados })); } catch (e) { /* sem cache */ }
  }

  function el(tag, classe, texto) {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  }
  function link(href, texto, classe) {
    const a = el("a", classe, texto);
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }
  function dataBr(iso) {
    try { return new Date(iso).toLocaleDateString(T.local, { month: "short", year: "numeric" }); }
    catch (e) { return ""; }
  }
  function nomeBonito(nome) {
    return nome.replace(/[-_]+/g, " ");
  }

  function cartao(r) {
    const card = el("article", "card repo-card");
    const h3 = el("h3");
    h3.appendChild(link(r.html_url, nomeBonito(r.name)));
    card.appendChild(h3);
    card.appendChild(el("p", null, r.description || T.semDescricao));

    const meta = el("div", "repo-meta");
    if (r.language) meta.appendChild(el("span", "lang", r.language));
    if (r.stargazers_count) meta.appendChild(el("span", null, "★ " + r.stargazers_count));
    meta.appendChild(el("span", null, T.atualizado + dataBr(r.pushed_at || r.updated_at)));
    card.appendChild(meta);

    const links = el("div", "repo-links");
    links.appendChild(link(r.html_url, T.codigo));
    if (r.homepage && /^https?:\/\//.test(r.homepage)) links.appendChild(link(r.homepage, T.online, "live"));
    card.appendChild(links);
    return card;
  }

  function render(alvo, repos) {
    alvo.innerHTML = "";
    const lista = repos
      .filter(function (r) { return !r.fork && !r.archived && !r.private; })
      .sort(function (a, b) { return new Date(b.pushed_at) - new Date(a.pushed_at); });
    if (!lista.length) {
      alvo.appendChild(el("p", "repo-status", T.vazio));
      return;
    }
    lista.forEach(function (r) { alvo.appendChild(cartao(r)); });
  }

  function erro(alvo) {
    alvo.innerHTML = "";
    const p = el("p", "repo-status", T.erro);
    p.appendChild(link("https://github.com/" + USUARIO + "?tab=repositories", T.erroLink));
    alvo.appendChild(p);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const alvo = document.getElementById("lista-projetos");
    if (!alvo) return;
    const cache = lerCache();
    if (cache) { render(alvo, cache); return; }
    fetch(URL, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (dados) { gravarCache(dados); render(alvo, dados); })
      .catch(function () { erro(alvo); });
  });
})();
