// Escolhe as manchetes mais relevantes de uma categoria.
// Relevância = em quantas fontes a mesma história apareceu + um bônus por ser recente (meia-vida de 12 horas).
import { palavrasDoTitulo } from "./texto.mjs";

export const QUANTIDADE_POR_CATEGORIA = 5;
const MAXIMO_POR_FONTE = 2;
const MEIA_VIDA_HORAS = 12;
// Primeiro tenta só o último dia e meio; se não fechar as 5, amplia para a semana.
const JANELAS_HORAS = [36, 7 * 24];
const HORA_MS = 60 * 60 * 1000;

function horasDesde(data, agora) {
  return Math.max(0, (agora.getTime() - data.getTime()) / HORA_MS);
}

// Mesma história em fontes diferentes: títulos com várias palavras significativas em comum.
export function mesmaHistoria(palavrasA, palavrasB) {
  let comuns = 0;
  for (const palavra of palavrasA) if (palavrasB.has(palavra)) comuns++;
  const proporcao = comuns / Math.max(1, Math.min(palavrasA.size, palavrasB.size));
  return (comuns >= 3 && proporcao >= 0.4) || (comuns >= 2 && proporcao >= 0.6);
}

// Agrupa itens da mesma história. O item mais recente representa o grupo.
export function agruparHistorias(itens) {
  const historias = [];
  const maisRecentesPrimeiro = [...itens].sort((a, b) => b.data - a.data);
  for (const item of maisRecentesPrimeiro) {
    const palavras = palavrasDoTitulo(item.titulo);
    const existente = historias.find((historia) => mesmaHistoria(palavras, historia.palavras));
    if (existente) existente.fontes.add(item.fonte);
    else historias.push({ principal: item, palavras, fontes: new Set([item.fonte]) });
  }
  return historias;
}

function pontuar(historia, agora) {
  const recencia = Math.pow(0.5, horasDesde(historia.principal.data, agora) / MEIA_VIDA_HORAS);
  return historia.fontes.size + recencia;
}

function historiasDaJanela(itens, agora) {
  let historias = [];
  for (const janela of JANELAS_HORAS) {
    historias = agruparHistorias(itens.filter((item) => horasDesde(item.data, agora) <= janela));
    if (historias.length >= QUANTIDADE_POR_CATEGORIA) break;
  }
  return historias;
}

// No máximo 2 por fonte; se mesmo assim faltar, completa com as melhores que sobraram.
function escolherComVariedade(ordenadas) {
  const escolhidas = [];
  const porFonte = new Map();
  for (const historia of ordenadas) {
    if (escolhidas.length === QUANTIDADE_POR_CATEGORIA) break;
    const fonte = historia.principal.fonte;
    if ((porFonte.get(fonte) ?? 0) >= MAXIMO_POR_FONTE) continue;
    porFonte.set(fonte, (porFonte.get(fonte) ?? 0) + 1);
    escolhidas.push(historia);
  }
  for (const historia of ordenadas) {
    if (escolhidas.length === QUANTIDADE_POR_CATEGORIA) break;
    if (!escolhidas.includes(historia)) escolhidas.push(historia);
  }
  return escolhidas;
}

function paraPublicacao(historia) {
  const { titulo, link, fonte, data, tema } = historia.principal;
  return { titulo, link, fonte, data: data.toISOString(), fontes: historia.fontes.size, ...(tema ? { tema } : {}) };
}

// itens: { titulo, link, fonte, data: Date, tema? }. Itens com data no futuro contam como de agora.
export function selecionarMaisRelevantes(itens, agora) {
  const ordenadas = historiasDaJanela(itens, agora)
    .map((historia) => ({ historia, pontos: pontuar(historia, agora) }))
    .sort((a, b) => b.pontos - a.pontos || b.historia.principal.data - a.historia.principal.data)
    .map(({ historia }) => historia);
  return escolherComVariedade(ordenadas).map(paraPublicacao);
}
