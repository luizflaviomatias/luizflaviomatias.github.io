// Regras do post diário: no máximo um por dia (no fuso de Brasília) e só com as notícias da manhã.
export const HORAS_MAXIMAS_DAS_NOTICIAS = 30;
export const DIAS_DE_AVISO_ANTES_DE_VENCER = 7;
const UMA_HORA_MS = 3_600_000;
const UM_DIA_MS = 24 * UMA_HORA_MS;

export class NoticiasDesatualizadasError extends Error {
  constructor(horas) {
    super(`as notícias foram atualizadas há ${Math.round(horas)} h (limite: ${HORAS_MAXIMAS_DAS_NOTICIAS} h). Confira o workflow "Atualizar notícias".`);
    this.name = "NoticiasDesatualizadasError";
  }
}

export function dataEmBrasilia(data) {
  return data.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export function diasParaVencer(expiraEm, agora) {
  return Math.floor((new Date(expiraEm).getTime() - agora.getTime()) / UM_DIA_MS);
}

export function tokenPertoDeVencer(expiraEm, agora) {
  return diasParaVencer(expiraEm, agora) <= DIAS_DE_AVISO_ANTES_DE_VENCER;
}

function garantirNoticiasRecentes(noticias, agora) {
  const horas = (agora.getTime() - new Date(noticias.atualizadoEm).getTime()) / UMA_HORA_MS;
  if (!(horas <= HORAS_MAXIMAS_DAS_NOTICIAS)) throw new NoticiasDesatualizadasError(horas);
}

export function jaPublicouHoje(ultimoPost, agora) {
  return ultimoPost?.data === dataEmBrasilia(agora);
}

// Devolve o post publicado e o registro a gravar em ultimo-post.json.
export async function publicarPostDoDia({ noticias, agora, redator, publicar }) {
  garantirNoticiasRecentes(noticias, agora);
  const post = await redator.redigir(noticias, agora);
  const id = await publicar(post);
  return { post, registro: { data: dataEmBrasilia(agora), id, origem: post.origem, publicadoEm: agora.toISOString() } };
}

export async function redigirRascunho({ noticias, agora, redator }) {
  garantirNoticiasRecentes(noticias, agora);
  return redator.redigir(noticias, agora);
}
