// Caixa da seção de experiência com rolagem vertical: botões ↑ ↓, bolinhas e teclado.
// Sem este script a caixa continua rolando normalmente.
(function () {
  var IDIOMA = (document.documentElement.lang || "pt").slice(0, 2);
  var R = {
    pt: { sobe: "Experiência anterior", desce: "Próxima experiência", ir: "Ir para a experiência " },
    en: { sobe: "Previous role", desce: "Next role", ir: "Go to role " },
    es: { sobe: "Experiencia anterior", desce: "Siguiente experiencia", ir: "Ir a la experiencia " }
  }[IDIOMA] || { sobe: "Anterior", desce: "Próxima", ir: "Ir para " };

  function montar(raiz) {
    var trilho = raiz.querySelector(".slides");
    if (!trilho) return;
    var itens = trilho.children;
    var total = itens.length;
    if (total < 2) return;

    function botao(texto, rotulo, classe) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = texto;
      b.setAttribute("aria-label", rotulo);
      if (classe) b.className = classe;
      return b;
    }

    var controles = document.createElement("div");
    controles.className = "slider-controls";
    var pontos = document.createElement("div");
    pontos.className = "slider-dots";
    var setas = document.createElement("div");
    setas.className = "slider-arrows";
    var sobe = botao("↑", R.sobe, "sobe");
    var desce = botao("↓", R.desce, "desce");
    setas.appendChild(sobe);
    setas.appendChild(desce);

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

    // Posição de cada item dentro da caixa (os cartões têm alturas diferentes).
    function topo(n) { return itens[n].offsetTop - itens[0].offsetTop; }
    function maxScroll() { return trilho.scrollHeight - trilho.clientHeight; }
    function atual() {
      var y = trilho.scrollTop;
      if (y >= maxScroll() - 4) return total - 1;
      var melhor = 0;
      for (var i = 0; i < total; i++) {
        if (Math.abs(topo(i) - y) < Math.abs(topo(melhor) - y)) melhor = i;
      }
      return melhor;
    }

    // Cliques seguidos durante a animação partem do destino, não da posição intermediária.
    var alvo = 0, ultimoClique = 0;
    function base() { return Date.now() - ultimoClique < 700 ? alvo : atual(); }
    function irPara(n) {
      n = Math.max(0, Math.min(n, total - 1));
      alvo = n;
      ultimoClique = Date.now();
      var y = Math.min(topo(n), maxScroll());
      if (trilho.scrollTo) trilho.scrollTo({ top: y, behavior: "smooth" });
      else trilho.scrollTop = y;
    }

    function atualizar() {
      var a = atual();
      var y = trilho.scrollTop;
      var noTopo = y <= 4;
      var noFim = y >= maxScroll() - 4;
      for (var i = 0; i < bolinhas.length; i++) {
        bolinhas[i].setAttribute("aria-current", i === a ? "true" : "false");
      }
      sobe.disabled = noTopo;
      desce.disabled = noFim;
      if (noTopo) raiz.classList.remove("tem-acima"); else raiz.classList.add("tem-acima");
      if (noFim) raiz.classList.remove("tem-abaixo"); else raiz.classList.add("tem-abaixo");
    }

    sobe.addEventListener("click", function () { irPara(base() - 1); });
    desce.addEventListener("click", function () { irPara(base() + 1); });
    trilho.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "Down") { e.preventDefault(); irPara(base() + 1); }
      if (e.key === "ArrowUp" || e.key === "Up") { e.preventDefault(); irPara(base() - 1); }
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
