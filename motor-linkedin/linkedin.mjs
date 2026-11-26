// Adaptador da Posts API do LinkedIn (produto "Share on LinkedIn", escopo w_member_social).
// O texto vai no formato "little text": caracteres reservados precisam de barra invertida.
export const URL_DA_API = "https://api.linkedin.com/rest/posts";
export const VERSAO_DA_API = "202611";
export const TAMANHO_MAXIMO_DO_POST = 3000;
const RESERVADOS = /[|{}@[\]()<>#\\*_~]/g;

export class TokenInvalidoError extends Error {
  constructor() {
    super("o LinkedIn recusou o token (vencido ou revogado). Rode `npm run autorizar-linkedin` no seu terminal para gerar outro.");
    this.name = "TokenInvalidoError";
  }
}

export class PublicacaoFalhouError extends Error {
  constructor(status, detalhe) {
    super(`o LinkedIn não publicou o post: HTTP ${status} ${detalhe}`.trim());
    this.name = "PublicacaoFalhouError";
  }
}

export function escaparTexto(texto) {
  return texto.replace(RESERVADOS, (caractere) => `\\${caractere}`);
}

export function formatarComentario({ texto, hashtags }) {
  const marcadores = hashtags.map((tag) => `{hashtag|\\#|${tag}}`).join(" ");
  const comentario = `${escaparTexto(texto)}\n\n${marcadores}`;
  if (comentario.length > TAMANHO_MAXIMO_DO_POST) throw new RangeError(`o post tem ${comentario.length} caracteres e o LinkedIn aceita até ${TAMANHO_MAXIMO_DO_POST}`);
  return comentario;
}

export function criarPublicadorLinkedIn({ fetch, token, autor }) {
  return async function publicar(post) {
    const resposta = await fetch(URL_DA_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Linkedin-Version": VERSAO_DA_API,
        "X-Restli-Protocol-Version": "2.0.0"
      },
      body: JSON.stringify({
        author: autor,
        commentary: formatarComentario(post),
        visibility: "PUBLIC",
        distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
        lifecycleState: "PUBLISHED",
        isReshareDisabledByAuthor: false
      })
    });
    if (resposta.status === 401) throw new TokenInvalidoError();
    if (resposta.status !== 201) throw new PublicacaoFalhouError(resposta.status, (await resposta.text()).slice(0, 300));
    return resposta.headers.get("x-restli-id");
  };
}
