import { test } from "node:test";
import assert from "node:assert/strict";
import { atualizarIdioma, categoriasIncompletas } from "../motor-noticias/motor.mjs";
import { AGORA, MANCHETES_DISTINTAS, horasAtras, rss } from "./apoio.mjs";

// Idioma de teste com três categorias pequenas, uma fonte em cada.
const CONFIG = {
  excluirTitulos: "\\boferta",
  explicativa: "^(por que|entenda)( |$)",
  categorias: {
    tecnologia: { palavrasChave: ["software", "chip*"], fontes: [{ nome: "Tec", url: "https://tec/feed" }] },
    economia: { palavrasChave: ["juros", "inflac*"], fontes: [{ nome: "Eco", url: "https://eco/feed" }] },
    curiosidades: { fontes: [{ nome: "Curi", url: "https://curi/feed" }] }
  }
};

const manchetes = (prefixo, quantidade) =>
  MANCHETES_DISTINTAS.slice(0, quantidade).map((titulo, i) => ({
    titulo: `${titulo} (${prefixo})`,
    link: `https://${prefixo.toLowerCase()}/${i}`,
    data: horasAtras(i + 1)
  }));

function buscadorFalso(feeds) {
  return async (url) => {
    if (!(url in feeds)) throw new Error(`não consegui baixar ${url}: HTTP 503`);
    return feeds[url];
  };
}

const atualizar = (feeds, anterior = null) =>
  atualizarIdioma({ idioma: "pt", config: CONFIG, buscarXml: buscadorFalso(feeds), anterior, agora: AGORA });

const FEEDS_OK = {
  "https://tec/feed": rss(manchetes("Software", 6)),
  "https://eco/feed": rss(manchetes("Juros", 6)),
  "https://curi/feed": rss([
    { titulo: "Por que o chip ficou tão caro", link: "https://curi/1", data: horasAtras(2) },
    { titulo: "Entenda a inflação dos alimentos", link: "https://curi/2", data: horasAtras(3) },
    { titulo: "O segredo dos gatos", link: "https://curi/3", data: horasAtras(1) }
  ])
};

test("cada categoria sai com 5 notícias, na ordem configurada", async () => {
  const resultado = await atualizar(FEEDS_OK);
  assert.deepEqual(resultado.categorias.map((c) => c.id), ["tecnologia", "economia", "curiosidades"]);
  assert.equal(resultado.categorias[0].itens.length, 5);
  assert.equal(resultado.categorias[1].itens.length, 5);
  assert.deepEqual(resultado.fontesComFalha, []);
  assert.equal(resultado.atualizadoEm, AGORA.toISOString());
});

test("curiosidades só aceitam o que toca num tema e levam o tema junto", async () => {
  const { categorias } = await atualizar(FEEDS_OK);
  const curiosidades = categorias.find((c) => c.id === "curiosidades").itens;
  assert.deepEqual(
    curiosidades.map((i) => [i.titulo, i.tema]),
    [["Por que o chip ficou tão caro", "tecnologia"], ["Entenda a inflação dos alimentos", "economia"]]
  );
});

test("matéria explicativa de outra categoria pode virar curiosidade se sobrou", async () => {
  const feeds = {
    ...FEEDS_OK,
    "https://eco/feed": rss([...manchetes("Juros", 5), { titulo: "Por que os juros não caem", link: "https://eco/explica", data: horasAtras(30) }])
  };
  const { categorias } = await atualizar(feeds);
  const curiosidades = categorias.find((c) => c.id === "curiosidades").itens;
  assert.ok(curiosidades.some((i) => i.link === "https://eco/explica" && i.tema === "economia"));
});

test("o mesmo link nunca aparece em duas categorias", async () => {
  const feeds = { ...FEEDS_OK, "https://eco/feed": rss([{ titulo: "Por que os juros não caem", link: "https://eco/explica", data: horasAtras(1) }]) };
  const { categorias } = await atualizar(feeds);
  const links = categorias.flatMap((c) => c.itens.map((i) => i.link));
  assert.equal(new Set(links).size, links.length);
});

test("feed fora do ar não derruba as outras categorias e fica registrado", async () => {
  const { "https://eco/feed": _foraDoAr, ...semEconomia } = FEEDS_OK;
  const resultado = await atualizar(semEconomia);
  assert.equal(resultado.categorias.find((c) => c.id === "tecnologia").itens.length, 5);
  assert.deepEqual(resultado.fontesComFalha.map((f) => f.fonte), ["Eco"]);
  assert.match(resultado.fontesComFalha[0].erro, /HTTP 503/);
});

test("feed que devolve HTML no lugar do RSS conta como falha", async () => {
  const resultado = await atualizar({ ...FEEDS_OK, "https://eco/feed": "<html><body>Manutenção</body></html>" });
  assert.equal(resultado.fontesComFalha[0].fonte, "Eco");
});

test("categoria sem feed usa as notícias publicadas antes, se forem da última semana", async () => {
  const { "https://eco/feed": _foraDoAr, ...semEconomia } = FEEDS_OK;
  const anterior = {
    categorias: [
      {
        id: "economia",
        itens: [
          { titulo: "Publicada ontem", link: "https://eco/ontem", fonte: "Eco", data: horasAtras(24).toISOString(), fontes: 1 },
          { titulo: "Publicada há 10 dias", link: "https://eco/velha", fonte: "Eco", data: horasAtras(240).toISOString(), fontes: 1 }
        ]
      }
    ]
  };
  const resultado = await atualizar(semEconomia, anterior);
  const economia = resultado.categorias.find((c) => c.id === "economia").itens;
  assert.deepEqual(economia.map((i) => i.titulo), ["Publicada ontem"]);
  assert.deepEqual(categoriasIncompletas(resultado), ["economia", "curiosidades"]);
});

test("com todos os feeds fora do ar e nada anterior, as categorias ficam vazias", async () => {
  const resultado = await atualizar({});
  assert.ok(resultado.categorias.every((c) => c.itens.length === 0));
  assert.equal(resultado.fontesComFalha.length, 3);
});

test("ofertas são descartadas antes da seleção", async () => {
  const feeds = {
    ...FEEDS_OK,
    "https://tec/feed": rss([{ titulo: "Software com oferta imperdível", link: "https://tec/oferta", data: horasAtras(0) }, ...manchetes("Software", 5)])
  };
  const { categorias } = await atualizar(feeds);
  assert.ok(!categorias[0].itens.some((i) => i.link === "https://tec/oferta"));
});
