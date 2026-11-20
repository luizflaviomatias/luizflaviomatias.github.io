// Lista sanfonada da seção de experiência: clicar na empresa abre o cargo e a descrição,
// fechando a que estava aberta. Sem este script todas as descrições ficam visíveis.
(function () {
  var CLASSE_ABERTA = "exp-aberta";

  function montar(lista) {
    var botoes = lista.querySelectorAll(".exp-botao");

    function definirAberta(botao, aberta) {
      botao.setAttribute("aria-expanded", aberta ? "true" : "false");
      botao.closest(".exp").classList.toggle(CLASSE_ABERTA, aberta);
    }

    function alternar(botaoClicado) {
      var abrir = botaoClicado.getAttribute("aria-expanded") !== "true";
      for (var i = 0; i < botoes.length; i++) definirAberta(botoes[i], false);
      if (abrir) definirAberta(botaoClicado, true);
    }

    for (var i = 0; i < botoes.length; i++) {
      botoes[i].addEventListener("click", function (e) { alternar(e.currentTarget); });
    }
    lista.classList.add("acordeao-pronto");
  }

  function iniciar() {
    var listas = document.querySelectorAll("[data-acordeao]");
    for (var i = 0; i < listas.length; i++) montar(listas[i]);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
