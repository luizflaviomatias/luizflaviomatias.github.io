// Tema claro/escuro (claro é o padrão) e menu para celular/tablet.
// Lembra a escolha do visitante quando o navegador permite; sem storage, falha em silêncio.
(function () {
  var raiz = document.documentElement;
  var CHAVE = "tema";
  var IDIOMA = (raiz.lang || "pt").slice(0, 2);
  var ROTULOS = {
    pt: { claro: "Usar tema claro", escuro: "Usar tema escuro", abrir: "Abrir menu", fechar: "Fechar menu" },
    en: { claro: "Switch to light theme", escuro: "Switch to dark theme", abrir: "Open menu", fechar: "Close menu" },
    es: { claro: "Usar tema claro", escuro: "Usar tema oscuro", abrir: "Abrir menú", fechar: "Cerrar menú" }
  };
  var R = ROTULOS[IDIOMA] || ROTULOS.pt;

  function ler() {
    try { return window.localStorage.getItem(CHAVE); } catch (e) { return null; }
  }
  function gravar(valor) {
    try { window.localStorage.setItem(CHAVE, valor); } catch (e) { /* sem persistência */ }
  }
  function temaEfetivo() {
    return raiz.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }
  function aplicar(tema) {
    raiz.setAttribute("data-theme", tema);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", tema === "dark" ? "#070d1c" : "#1d4ed8");
  }
  function atualizarBotao(botao) {
    var escuro = temaEfetivo() === "dark";
    botao.textContent = escuro ? "☀" : "☾";
    botao.setAttribute("aria-label", escuro ? R.claro : R.escuro);
  }

  // Só fica escuro se o visitante escolheu antes; caso contrário, claro.
  aplicar(ler() === "dark" ? "dark" : "light");

  function iniciar() {
    var botao = document.querySelector(".theme-toggle");
    if (botao) {
      atualizarBotao(botao);
      botao.addEventListener("click", function () {
        var novo = temaEfetivo() === "dark" ? "light" : "dark";
        aplicar(novo);
        gravar(novo);
        atualizarBotao(botao);
      });
    }

    var topo = document.querySelector(".topbar");
    var menu = document.querySelector(".menu-toggle");
    var nav = document.getElementById("menu-principal");
    if (!topo || !menu || !nav) return;

    function definirMenu(aberto) {
      if (aberto) topo.classList.add("menu-aberto"); else topo.classList.remove("menu-aberto");
      menu.setAttribute("aria-expanded", aberto ? "true" : "false");
      menu.setAttribute("aria-label", aberto ? R.fechar : R.abrir);
    }
    menu.addEventListener("click", function () {
      definirMenu(!topo.classList.contains("menu-aberto"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target && e.target.tagName === "A") definirMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Esc") definirMenu(false);
    });
    document.addEventListener("click", function (e) {
      if (!topo.contains(e.target)) definirMenu(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth >= 860) definirMenu(false);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
