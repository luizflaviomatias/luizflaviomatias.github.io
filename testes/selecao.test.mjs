import { test } from "node:test";
import assert from "node:assert/strict";
import { selecionarMaisRelevantes, agruparHistorias, mesmaHistoria } from "../motor-noticias/selecao.mjs";
import { palavrasDoTitulo } from "../motor-noticias/texto.mjs";
import { AGORA, MANCHETES_DISTINTAS, item } from "./apoio.mjs";

const titulos = (itens) => itens.map((i) => i.titulo);

test("reconhece a mesma história contada por fontes diferentes", () => {
  const a = palavrasDoTitulo("Luiz Trabuco chega a Brasília para se reunir com Lula");
  const b = palavrasDoTitulo("Ibovespa salta com ida de Trabuco a Brasília para encontrar Lula");
  assert.ok(mesmaHistoria(a, b));
});

test("não junta histórias que só dividem uma palavra", () => {
  const a = palavrasDoTitulo("Lula sanciona ajuste fiscal aprovado no Congresso");
  const b = palavrasDoTitulo("Lula viaja à Ásia para ampliar comércio com a Asean");
  assert.equal(mesmaHistoria(a, b), false);
});

test("agrupa repetições e conta as fontes distintas", () => {
  const historias = agruparHistorias([
    item("Senado aprova reforma tributária do consumo", { fonte: "g1", horas: 2 }),
    item("Reforma tributária do consumo é aprovada pelo Senado", { fonte: "Agência Senado", horas: 1 }),
    item("Chuva forte atinge São Paulo", { fonte: "g1", horas: 1 })
  ]);
  assert.equal(historias.length, 2);
  const reforma = historias.find((h) => h.fontes.size === 2);
  assert.equal(reforma.principal.fonte, "Agência Senado", "o item mais recente representa o grupo");
});

test("seleciona exatamente 5 e põe primeiro a história com mais fontes", () => {
  const itens = [
    ...MANCHETES_DISTINTAS.slice(0, 5).map((titulo, i) => item(titulo, { fonte: "ABCDE"[i], horas: i % 2 })),
    item("Banco Central mantém juros básicos em quinze por cento", { fonte: "A", horas: 10 }),
    item("Juros básicos ficam em quinze por cento, decide Banco Central", { fonte: "B", horas: 9 })
  ];
  const escolhidos = selecionarMaisRelevantes(itens, AGORA);
  assert.equal(escolhidos.length, 5);
  assert.equal(escolhidos[0].fontes, 2);
  assert.match(escolhidos[0].titulo, /juros/i);
});

test("entre histórias com a mesma cobertura, a mais recente vem antes", () => {
  const escolhidos = selecionarMaisRelevantes(
    [item("Antiga manchete de ontem à tarde", { fonte: "A", horas: 20 }), item("Nova manchete desta manhã", { fonte: "B", horas: 1 })],
    AGORA
  );
  assert.deepEqual(titulos(escolhidos), ["Nova manchete desta manhã", "Antiga manchete de ontem à tarde"]);
});

test("no máximo 2 manchetes da mesma fonte quando há alternativas", () => {
  const itens = MANCHETES_DISTINTAS.slice(0, 7).map((titulo, i) => item(titulo, { fonte: i < 4 ? "A" : "BCD"[i - 4], horas: i }));
  const escolhidos = selecionarMaisRelevantes(itens, AGORA);
  assert.equal(escolhidos.filter((i) => i.fonte === "A").length, 2);
  assert.equal(escolhidos.length, 5);
});

test("com uma fonte só, completa as 5 mesmo passando do limite por fonte", () => {
  const itens = MANCHETES_DISTINTAS.slice(0, 6).map((titulo, i) => item(titulo, { fonte: "A", horas: i }));
  assert.equal(selecionarMaisRelevantes(itens, AGORA).length, 5);
});

test("amplia a janela para a semana quando o último dia e meio não basta", () => {
  const itens = [
    item("Recente um", { fonte: "A", horas: 2 }),
    item("Recente dois", { fonte: "B", horas: 3 }),
    item("Da semana três", { fonte: "C", horas: 50 }),
    item("Da semana quatro", { fonte: "D", horas: 80 }),
    item("Da semana cinco", { fonte: "E", horas: 100 }),
    item("Velha demais", { fonte: "F", horas: 24 * 8 })
  ];
  const escolhidos = selecionarMaisRelevantes(itens, AGORA);
  assert.equal(escolhidos.length, 5);
  assert.ok(!titulos(escolhidos).includes("Velha demais"));
});

test("publica título, link, fonte, data ISO, número de fontes e o tema quando houver", () => {
  const [publicado] = selecionarMaisRelevantes([item("Por que o dólar subiu hoje", { fonte: "A", horas: 1, link: "https://a.com/x", tema: "economia" })], AGORA);
  assert.deepEqual(publicado, {
    titulo: "Por que o dólar subiu hoje",
    link: "https://a.com/x",
    fonte: "A",
    data: "2026-11-27T08:00:00.000Z",
    fontes: 1,
    tema: "economia"
  });
});

test("lista vazia não quebra", () => {
  assert.deepEqual(selecionarMaisRelevantes([], AGORA), []);
});
