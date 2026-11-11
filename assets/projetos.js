// Lista os repositórios públicos do GitHub (sem forks), do mais recente para o mais antigo.
// Usa a API pública (sem token) e guarda o resultado por 1 hora para não esbarrar no limite de requisições.
(function () {
  const USUARIO = "luizflaviomatias";
  const URL = "https://api.github.com/users/" + USUARIO + "/repos?per_page=100&sort=updated";
  const CHAVE = "repos-cache-v1";
  const VALIDADE = 60 * 60 * 1000;

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
    try { return new Date(iso).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }); }
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
    card.appendChild(el("p", null, r.description || "Repositório público no GitHub."));

    const meta = el("div", "repo-meta");
    if (r.language) meta.appendChild(el("span", "lang", r.language));
    if (r.stargazers_count) meta.appendChild(el("span", null, "★ " + r.stargazers_count));
    meta.appendChild(el("span", null, "Atualizado em " + dataBr(r.pushed_at || r.updated_at)));
    card.appendChild(meta);

    const links = el("div", "repo-links");
    links.appendChild(link(r.html_url, "Código →"));
    if (r.homepage && /^https?:\/\//.test(r.homepage)) links.appendChild(link(r.homepage, "Ver online", "live"));
    card.appendChild(links);
    return card;
  }

  function render(alvo, repos) {
    alvo.innerHTML = "";
    const lista = repos
      .filter(function (r) { return !r.fork && !r.archived && !r.private; })
      .sort(function (a, b) { return new Date(b.pushed_at) - new Date(a.pushed_at); });
    if (!lista.length) {
      alvo.appendChild(el("p", "repo-status", "Nenhum projeto público por aqui ainda."));
      return;
    }
    lista.forEach(function (r) { alvo.appendChild(cartao(r)); });
  }

  function erro(alvo) {
    alvo.innerHTML = "";
    const p = el("p", "repo-status", "Não consegui carregar a lista agora. ");
    p.appendChild(link("https://github.com/" + USUARIO + "?tab=repositories", "Veja os projetos direto no GitHub →"));
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
