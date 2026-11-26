import { test } from "node:test";
import assert from "node:assert/strict";
import { criarBuscador } from "../motor-noticias/buscador.mjs";

const resposta = (status, corpo = "") => ({ ok: status >= 200 && status < 300, status, text: async () => corpo });
const RAPIDO = { esperaEntreTentativasMs: 0, tempoLimiteMs: 50 };

test("devolve o corpo quando o feed responde", async () => {
  const buscar = criarBuscador({ ...RAPIDO, fetch: async () => resposta(200, "<rss/>") });
  assert.equal(await buscar("https://a/feed"), "<rss/>");
});

test("tenta de novo uma vez antes de desistir", async () => {
  let chamadas = 0;
  const buscar = criarBuscador({ ...RAPIDO, fetch: async () => (++chamadas === 1 ? resposta(502) : resposta(200, "<rss/>")) });
  assert.equal(await buscar("https://a/feed"), "<rss/>");
  assert.equal(chamadas, 2);
});

test("feed fora do ar vira erro com a URL e o status", async () => {
  const buscar = criarBuscador({ ...RAPIDO, fetch: async () => resposta(503) });
  await assert.rejects(buscar("https://a/feed"), /https:\/\/a\/feed: HTTP 503/);
});

test("feed que não responde é abandonado no tempo limite", async () => {
  const travado = (_url, { signal }) =>
    new Promise((_resolve, rejeitar) => signal.addEventListener("abort", () => rejeitar(new Error("tempo esgotado"))));
  const buscar = criarBuscador({ ...RAPIDO, fetch: travado });
  await assert.rejects(buscar("https://lento/feed"), /lento\/feed: tempo esgotado/);
});

test("erro de rede (DNS, conexão recusada) também vira erro com a URL", async () => {
  const buscar = criarBuscador({ ...RAPIDO, fetch: async () => { throw new TypeError("fetch failed"); } });
  await assert.rejects(buscar("https://sumiu/feed"), /sumiu\/feed: fetch failed/);
});
