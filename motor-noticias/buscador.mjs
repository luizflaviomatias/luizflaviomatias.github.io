// Busca o XML de um feed com tempo limite e uma nova tentativa. A falha vem como exceção com a URL no texto.

const AGENTE = "leitor-rss-noticias/1.0 (+https://github.com/luizflaviomatias/luizflaviomatias.github.io)";

const PADROES = { tempoLimiteMs: 20_000, tentativas: 2, esperaEntreTentativasMs: 3_000 };

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function criarBuscador({ fetch = globalThis.fetch, ...opcoes } = {}) {
  const { tempoLimiteMs, tentativas, esperaEntreTentativasMs } = { ...PADROES, ...opcoes };

  async function baixarUmaVez(url) {
    const resposta = await fetch(url, {
      headers: { "User-Agent": AGENTE, Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1" },
      redirect: "follow",
      signal: AbortSignal.timeout(tempoLimiteMs)
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    return resposta.text();
  }

  return async function buscarXml(url) {
    let ultimoErro;
    for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
      try {
        return await baixarUmaVez(url);
      } catch (erro) {
        ultimoErro = erro;
        if (tentativa < tentativas) await esperar(esperaEntreTentativasMs);
      }
    }
    throw new Error(`não consegui baixar ${url}: ${ultimoErro?.message ?? ultimoErro}`);
  };
}
