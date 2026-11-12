// Carrossel da seção de experiência: setas, bolinhas e teclado sobre uma lista com rolagem horizontal (scroll-snap).
// Sem este script a lista continua navegável arrastando ou rolando para o lado.
(function () {
  var IDIOMA = (document.documentElement.lang || "pt").slice(0, 2);
  var R = {
    pt: { ant: "Experiência anterior", prox: "Próxima experiência", ir: "Ir para a experiência " },
    en: { ant: "Previous role", prox: "Next role", ir: "Go to role " },
    es: { ant: "Experiencia anterior", prox: "Siguiente experiencia", ir: "Ir a la experiencia " }
  }[IDIOMA] || null;
  if (!R) R = { ant: "Anterior", prox: "Próxima", ir: "Ir para " };

  function montar(raiz) {
    var trilho = raiz.querySelector(".slides");
    if (!trilho) return;
    var slides = trilho.children;
    var total = slides.length;
    if (total < 2) return;

    var controles = document.createElement("div");
    controles.className = "slider-controls";
    var pontos = document.createElement("div");
    pontos.className = "slider-dots";
    var setas = document.createElement("div");
    setas.className = "slider-arrows";

    function botao(texto, rotulo) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = texto;
      b.setAttribute("aria-label", rotulo);
      return b;
    }
    var anterior = botao("←", R.ant);
    var proximo = botao("→", R.prox);
    setas.appendChild(anterior);
    setas.appendChild(proximo);

    var bolinhas = [];
    for (var i = 0; i < total; i++) {
      (function (n) {
        var d = botao("", R.ir + (n + 1));
        d.addEventListener("click", function () { irPara(n); });
        pontos.appendChild(d);
        bolinhas.push(d);
      })(i);
    }
    controles.appendChild(pontos);
    controles.appendChild(setas);
    raiz.appendChild(controles);

    function passo() {
      return slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : trilho.clientWidth;
    }
    function porTela() {
      return Math.max(1, Math.round(trilho.clientWidth / passo()));
    }
    function atual() {
      return Math.round(trilho.scrollLeft / passo());
    }
    // Durante a animação o scroll ainda não chegou ao destino; cliques seguidos partem do alvo, não da posição atual.
    var alvo = 0, ultimoClique = 0;
    function base() {
      return Date.now() - ultimoClique < 700 ? alvo : atual();
    }
    function irPara(n) {
      var max = total - porTela();
      n = Math.max(0, Math.min(n, max));
      alvo = n;
      ultimoClique = Date.now();
      trilho.scrollLeft = n * passo();
      if (trilho.scrollTo) trilho.scrollTo({ left: n * passo(), behavior: "smooth" });
    }
    function atualizar() {
      var a = atual();
      var visiveis = porTela();
      var fim = trilho.scrollLeft + trilho.clientWidth >= trilho.scrollWidth - 4;
      for (var i = 0; i < bolinhas.length; i++) {
        var ativo = i >= a && i < a + visiveis;
        bolinhas[i].setAttribute("aria-current", ativo ? "true" : "false");
      }
      anterior.disabled = trilho.scrollLeft <= 4;
      proximo.disabled = fim;
    }

    anterior.addEventListener("click", function () { irPara(base() - 1); });
    proximo.addEventListener("click", function () { irPara(base() + 1); });
    trilho.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight" || e.key === "Right") { e.preventDefault(); irPara(base() + 1); }
      if (e.key === "ArrowLeft" || e.key === "Left") { e.preventDefault(); irPara(base() - 1); }
    });
    var agendado = false;
    trilho.addEventListener("scroll", function () {
      if (agendado) return;
      agendado = true;
      (window.requestAnimationFrame || setTimeout)(function () { agendado = false; atualizar(); });
    });
    window.addEventListener("resize", atualizar);
    atualizar();
  }

  function iniciar() {
    var lista = document.querySelectorAll("[data-slider]");
    for (var i = 0; i < lista.length; i++) montar(lista[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
