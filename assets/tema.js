// Alterna o tema claro/escuro e lembra a escolha do visitante (falha silenciosamente sem storage).
(function () {
  const raiz = document.documentElement;
  const CHAVE = "tema";

  function ler() {
    try { return localStorage.getItem(CHAVE); } catch (e) { return null; }
  }
  function gravar(valor) {
    try { localStorage.setItem(CHAVE, valor); } catch (e) { /* sem persistência */ }
  }
  function temaEfetivo() {
    if (raiz.dataset.theme) return raiz.dataset.theme;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function atualizarBotao(botao) {
    const escuro = temaEfetivo() === "dark";
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", escuro ? "#070d1c" : "#1d4ed8");
    botao.textContent = escuro ? "☀" : "☾";
    const rotulos = {
      pt: ["Usar tema claro", "Usar tema escuro"],
      en: ["Switch to light theme", "Switch to dark theme"],
      es: ["Usar tema claro", "Usar tema oscuro"]
    }[(raiz.lang || "pt").slice(0, 2)] || ["Usar tema claro", "Usar tema escuro"];
    botao.setAttribute("aria-label", escuro ? rotulos[0] : rotulos[1]);
  }

  const salvo = ler();
  if (salvo === "dark" || salvo === "light") raiz.dataset.theme = salvo;

  document.addEventListener("DOMContentLoaded", function () {
    const botao = document.querySelector(".theme-toggle");
    if (!botao) return;
    atualizarBotao(botao);
    botao.addEventListener("click", function () {
      const novo = temaEfetivo() === "dark" ? "light" : "dark";
      raiz.dataset.theme = novo;
      gravar(novo);
      atualizarBotao(botao);
    });
  });
})();
