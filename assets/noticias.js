// Monta a área de Notícias a partir do JSON que a engine diária grava em noticias/dados/<idioma>.json.
// Só título, fonte e data; o link leva para a matéria no site de origem.
(function () {
  var IDIOMA = (document.documentElement.lang || "pt-BR").slice(0, 2);
  var TEXTOS = {
    pt: {
      local: "pt-BR", atualizado: "Atualizado em ", emFontes: function (n) { return "em " + n + " fontes"; },
      erro: "Não consegui carregar as notícias agora. Tente de novo em instantes.",
      categorias: { tecnologia: "Tecnologia", negocios: "Gestão de negócios", "politica-nacional": "Política nacional", "politica-internacional": "Política internacional", economia: "Economia", curiosidades: "Curiosidades" }
    },
    en: {
      local: "en-US", atualizado: "Updated ", emFontes: function (n) { return "in " + n + " sources"; },
      erro: "Couldn't load the news right now. Please try again shortly.",
      categorias: { tecnologia: "Technology", negocios: "Business management", "politica-nacional": "Politics", economia: "Economy", curiosidades: "Curiosities" }
    },
    es: {
      local: "es-ES", atualizado: "Actualizado el ", emFontes: function (n) { return "en " + n + " fuentes"; },
      erro: "No he podido cargar las noticias ahora. Inténtalo de nuevo en un momento.",
      categorias: { tecnologia: "Tecnología", negocios: "Gestión empresarial", "politica-nacional": "Política", economia: "Economía", curiosidades: "Curiosidades" }
    }
  };
  var ICONES = { tecnologia: "💻", negocios: "📊", "politica-nacional": "🏛️", "politica-internacional": "🌎", economia: "💰", curiosidades: "💡" };
  var T = TEXTOS[IDIOMA] || TEXTOS.pt;

  function el(tag, classe, texto) {
    var n = document.createElement(tag);
    if (classe) n.className = classe;
    if (texto != null) n.textContent = texto;
    return n;
  }

  // "27 nov, 06:00" (pt/es) ou "Nov 27, 6:00 AM" (en), no fuso de quem está lendo.
  function dataCurta(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    if (IDIOMA === "en") return d.toLocaleString(T.local, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    var mes = d.toLocaleString(T.local, { month: "short" }).replace(".", "");
    var hora = d.toLocaleTimeString(T.local, { hour: "2-digit", minute: "2-digit" });
    return d.getDate() + " " + mes + ", " + hora;
  }

  function meta(item) {
    var partes = [item.fonte, dataCurta(item.data)];
    if (item.fontes > 1) partes.push(T.emFontes(item.fontes));
    if (item.tema && T.categorias[item.tema]) partes.push(T.categorias[item.tema]);
    return partes.filter(Boolean).join(" · ");
  }

  function linhaDaNoticia(item) {
    var li = el("li");
    var a = el("a", null, item.titulo);
    a.href = item.link;
    a.target = "_blank";
    a.rel = "noopener";
    li.appendChild(a);
    li.appendChild(el("span", "meta", meta(item)));
    return li;
  }

  function cartao(categoria) {
    var card = el("article", "card");
    card.id = categoria.id;
    card.appendChild(el("span", "icon", ICONES[categoria.id] || "📰")).setAttribute("aria-hidden", "true");
    card.appendChild(el("h3", null, T.categorias[categoria.id] || categoria.id));
    var lista = el("ol", "list noticias-lista");
    categoria.itens.forEach(function (item) { lista.appendChild(linhaDaNoticia(item)); });
    card.appendChild(lista);
    return card;
  }

  function atalho(categoria) {
    var a = el("a", "chip", T.categorias[categoria.id] || categoria.id);
    a.href = "#" + categoria.id;
    return a;
  }

  function renderizar(raiz, dados) {
    var categorias = dados.categorias.filter(function (c) { return c.itens && c.itens.length; });
    var atalhos = raiz.querySelector("[data-atalhos]");
    var grade = raiz.querySelector("[data-grade]");
    var selo = raiz.querySelector("[data-atualizado]");
    grade.innerHTML = "";
    categorias.forEach(function (c) {
      atalhos.appendChild(atalho(c));
      grade.appendChild(cartao(c));
    });
    selo.textContent = T.atualizado + dataCurta(dados.atualizadoEm);
    selo.hidden = false;
    // Se a página abriu já com #categoria no endereço, pula até ela agora que existe (sem animação, como o navegador faria).
    if (location.hash) {
      var alvo = document.getElementById(location.hash.slice(1));
      if (alvo) alvo.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }

  function erro(raiz) {
    var grade = raiz.querySelector("[data-grade]");
    grade.innerHTML = "";
    grade.appendChild(el("p", "repo-status", T.erro));
  }

  document.addEventListener("DOMContentLoaded", function () {
    var raiz = document.getElementById("noticias");
    if (!raiz || !window.fetch) return;
    // A engine publica uma vez por dia; "no-cache" só revalida com o servidor, sem baixar de novo se nada mudou.
    fetch(raiz.getAttribute("data-dados"), { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (dados) { renderizar(raiz, dados); })
      .catch(function () { erro(raiz); });
  });
})();
