// Regras de um idioma (fontes.json) compiladas em funções: quais categorias existem, o que entra,
// de que tema é cada manchete e se é matéria explicativa.
import { normalizar } from "./texto.mjs";

// Ordem em que as categorias aparecem na página. Cada idioma usa as que estiverem no fontes.json
// (Política internacional, por exemplo, só existe em português).
export const ORDEM_DAS_CATEGORIAS = ["tecnologia", "negocios", "politica-nacional", "politica-internacional", "economia", "curiosidades"];
export const CURIOSIDADES = "curiosidades";

const escaparRegex = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "tecnolog*" casa com o começo da palavra; o resto casa com a palavra ou expressão inteira.
function regexDasPalavrasChave(palavras) {
  const alternativas = palavras.map((palavra) =>
    palavra.endsWith("*") ? `${escaparRegex(normalizar(palavra.slice(0, -1)))}[a-z0-9]*` : escaparRegex(normalizar(palavra))
  );
  return new RegExp(`(^| )(${alternativas.join("|")})( |$)`);
}

const somentePalavras = (titulo) => normalizar(titulo).replace(/[%?]/g, " ").replace(/\s+/g, " ").trim();

function categoriasDoIdioma(categorias, idioma) {
  const desconhecidas = Object.keys(categorias).filter((id) => !ORDEM_DAS_CATEGORIAS.includes(id));
  if (desconhecidas.length) throw new Error(`fontes.json (${idioma}): categoria desconhecida: ${desconhecidas.join(", ")}`);
  const presentes = ORDEM_DAS_CATEGORIAS.filter((id) => id in categorias);
  const semFontes = presentes.filter((id) => !categorias[id].fontes?.length);
  if (semFontes.length) throw new Error(`fontes.json (${idioma}): categoria sem fontes: ${semFontes.join(", ")}`);
  const semPalavras = presentes.filter((id) => id !== CURIOSIDADES && !categorias[id].palavrasChave?.length);
  if (semPalavras.length) throw new Error(`fontes.json (${idioma}): categoria sem palavrasChave: ${semPalavras.join(", ")}`);
  return presentes;
}

export function criarRegras(configIdioma, idioma) {
  const categorias = categoriasDoIdioma(configIdioma.categorias, idioma);
  const categoriasDeTema = categorias.filter((id) => id !== CURIOSIDADES);
  const tituloExcluido = new RegExp(configIdioma.excluirTitulos);
  const explicativa = new RegExp(configIdioma.explicativa);
  const temas = new Map(categoriasDeTema.map((id) => [id, regexDasPalavrasChave(configIdioma.categorias[id].palavrasChave)]));

  function temaDe(titulo) {
    const texto = somentePalavras(titulo);
    return categoriasDeTema.find((id) => temas.get(id).test(texto)) ?? null;
  }

  // "Por que...", "Entenda..." no começo do título ou logo depois de dois-pontos/travessão;
  // no meio da frase ("explique por que pede o voto") não é matéria explicativa.
  function ehExplicativa(titulo) {
    return String(titulo).split(/[:—–|]/).some((trecho) => explicativa.test(normalizar(trecho)));
  }

  function passaNosFiltrosGerais(item, fonte) {
    if (tituloExcluido.test(normalizar(item.titulo))) return false;
    if (fonte.incluirLinks && !new RegExp(fonte.incluirLinks).test(item.link)) return false;
    return !(fonte.excluirLinks && new RegExp(fonte.excluirLinks).test(item.link));
  }

  // Item de uma categoria comum: fora ofertas, seções de outro assunto e, nos feeds gerais, o que não é do tema.
  function aceitaNaCategoria(item, fonte, categoriaId) {
    if (!passaNosFiltrosGerais(item, fonte)) return false;
    return !fonte.filtrarPorTema || temas.get(categoriaId).test(somentePalavras(item.titulo));
  }

  // Item de uma fonte de curiosidades: só entra se falar de um dos temas do idioma.
  function temaDaCuriosidade(item, fonte) {
    if (!passaNosFiltrosGerais(item, fonte)) return null;
    if (fonte.exigirExplicativa && !ehExplicativa(item.titulo)) return null;
    return temaDe(item.titulo);
  }

  return { categorias, categoriasDeTema, aceitaNaCategoria, temaDaCuriosidade, ehExplicativa };
}
