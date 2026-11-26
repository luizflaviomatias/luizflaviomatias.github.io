import { test } from "node:test";
import assert from "node:assert/strict";
import { lerFeed, FeedInvalidoError } from "../motor-noticias/feed.mjs";

test("lê RSS com CDATA e entidades", () => {
  const xml = `<rss version="2.0"><channel>
    <item><title><![CDATA[Câmara aprova “marco” &amp; mais]]></title><link>https://a.com/1</link><pubDate>Thu, 26 Nov 2026 17:31:00 -0300</pubDate></item>
    <item><title>Dólar cai &#8211; Bolsa &#x2191;</title><link>https://a.com/2</link><pubDate>Thu, 26 Nov 2026 20:00:00 GMT</pubDate></item>
  </channel></rss>`;
  const itens = lerFeed(xml);
  assert.equal(itens.length, 2);
  assert.equal(itens[0].titulo, "Câmara aprova “marco” & mais");
  assert.equal(itens[0].data.toISOString(), "2026-11-26T20:31:00.000Z");
  assert.equal(itens[1].titulo, "Dólar cai – Bolsa ↑");
});

test("lê Atom usando o link alternate e a data de publicação", () => {
  const xml = `<feed xmlns="http://www.w3.org/2005/Atom">
    <entry><title type="html">Why prices rise</title>
      <link rel="self" href="https://a.com/api/1"/><link rel="alternate" href="https://a.com/artigo-1"/>
      <published>2026-11-25T13:39:48Z</published><updated>2026-11-26T10:00:00Z</updated></entry>
  </feed>`;
  const [item] = lerFeed(xml);
  assert.equal(item.link, "https://a.com/artigo-1");
  assert.equal(item.data.toISOString(), "2026-11-25T13:39:48.000Z");
});

test("usa o guid permanente quando o item não tem link", () => {
  const xml = `<rss><channel><item><title>Sem link</title><guid>https://a.com/guid</guid><pubDate>Thu, 26 Nov 2026 20:00:00 GMT</pubDate></item></channel></rss>`;
  assert.equal(lerFeed(xml)[0].link, "https://a.com/guid");
});

test("descarta itens sem data válida ou sem link http", () => {
  const xml = `<rss><channel>
    <item><title>Sem data</title><link>https://a.com/1</link></item>
    <item><title>Link estranho</title><link>javascript:alert(1)</link><pubDate>Thu, 26 Nov 2026 20:00:00 GMT</pubDate></item>
    <item><title>Válido</title><link>https://a.com/3</link><pubDate>Thu, 26 Nov 2026 20:00:00 GMT</pubDate></item>
  </channel></rss>`;
  assert.deepEqual(lerFeed(xml).map((item) => item.titulo), ["Válido"]);
});

test("página HTML no lugar do feed é erro de feed inválido", () => {
  assert.throws(() => lerFeed("<!DOCTYPE html><html><body>Página não encontrada</body></html>"), FeedInvalidoError);
});

test("feed sem nenhum item aproveitável é erro", () => {
  assert.throws(() => lerFeed("<rss><channel><title>Vazio</title></channel></rss>"), FeedInvalidoError);
});

test("conteúdo vazio é erro", () => {
  assert.throws(() => lerFeed(""), FeedInvalidoError);
});
