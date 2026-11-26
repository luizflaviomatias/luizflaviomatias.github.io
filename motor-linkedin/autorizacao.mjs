// Partes puras do OAuth do LinkedIn usadas por autorizar.mjs (separadas para teste).
export const PORTA_LOCAL = 8765;
export const ENDERECO_DE_RETORNO = `http://localhost:${PORTA_LOCAL}/callback`;
export const ESCOPOS = "openid profile w_member_social";
export const URL_DO_TOKEN = "https://www.linkedin.com/oauth/v2/accessToken";
export const URL_DO_PERFIL = "https://api.linkedin.com/v2/userinfo";
const URL_DE_AUTORIZACAO = "https://www.linkedin.com/oauth/v2/authorization";

export function urlDeAutorizacao({ clientId, estado }) {
  const parametros = new URLSearchParams({ response_type: "code", client_id: clientId, redirect_uri: ENDERECO_DE_RETORNO, state: estado, scope: ESCOPOS });
  return `${URL_DE_AUTORIZACAO}?${parametros}`;
}

export function pedidoDeToken({ codigo, clientId, clientSecret }) {
  return new URLSearchParams({ grant_type: "authorization_code", code: codigo, redirect_uri: ENDERECO_DE_RETORNO, client_id: clientId, client_secret: clientSecret });
}

// Lê o retorno do LinkedIn em /callback; recusa estado diferente do enviado (proteção contra CSRF).
export function codigoDoRetorno(urlDeRetorno, estadoEsperado) {
  const parametros = new URL(urlDeRetorno, ENDERECO_DE_RETORNO).searchParams;
  if (parametros.get("error")) throw new Error(`o LinkedIn não autorizou: ${parametros.get("error_description") || parametros.get("error")}`);
  if (parametros.get("state") !== estadoEsperado) throw new Error("o retorno do LinkedIn veio com um estado diferente do enviado; recomece a autorização");
  const codigo = parametros.get("code");
  if (!codigo) throw new Error("o retorno do LinkedIn veio sem código");
  return codigo;
}

export function segredosDoToken({ accessToken, expiraEmSegundos, idDoMembro, agora }) {
  return {
    LINKEDIN_TOKEN: accessToken,
    LINKEDIN_AUTOR: `urn:li:person:${idDoMembro}`,
    LINKEDIN_TOKEN_EXPIRA_EM: new Date(agora.getTime() + expiraEmSegundos * 1000).toISOString()
  };
}
