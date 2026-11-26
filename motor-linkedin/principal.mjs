// Ponto de entrada: `npm run linkedin` publica o post do dia; `npm run linkedin -- --rascunho` só mostra o texto.
// Segredos vêm do ambiente (GitHub Secrets no Actions): LINKEDIN_TOKEN, LINKEDIN_AUTOR,
// LINKEDIN_TOKEN_EXPIRA_EM e, opcional, ANTHROPIC_API_KEY.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { criarClienteClaude, criarGeradorClaude } from "./claude.mjs";
import { criarPublicadorLinkedIn } from "./linkedin.mjs";
import { criarRedator } from "./resumo.mjs";
import { diasParaVencer, jaPublicouHoje, publicarPostDoDia, redigirRascunho, tokenPertoDeVencer } from "./post-diario.mjs";

const ARQUIVO_DAS_NOTICIAS = new URL("../noticias/dados/pt.json", import.meta.url);
const ARQUIVO_DO_ULTIMO_POST = new URL("./ultimo-post.json", import.meta.url);

const lerJson = (arquivo) => JSON.parse(readFileSync(arquivo, "utf8"));
const avisar = (mensagem) => console.log(`::warning::${mensagem}`);

function criarRedatorDoAmbiente() {
  const chave = process.env.ANTHROPIC_API_KEY;
  return criarRedator({ gerarTexto: chave ? criarGeradorClaude(criarClienteClaude(chave)) : null });
}

function relatarOrigem(post) {
  if (post.origem === "padrao") avisar(`saiu o post padrão: ${post.motivoDoPadrao}`);
}

function textoParaLeitura(post) {
  return `${post.texto}\n\n${post.hashtags.map((tag) => `#${tag}`).join(" ")}`;
}

// Deixa o workflow abrir uma issue quando faltar pouco para o token vencer.
function registrarSaidaDoWorkflow(nome, valor) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${nome}=${valor}\n`);
}

function conferirValidadeDoToken(expiraEm, agora) {
  if (!expiraEm) return avisar("LINKEDIN_TOKEN_EXPIRA_EM não cadastrado; não dá para avisar antes de o token vencer.");
  const dias = diasParaVencer(expiraEm, agora);
  registrarSaidaDoWorkflow("dias_para_vencer", dias);
  if (tokenPertoDeVencer(expiraEm, agora)) avisar(`o token do LinkedIn vence em ${dias} dia(s). Rode \`npm run autorizar-linkedin\` no seu terminal.`);
}

async function mostrarRascunho(noticias, agora) {
  const post = await redigirRascunho({ noticias, agora, redator: criarRedatorDoAmbiente() });
  relatarOrigem(post);
  console.log(textoParaLeitura(post));
}

async function publicarHoje(noticias, agora) {
  const { LINKEDIN_TOKEN: token, LINKEDIN_AUTOR: autor, LINKEDIN_TOKEN_EXPIRA_EM: expiraEm } = process.env;
  if (!token || !autor) return avisar("LinkedIn ainda não autorizado (faltam LINKEDIN_TOKEN e LINKEDIN_AUTOR); nada publicado.");
  const ultimoPost = existsSync(ARQUIVO_DO_ULTIMO_POST) ? lerJson(ARQUIVO_DO_ULTIMO_POST) : null;
  if (jaPublicouHoje(ultimoPost, agora)) return console.log(`Post de hoje já publicado (${ultimoPost.id}); nada a fazer.`);
  conferirValidadeDoToken(expiraEm, agora);

  const { post, registro } = await publicarPostDoDia({
    noticias,
    agora,
    redator: criarRedatorDoAmbiente(),
    publicar: criarPublicadorLinkedIn({ fetch, token, autor })
  });
  writeFileSync(ARQUIVO_DO_ULTIMO_POST, `${JSON.stringify(registro, null, 2)}\n`);
  relatarOrigem(post);
  console.log(`Post publicado no LinkedIn (${registro.id}), texto ${post.origem === "ia" ? "da IA" : "padrão"}:\n\n${textoParaLeitura(post)}`);
}

async function principal() {
  const noticias = lerJson(ARQUIVO_DAS_NOTICIAS);
  const agora = new Date();
  if (process.argv.includes("--rascunho")) return mostrarRascunho(noticias, agora);
  return publicarHoje(noticias, agora);
}

principal().catch((erro) => {
  console.error(`::error::${erro.message}`);
  process.exitCode = 1;
});
