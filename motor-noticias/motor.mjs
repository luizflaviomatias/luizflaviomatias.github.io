// Monta as notícias de um idioma: busca os feeds, filtra, escolhe as 5 mais relevantes por categoria
// e, se uma categoria ficar incompleta (feed fora do ar), completa com o que estava publicado antes.
import { lerFeed } from "./feed.mjs";
import { criarRegras, CURIOSIDADES } from "./regras.mjs";
import { selecionarMaisRelevantes, QUANTIDADE_POR_CATEGORIA } from "./selecao.mjs";
import { limparTitulo } from "./texto.mjs";

const IDADE_MAXIMA_ANTERIOR_MS = 7 * 24 * 60 * 60 * 1000;

function todasAsFontes(categorias) {
  const porUrl = new Map();
  for (const { fontes } of Object.values(categorias)) for (const fonte of fontes) porUrl.set(fonte.url, fonte);
  return [...porUrl.values()];
}

// Cada URL é baixada uma vez só, mesmo que apareça em duas categorias. Falha de um feed não derruba os outros.
async function lerTodasAsFontes(fontes, buscarXml) {
  const resultados = await Promise.all(
    fontes.map(async (fonte) => {
      try {
        return [fonte.url, { itens: lerFeed(await buscarXml(fonte.url)) }];
      } catch (erro) {
        return [fonte.url, { erro: erro.message }];
      }
    })
  );
  return new Map(resultados);
}

function falhas(fontes, lidas) {
  return fontes
    .filter((fonte) => lidas.get(fonte.url).erro)
    .map((fonte) => ({ fonte: fonte.nome, url: fonte.url, erro: lidas.get(fonte.url).erro }));
}

function itensDaFonte(fonte, lidas, agora) {
  return (lidas.get(fonte.url).itens ?? []).map((item) => ({
    titulo: limparTitulo(item.titulo),
    link: item.link,
    fonte: fonte.nome,
    data: item.data > agora ? agora : item.data
  }));
}

function anterioresDaCategoria(anterior, categoriaId, agora) {
  const itens = anterior?.categorias?.find((categoria) => categoria.id === categoriaId)?.itens ?? [];
  return itens.filter((item) => agora - new Date(item.data) <= IDADE_MAXIMA_ANTERIOR_MS);
}

function completarComAnteriores(itens, anteriores, linksUsados) {
  const completos = [...itens];
  for (const item of anteriores) {
    if (completos.length >= QUANTIDADE_POR_CATEGORIA) break;
    if (!linksUsados.has(item.link) && !completos.some((atual) => atual.link === item.link)) completos.push(item);
  }
  return completos;
}

export async function atualizarIdioma({ idioma, config, buscarXml, anterior, agora }) {
  const regras = criarRegras(config, idioma);
  const fontes = todasAsFontes(config.categorias);
  const lidas = await lerTodasAsFontes(fontes, buscarXml);
  const linksUsados = new Set();
  const candidatosPorCategoria = new Map();

  function publicar(categoriaId, candidatos) {
    const livres = candidatos.filter((item) => !linksUsados.has(item.link));
    const escolhidos = selecionarMaisRelevantes(livres, agora);
    const itens = completarComAnteriores(escolhidos, anterioresDaCategoria(anterior, categoriaId, agora), linksUsados);
    for (const item of itens) linksUsados.add(item.link);
    return { id: categoriaId, itens };
  }

  const categorias = regras.categoriasDeTema.map((categoriaId) => {
    const candidatos = config.categorias[categoriaId].fontes.flatMap((fonte) =>
      itensDaFonte(fonte, lidas, agora).filter((item) => regras.aceitaNaCategoria(item, fonte, categoriaId))
    );
    candidatosPorCategoria.set(categoriaId, candidatos);
    return publicar(categoriaId, candidatos);
  });

  // Curiosidades: matérias das fontes de curiosidades que tocam num dos temas,
  // mais as matérias explicativas ("por que", "entenda"...) das outras categorias.
  const daFonteDeCuriosidade = config.categorias[CURIOSIDADES].fontes.flatMap((fonte) =>
    itensDaFonte(fonte, lidas, agora)
      .map((item) => ({ ...item, tema: regras.temaDaCuriosidade(item, fonte) }))
      .filter((item) => item.tema)
  );
  const explicativas = [...candidatosPorCategoria].flatMap(([tema, candidatos]) =>
    candidatos.filter((item) => regras.ehExplicativa(item.titulo)).map((item) => ({ ...item, tema }))
  );
  const curiosidades = publicar(CURIOSIDADES, [...daFonteDeCuriosidade, ...explicativas]);
  categorias.splice(regras.categorias.indexOf(CURIOSIDADES), 0, curiosidades);

  return { idioma, atualizadoEm: agora.toISOString(), categorias, fontesComFalha: falhas(fontes, lidas) };
}

export function categoriasIncompletas(resultado) {
  return resultado.categorias.filter((categoria) => categoria.itens.length < QUANTIDADE_POR_CATEGORIA).map((categoria) => categoria.id);
}
