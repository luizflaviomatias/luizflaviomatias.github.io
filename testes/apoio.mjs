// Fábricas de feeds e itens para os testes (sem rede).

export const AGORA = new Date("2026-11-27T09:00:00Z");

export function horasAtras(horas) {
  return new Date(AGORA.getTime() - horas * 60 * 60 * 1000);
}

export function rss(itens) {
  const corpo = itens
    .map(({ titulo, link, data }) => `<item><title><![CDATA[${titulo}]]></title><link>${link}</link><pubDate>${data.toUTCString()}</pubDate></item>`)
    .join("");
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>Feed</title>${corpo}</channel></rss>`;
}

// Manchetes sem palavras significativas em comum, para não serem agrupadas como a mesma história.
export const MANCHETES_DISTINTAS = [
  "Prefeitura inaugura hospital veterinário gratuito",
  "Seleção feminina vence amistoso disputado",
  "Petrobras descobre reservatório marítimo inédito",
  "Escolas estaduais recebem laboratórios robóticos",
  "Aeroporto regional amplia terminal internacional",
  "Pesquisadores mapeiam florestas tropicais desconhecidas",
  "Montadora anuncia fábrica elétrica nordestina",
  "Universidade publica ranking acadêmico latino"
];

export function item(titulo, { fonte = "Fonte A", horas = 1, link, tema } = {}) {
  return {
    titulo,
    fonte,
    data: horasAtras(horas),
    link: link ?? `https://exemplo.com/${encodeURIComponent(titulo)}`,
    ...(tema ? { tema } : {})
  };
}
