// Adaptador da Claude API: recebe instruções e pedido, devolve só o texto gerado.
// Qualquer falha do serviço vira GeracaoFalhouError, para quem chama poder cair no post padrão.
import Anthropic from "@anthropic-ai/sdk";

export const MODELO = "claude-opus-5-5";
const MAXIMO_DE_TOKENS = 16000;

export class GeracaoFalhouError extends Error {
  constructor(motivo, opcoes) {
    super(`a Claude API não gerou o texto: ${motivo}`, opcoes);
    this.name = "GeracaoFalhouError";
  }
}

export function criarClienteClaude(chave) {
  return new Anthropic({ apiKey: chave });
}

export function criarGeradorClaude(cliente, { modelo = MODELO } = {}) {
  return async function gerarTexto(instrucoes, pedido) {
    let resposta;
    try {
      resposta = await cliente.beta.messages.create({
        model: modelo,
        max_tokens: MAXIMO_DE_TOKENS,
        // Se o modelo principal estiver sobrecarregado, a própria API tenta os modelos de reserva.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: instrucoes,
        messages: [{ role: "user", content: pedido }]
      });
    } catch (erro) {
      if (erro instanceof Anthropic.APIError) throw new GeracaoFalhouError(`${erro.status ?? "sem status"} ${erro.message}`, { cause: erro });
      throw erro;
    }
    if (resposta.stop_reason === "refusal") throw new GeracaoFalhouError("o modelo recusou o pedido");
    if (resposta.stop_reason === "max_tokens") throw new GeracaoFalhouError("a resposta foi cortada no limite de tokens");
    const texto = resposta.content.filter((bloco) => bloco.type === "text").map((bloco) => bloco.text).join("").trim();
    if (!texto) throw new GeracaoFalhouError("a resposta veio sem texto");
    return texto;
  };
}
