// Roda no SEU terminal, a cada ~60 dias: `npm run autorizar-linkedin`.
// Lê LINKEDIN_CLIENT_ID e LINKEDIN_CLIENT_SECRET do ambiente, abre o login do LinkedIn,
// recebe o retorno em localhost e grava o token no GitHub Secrets com `gh secret set`, sem mostrar valores.
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PORTA_LOCAL, URL_DO_PERFIL, URL_DO_TOKEN, codigoDoRetorno, pedidoDeToken, segredosDoToken, urlDeAutorizacao } from "./autorizacao.mjs";

const REPOSITORIO = "luizflaviomatias/luizflaviomatias.github.io";
const TEMPO_PARA_AUTORIZAR_MS = 5 * 60_000;

function exigirVariavel(nome) {
  const valor = process.env[nome];
  if (!valor) throw new Error(`defina ${nome} no terminal antes (veja o README, seção Post diário no LinkedIn)`);
  return valor;
}

function esperarRetorno(estado) {
  return new Promise((resolver, rejeitar) => {
    const servidor = createServer((pedido, resposta) => {
      if (!pedido.url.startsWith("/callback")) return resposta.writeHead(404).end();
      try {
        const codigo = codigoDoRetorno(pedido.url, estado);
        resposta.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end("Autorizado. Pode fechar esta aba e voltar ao terminal.");
        resolver(codigo);
      } catch (erro) {
        resposta.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end(erro.message);
        rejeitar(erro);
      } finally {
        servidor.close();
        clearTimeout(limite);
      }
    });
    const limite = setTimeout(() => { servidor.close(); rejeitar(new Error("passaram 5 minutos sem autorização; rode de novo")); }, TEMPO_PARA_AUTORIZAR_MS);
    servidor.listen(PORTA_LOCAL, "127.0.0.1");
  });
}

async function pedirJson(url, opcoes, oQueEra) {
  const resposta = await fetch(url, opcoes);
  if (!resposta.ok) throw new Error(`${oQueEra} falhou: HTTP ${resposta.status}`);
  return resposta.json();
}

function gravarSegredo(nome, valor) {
  const resultado = spawnSync("gh", ["secret", "set", nome, "--repo", REPOSITORIO], { input: valor, stdio: ["pipe", "ignore", "inherit"] });
  if (resultado.error || resultado.status !== 0) throw new Error(`não consegui gravar ${nome} com o gh (está instalado e logado?)`);
  console.log(`  ${nome} gravado no GitHub Secrets.`);
}

async function autorizar() {
  const clientId = exigirVariavel("LINKEDIN_CLIENT_ID");
  const clientSecret = exigirVariavel("LINKEDIN_CLIENT_SECRET");
  const estado = randomBytes(16).toString("hex");

  console.log(`Abra este endereço no navegador e autorize o app:\n\n${urlDeAutorizacao({ clientId, estado })}\n`);
  const codigo = await esperarRetorno(estado);

  const token = await pedirJson(URL_DO_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: pedidoDeToken({ codigo, clientId, clientSecret })
  }, "a troca do código pelo token");
  const perfil = await pedirJson(URL_DO_PERFIL, { headers: { Authorization: `Bearer ${token.access_token}` } }, "a leitura do perfil");

  const segredos = segredosDoToken({ accessToken: token.access_token, expiraEmSegundos: token.expires_in, idDoMembro: perfil.sub, agora: new Date() });
  for (const [nome, valor] of Object.entries(segredos)) gravarSegredo(nome, valor);
  console.log(`\nPronto. O token vale até ${new Date(segredos.LINKEDIN_TOKEN_EXPIRA_EM).toLocaleDateString("pt-BR")}.`);
}

autorizar().catch((erro) => {
  console.error(`Erro: ${erro.message}`);
  process.exitCode = 1;
});
