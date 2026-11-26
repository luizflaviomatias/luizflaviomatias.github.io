import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { criarRegras, ORDEM_DAS_CATEGORIAS } from "../motor-noticias/regras.mjs";
import { limparTitulo } from "../motor-noticias/texto.mjs";

const FONTES_REAIS = JSON.parse(readFileSync(new URL("../motor-noticias/fontes.json", import.meta.url), "utf8"));
const pt = criarRegras(FONTES_REAIS.pt, "pt");
const en = criarRegras(FONTES_REAIS.en, "en");
const es = criarRegras(FONTES_REAIS.es, "es");

const fonteSimples = { nome: "F", url: "https://f.com/feed" };
const noticia = (titulo, link = "https://f.com/noticias/1") => ({ titulo, link });

test("fontes.json: português tem as 6 categorias na ordem pedida", () => {
  assert.deepEqual(pt.categorias, ["tecnologia", "negocios", "politica-nacional", "politica-internacional", "economia", "curiosidades"]);
});

test("fontes.json: inglês e espanhol não têm política internacional", () => {
  const semInternacional = ORDEM_DAS_CATEGORIAS.filter((id) => id !== "politica-internacional");
  assert.deepEqual(en.categorias, semInternacional);
  assert.deepEqual(es.categorias, semInternacional);
});

test("fontes.json: todas as fontes usam https e têm nome", () => {
  for (const [idioma, config] of Object.entries(FONTES_REAIS))
    for (const { fontes } of Object.values(config.categorias))
      for (const fonte of fontes) assert.ok(fonte.nome && fonte.url.startsWith("https://"), `${idioma}: ${JSON.stringify(fonte)}`);
});

test("ofertas e Black Friday ficam de fora nos três idiomas", () => {
  assert.equal(pt.aceitaNaCategoria(noticia("Galaxy Watch 8 tem oferta agressiva na Black Week"), fonteSimples, "tecnologia"), false);
  assert.equal(pt.aceitaNaCategoria(noticia("Magalu derruba preço de Smart TV de 85”"), fonteSimples, "tecnologia"), false);
  assert.equal(pt.aceitaNaCategoria(noticia("Lenovo LOQ com preço em queda livre no Mercado Livre"), fonteSimples, "tecnologia"), false);
  assert.equal(pt.aceitaNaCategoria(noticia("Dell 14 ou Dell 15: qual notebook escolher em 2026?"), fonteSimples, "tecnologia"), false);
  assert.equal(en.aceitaNaCategoria(noticia("The best wifi extenders – tested"), fonteSimples, "tecnologia"), false);
  assert.equal(es.aceitaNaCategoria(noticia("Las mejores ofertas del Black Friday"), fonteSimples, "tecnologia"), false);
  assert.equal(pt.aceitaNaCategoria(noticia("Brasil lidera ranking de vítimas de ransomware"), fonteSimples, "tecnologia"), true);
});

test("incluirLinks deixa entrar só a seção certa de um feed misturado", () => {
  const infomoney = { ...fonteSimples, incluirLinks: "/mercados/|/economia/" };
  assert.equal(pt.aceitaNaCategoria(noticia("Ibovespa sobe", "https://im.com/mercados/x"), infomoney, "economia"), true);
  assert.equal(pt.aceitaNaCategoria(noticia("Michelle comenta dieta", "https://im.com/politica/x"), infomoney, "economia"), false);
});

test("excluirLinks tira seções de compras", () => {
  const tecnoblog = { ...fonteSimples, excluirLinks: "/achados/" };
  assert.equal(pt.aceitaNaCategoria(noticia("iPhone Air compete em preço", "https://tb.net/achados/x"), tecnoblog, "tecnologia"), false);
});

test("em feed geral com filtrarPorTema, só entra o que é do assunto da categoria", () => {
  const bbc = { ...fonteSimples, filtrarPorTema: true };
  assert.equal(pt.aceitaNaCategoria(noticia("Custo de vida e migração dominam campanha eleitoral na Espanha"), bbc, "politica-internacional"), true);
  assert.equal(pt.aceitaNaCategoria(noticia("O que ocorre no intestino de quem toma café"), bbc, "politica-internacional"), false);
});

test("curiosidade de fonte própria recebe o tema do assunto que toca", () => {
  assert.equal(pt.temaDaCuriosidade(noticia("Por que os matemáticos não conseguem ler a prova feita por IA?"), fonteSimples), "tecnologia");
  assert.equal(pt.temaDaCuriosidade(noticia("O que tem de grego no iogurte grego?"), fonteSimples), null);
});

test("curiosidade com exigirExplicativa precisa ser explicativa além de ter tema", () => {
  const bbcMundo = { ...fonteSimples, exigirExplicativa: true };
  assert.equal(es.temaDaCuriosidade(noticia("Efecto BYD: por qué Brasil se ha convertido en laboratorio para las empresas chinas"), bbcMundo), "negocios");
  assert.equal(es.temaDaCuriosidade(noticia("Las empresas chinas invierten en Brasil"), bbcMundo), null);
});

test("matéria explicativa: pergunta no começo ou depois de dois-pontos, não no meio da frase", () => {
  assert.equal(pt.ehExplicativa("Entenda a reforma tributária"), true);
  assert.equal(pt.ehExplicativa("Previram 34 dias e levaram 55: por que quase todo mundo erra o prazo"), true);
  assert.equal(pt.ehExplicativa("6 pontos de atenção na montagem do novo ministério"), true);
  assert.equal(es.ehExplicativa("Núñez exige a Page que explique por qué pide el voto"), false);
  assert.equal(en.ehExplicativa("Backblaze explains why it's sharing customer data"), false);
  assert.equal(en.ehExplicativa("Why Trump's new tariffs are less of a threat"), true);
});

test("tira prefixos de mídia do título", () => {
  assert.equal(limparTitulo("Áudio: Projeto afasta hipóteses"), "Projeto afasta hipóteses");
  assert.equal(limparTitulo("Watch:  Roofs torn off"), "Roofs torn off");
  assert.equal(limparTitulo("Por que: o título fica"), "Por que: o título fica");
});

test("configuração sem fontes numa categoria é recusada com o nome da categoria", () => {
  const quebrada = structuredClone(FONTES_REAIS.pt);
  quebrada.categorias.economia.fontes = [];
  assert.throws(() => criarRegras(quebrada, "pt"), /economia/);
});

test("categoria desconhecida no fontes.json é recusada", () => {
  const quebrada = structuredClone(FONTES_REAIS.pt);
  quebrada.categorias.esportes = quebrada.categorias.economia;
  assert.throws(() => criarRegras(quebrada, "pt"), /esportes/);
});
