// Leitura de feeds RSS 2.0, RSS 1.0 (RDF) e Atom, só com o que a página usa: título, link e data.
// Sem dependências: os feeds são simples o bastante para expressões regulares bem delimitadas.

export class FeedInvalidoError extends Error {}

const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodificarEntidades(texto) {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (original, codigo) => {
    if (codigo[0] === "#") {
      const numero = codigo[1].toLowerCase() === "x" ? parseInt(codigo.slice(2), 16) : parseInt(codigo.slice(1), 10);
      return Number.isFinite(numero) ? String.fromCodePoint(numero) : original;
    }
    return ENTIDADES[codigo.toLowerCase()] ?? original;
  });
}

// Conteúdo de texto de um elemento: tira CDATA e tags internas e decodifica entidades.
function textoDe(conteudo) {
  if (conteudo == null) return "";
  const semCdata = conteudo.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
  return decodificarEntidades(semCdata.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function conteudoDaTag(bloco, nome) {
  const encontrado = bloco.match(new RegExp(`<${nome}(?:\\s[^>]*)?>([\\s\\S]*?)</${nome}>`, "i"));
  return encontrado ? encontrado[1] : null;
}

function primeiroTexto(bloco, nomes) {
  for (const nome of nomes) {
    const texto = textoDe(conteudoDaTag(bloco, nome));
    if (texto) return texto;
  }
  return "";
}

function blocos(xml, nome) {
  return xml.match(new RegExp(`<${nome}(?:\\s[^>]*)?>[\\s\\S]*?</${nome}>`, "gi")) || [];
}

function lerData(texto) {
  if (!texto) return null;
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data;
}

function linkDoAtom(entrada) {
  const links = entrada.match(/<link\b[^>]*>/gi) || [];
  const alternativo = links.find((tag) => !/\brel=/i.test(tag) || /\brel=["']alternate["']/i.test(tag));
  const href = alternativo && alternativo.match(/\bhref=["']([^"']+)["']/i);
  return href ? decodificarEntidades(href[1]) : "";
}

function linkDoRss(item) {
  const link = primeiroTexto(item, ["link"]);
  if (link) return link;
  const guid = item.match(/<guid(\s[^>]*)?>([\s\S]*?)<\/guid>/i);
  const permanente = guid && !/isPermaLink=["']false["']/i.test(guid[1] || "");
  return permanente ? textoDe(guid[2]) : "";
}

function itemDoRss(item) {
  return {
    titulo: primeiroTexto(item, ["title"]),
    link: linkDoRss(item),
    data: lerData(primeiroTexto(item, ["pubDate", "dc:date", "published", "updated"]))
  };
}

function itemDoAtom(entrada) {
  return {
    titulo: primeiroTexto(entrada, ["title"]),
    link: linkDoAtom(entrada),
    data: lerData(primeiroTexto(entrada, ["published", "updated"]))
  };
}

function ehAtom(xml) {
  return /<feed[\s>]/i.test(xml) && !/<rss[\s>]/i.test(xml);
}

function ehRss(xml) {
  return /<rss[\s>]|<rdf:RDF[\s>]/i.test(xml);
}

// Devolve os itens com título, link http(s) e data válida. Página HTML, XML quebrado ou feed vazio é erro.
export function lerFeed(xml) {
  const texto = String(xml ?? "");
  let itens;
  if (ehAtom(texto)) itens = blocos(texto, "entry").map(itemDoAtom);
  else if (ehRss(texto)) itens = blocos(texto, "item").map(itemDoRss);
  else throw new FeedInvalidoError("o conteúdo não é um feed RSS ou Atom");

  const validos = itens.filter((item) => item.titulo && /^https?:\/\//i.test(item.link) && item.data);
  if (!validos.length) throw new FeedInvalidoError("o feed não tem nenhum item com título, link e data");
  return validos;
}
