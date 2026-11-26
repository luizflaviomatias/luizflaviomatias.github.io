import { test } from "node:test";
import assert from "node:assert/strict";
import Anthropic from "@anthropic-ai/sdk";
import { GeracaoFalhouError, criarGeradorClaude } from "../motor-linkedin/claude.mjs";
import { HASHTAGS, URL_DAS_NOTICIAS, criarRedator, montarPedido, validarCorpo } from "../motor-linkedin/resumo.mjs";
import { PublicacaoFalhouError, TokenInvalidoError, criarPublicadorLinkedIn, escaparTexto, formatarComentario } from "../motor-linkedin/linkedin.mjs";
import { NoticiasDesatualizadasError, dataEmBrasilia, jaPublicouHoje, publicarPostDoDia, tokenPertoDeVencer } from "../motor-linkedin/post-diario.mjs";
import { codigoDoRetorno, segredosDoToken, urlDeAutorizacao } from "../motor-linkedin/autorizacao.mjs";
import { AGORA, horasAtras } from "./apoio.mjs";

const CATEGORIAS = ["tecnologia", "negocios", "politica-nacional", "politica-internacional", "economia", "curiosidades"];

function noticiasDoDia({ atualizadoEm = horasAtras(3) } = {}) {
  return {
    idioma: "pt",
    atualizadoEm,
    categorias: CATEGORIAS.map((id) => ({
      id,
      itens: [1, 2, 3, 4, 5].map((n) => ({ titulo: `Manchete ${n} de ${id}`, link: `https://f.com/${id}/${n}`, fonte: `Fonte ${n}`, data: horasAtras(n), fontes: n === 1 ? 3 : 1 }))
    }))
  };
}

const CORPO_BOM = `Quinta-feira, 27 de novembro. O que se destacou hoje:\n\n${CATEGORIAS.map((id) => `💡 ${id}: um resumo próprio do destaque deste assunto (Fonte 1).`).join("\n")}`;
const geradorQueResponde = (texto) => async () => texto;
const geradorQueFalha = async () => { throw new GeracaoFalhouError("HTTP 529"); };

// --- resumo ---

test("pedido para a IA leva só título, fonte e repercussão das 3 primeiras de cada assunto", () => {
  const pedido = montarPedido(noticiasDoDia(), AGORA);
  assert.match(pedido, /Manchete 1 de tecnologia \(Fonte 1, em 3 fontes\)/);
  assert.match(pedido, /Manchete 3 de curiosidades \(Fonte 3\)/);
  assert.doesNotMatch(pedido, /Manchete 4/);
  assert.doesNotMatch(pedido, /https?:/);
  assert.ok(pedido.indexOf("Tecnologia") < pedido.indexOf("Gestão de negócios") && pedido.indexOf("Economia") < pedido.indexOf("Curiosidades"));
});

test("texto bom da IA vira o post, com o link do site no fim e as hashtags à parte", async () => {
  const post = await criarRedator({ gerarTexto: geradorQueResponde(CORPO_BOM) }).redigir(noticiasDoDia(), AGORA);
  assert.equal(post.origem, "ia");
  assert.ok(post.texto.startsWith(CORPO_BOM));
  assert.ok(post.texto.endsWith(URL_DAS_NOTICIAS));
  assert.deepEqual(post.hashtags, HASHTAGS);
});

test("IA fora do ar: sai o post padrão com o destaque de cada assunto e o motivo", async () => {
  const post = await criarRedator({ gerarTexto: geradorQueFalha }).redigir(noticiasDoDia(), AGORA);
  assert.equal(post.origem, "padrao");
  assert.match(post.motivoDoPadrao, /529/);
  for (const id of CATEGORIAS) assert.match(post.texto, new RegExp(`Manchete 1 de ${id} \\(Fonte 1\\)`));
  assert.doesNotMatch(post.texto, /Manchete 2/);
  assert.ok(post.texto.endsWith(URL_DAS_NOTICIAS));
});

test("sem chave da Claude API, sai o post padrão", async () => {
  const post = await criarRedator().redigir(noticiasDoDia(), AGORA);
  assert.equal(post.origem, "padrao");
  assert.match(post.motivoDoPadrao, /sem chave/);
});

test("texto da IA com link, hashtag, markdown ou tamanho fora do limite é recusado e sai o padrão", async () => {
  for (const ruim of [`${CORPO_BOM} https://x.com`, `${CORPO_BOM} #IA`, `**${CORPO_BOM}**`, "curto", CORPO_BOM.repeat(10)]) {
    assert.throws(() => validarCorpo(ruim));
    const post = await criarRedator({ gerarTexto: geradorQueResponde(ruim) }).redigir(noticiasDoDia(), AGORA);
    assert.equal(post.origem, "padrao", ruim.slice(0, 40));
  }
});

test("erro de programação no gerador não é escondido pelo post padrão", async () => {
  const redator = criarRedator({ gerarTexto: async () => { throw new TypeError("bug"); } });
  await assert.rejects(redator.redigir(noticiasDoDia(), AGORA), TypeError);
});

// --- adaptador da Claude API ---

function clienteFalso(responder) {
  const pedidos = [];
  return { pedidos, beta: { messages: { create: async (pedido) => { pedidos.push(pedido); return responder(); } } } };
}

test("Claude: pede o modelo com reservas automáticas e devolve só os blocos de texto", async () => {
  const cliente = clienteFalso(() => ({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "..." }, { type: "text", text: " olá " }] }));
  assert.equal(await criarGeradorClaude(cliente)("instruções", "pedido"), "olá");
  const [pedido] = cliente.pedidos;
  assert.equal(pedido.model, "claude-opus-5-5");
  assert.equal(pedido.fallbacks, "default");
  assert.deepEqual(pedido.betas, ["server-side-fallback-2026-07-01"]);
  assert.equal(pedido.system, "instruções");
});

test("Claude: recusa, resposta cortada e erro da API viram GeracaoFalhouError", async () => {
  const casos = [
    () => ({ stop_reason: "refusal", content: [] }),
    () => ({ stop_reason: "max_tokens", content: [{ type: "text", text: "meio" }] }),
    () => { throw new Anthropic.APIError(529, undefined, "overloaded", new Headers()); }
  ];
  for (const responder of casos) await assert.rejects(criarGeradorClaude(clienteFalso(responder))("i", "p"), GeracaoFalhouError);
});

// --- LinkedIn ---

test("little text: caracteres reservados ganham barra invertida", () => {
  assert.equal(escaparTexto("IA (hoje) #1 @x [a] {b} <c> *d* _e_ ~f~ | \\"), "IA \\(hoje\\) \\#1 \\@x \\[a\\] \\{b\\} \\<c\\> \\*d\\* \\_e\\_ \\~f\\~ \\| \\\\");
  assert.equal(escaparTexto("Ibovespa sobe 2%: veja 👀"), "Ibovespa sobe 2%: veja 👀");
});

test("hashtags vão no modelo do LinkedIn, sem escapar", () => {
  assert.equal(formatarComentario({ texto: "Oi (teste)", hashtags: ["Noticias", "IA"] }), "Oi \\(teste\\)\n\n{hashtag|\\#|Noticias} {hashtag|\\#|IA}");
});

test("post acima de 3.000 caracteres não é enviado", () => {
  assert.throws(() => formatarComentario({ texto: "a".repeat(3000), hashtags: ["X"] }), RangeError);
});

function fetchFalso(status, { id = "urn:li:share:123", corpo = "" } = {}) {
  const chamadas = [];
  const fetch = async (url, opcoes) => { chamadas.push({ url, opcoes }); return new Response(corpo || null, { status, headers: { "x-restli-id": id } }); };
  return { fetch, chamadas };
}

test("LinkedIn: publica no perfil do autor com a versão da API e devolve o id do post", async () => {
  const { fetch, chamadas } = fetchFalso(201);
  const id = await criarPublicadorLinkedIn({ fetch, token: "tk", autor: "urn:li:person:abc" })({ texto: "Oi", hashtags: ["X"] });
  assert.equal(id, "urn:li:share:123");
  const [{ url, opcoes }] = chamadas;
  assert.equal(url, "https://api.linkedin.com/rest/posts");
  assert.equal(opcoes.headers.Authorization, "Bearer tk");
  assert.match(opcoes.headers["Linkedin-Version"], /^\d{6}$/);
  assert.equal(opcoes.headers["X-Restli-Protocol-Version"], "2.0.0");
  const corpo = JSON.parse(opcoes.body);
  assert.equal(corpo.author, "urn:li:person:abc");
  assert.equal(corpo.visibility, "PUBLIC");
  assert.equal(corpo.lifecycleState, "PUBLISHED");
  assert.equal(corpo.commentary, "Oi\n\n{hashtag|\\#|X}");
});

test("LinkedIn: token vencido vira TokenInvalidoError com a instrução de reautorizar", async () => {
  const { fetch } = fetchFalso(401);
  await assert.rejects(criarPublicadorLinkedIn({ fetch, token: "velho", autor: "a" })({ texto: "Oi", hashtags: [] }), (erro) =>
    erro instanceof TokenInvalidoError && /autorizar-linkedin/.test(erro.message));
});

test("LinkedIn: outro erro HTTP traz status e detalhe", async () => {
  const { fetch } = fetchFalso(422, { corpo: "commentary inválido" });
  await assert.rejects(criarPublicadorLinkedIn({ fetch, token: "t", autor: "a" })({ texto: "Oi", hashtags: [] }), (erro) =>
    erro instanceof PublicacaoFalhouError && /422 commentary inválido/.test(erro.message));
});

// --- post do dia ---

const redatorFixo = { redigir: async () => ({ texto: "Post", hashtags: [], origem: "ia" }) };

test("publica o post do dia e devolve o registro com a data de Brasília", async () => {
  const publicados = [];
  const { registro } = await publicarPostDoDia({ noticias: noticiasDoDia(), agora: AGORA, redator: redatorFixo, publicar: async (post) => { publicados.push(post); return "urn:li:share:9"; } });
  assert.equal(publicados.length, 1);
  assert.deepEqual(registro, { data: "2026-11-27", id: "urn:li:share:9", origem: "ia", publicadoEm: AGORA.toISOString() });
});

test("notícias com mais de 30 h não viram post", async () => {
  let publicou = false;
  await assert.rejects(
    publicarPostDoDia({ noticias: noticiasDoDia({ atualizadoEm: horasAtras(31) }), agora: AGORA, redator: redatorFixo, publicar: async () => { publicou = true; } }),
    NoticiasDesatualizadasError
  );
  assert.equal(publicou, false);
});

test("um post por dia no fuso de Brasília, mesmo perto da meia-noite UTC", () => {
  const noiteEmBrasilia = new Date("2026-11-28T01:30:00Z");
  assert.equal(dataEmBrasilia(noiteEmBrasilia), "2026-11-27");
  assert.equal(jaPublicouHoje({ data: "2026-11-27" }, noiteEmBrasilia), true);
  assert.equal(jaPublicouHoje({ data: "2026-11-26" }, AGORA), false);
  assert.equal(jaPublicouHoje(null, AGORA), false);
});

test("token avisa a partir de 7 dias antes de vencer", () => {
  const emDias = (dias) => new Date(AGORA.getTime() + dias * 86_400_000).toISOString();
  assert.equal(tokenPertoDeVencer(emDias(8), AGORA), false);
  assert.equal(tokenPertoDeVencer(emDias(7), AGORA), true);
  assert.equal(tokenPertoDeVencer(emDias(-1), AGORA), true);
});

// --- autorização ---

test("autorização pede os escopos certos e volta para localhost", () => {
  const url = new URL(urlDeAutorizacao({ clientId: "cid", estado: "xyz" }));
  assert.equal(url.origin + url.pathname, "https://www.linkedin.com/oauth/v2/authorization");
  assert.equal(url.searchParams.get("scope"), "openid profile w_member_social");
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:8765/callback");
  assert.equal(url.searchParams.get("state"), "xyz");
});

test("retorno da autorização: aceita o código só com o mesmo estado", () => {
  assert.equal(codigoDoRetorno("/callback?code=abc&state=xyz", "xyz"), "abc");
  assert.throws(() => codigoDoRetorno("/callback?code=abc&state=outro", "xyz"), /estado/);
  assert.throws(() => codigoDoRetorno("/callback?error=user_cancelled_login&state=xyz", "xyz"), /não autorizou/);
});

test("segredos gerados: autor como URN de pessoa e validade em data ISO", () => {
  assert.deepEqual(segredosDoToken({ accessToken: "tk", expiraEmSegundos: 5_184_000, idDoMembro: "abc", agora: AGORA }), {
    LINKEDIN_TOKEN: "tk",
    LINKEDIN_AUTOR: "urn:li:person:abc",
    LINKEDIN_TOKEN_EXPIRA_EM: "2027-01-26T09:00:00.000Z"
  });
});
