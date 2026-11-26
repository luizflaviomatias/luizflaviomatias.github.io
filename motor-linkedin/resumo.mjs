// Escreve o post do dia a partir das manchetes que a engine de Notícias gravou em noticias/dados/pt.json.
// A IA só vê título, fonte e data; nada do texto das matérias. Se ela falhar, sai o post padrão.
import { GeracaoFalhouError } from "./claude.mjs";

export const URL_DAS_NOTICIAS = "https://luizflaviomatias.github.io/noticias/";
export const HASHTAGS = ["Noticias", "Tecnologia", "Negocios", "Economia", "Politica"];
export const TAMANHO_MAXIMO_DO_CORPO = 1500;
const TAMANHO_MINIMO_DO_CORPO = 200;
const MANCHETES_POR_ASSUNTO_NO_PEDIDO = 3;
const FUSO = "America/Sao_Paulo";

const ASSUNTOS = {
  tecnologia: { nome: "Tecnologia", icone: "💻" },
  negocios: { nome: "Gestão de negócios", icone: "📊" },
  "politica-nacional": { nome: "Política nacional", icone: "🏛️" },
  "politica-internacional": { nome: "Política internacional", icone: "🌎" },
  economia: { nome: "Economia", icone: "💰" },
  curiosidades: { nome: "Curiosidades", icone: "💡" }
};

const FECHAMENTO = `As 5 manchetes de cada assunto, com link para as fontes: ${URL_DAS_NOTICIAS}`;

const INSTRUCOES = `Você escreve, em português do Brasil, o post diário de LinkedIn de um gestor de TI que resume as notícias do dia para a rede dele.
Regras:
- Use só o que está nas manchetes recebidas. Não invente fatos, números, nomes nem consequências que não estejam nelas.
- Reescreva com suas palavras; não copie as manchetes inteiras.
- Política com neutralidade: relate, sem opinar nem tomar partido.
- Formato: uma linha de abertura com a data; depois uma linha por assunto, na ordem recebida, começando pelo emoji do assunto, com no máximo duas frases sobre o destaque e a fonte entre parênteses.
- Texto puro: sem markdown, sem hashtags, sem links e sem frase de fechamento (o link e as hashtags são acrescentados depois).
- No máximo ${TAMANHO_MAXIMO_DO_CORPO - 300} caracteres.
Responda só com o texto do post.`;

export class PostInvalidoError extends Error {
  constructor(motivo) {
    super(`texto da IA recusado: ${motivo}`);
    this.name = "PostInvalidoError";
  }
}

export function dataPorExtenso(data) {
  return data.toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function assuntosComManchetes(noticias) {
  return noticias.categorias
    .filter((categoria) => ASSUNTOS[categoria.id] && categoria.itens.length)
    .map((categoria) => ({ ...ASSUNTOS[categoria.id], itens: categoria.itens }));
}

function descreverManchete(item) {
  const repercussao = item.fontes > 1 ? `, em ${item.fontes} fontes` : "";
  return `- ${item.titulo} (${item.fonte}${repercussao})`;
}

export function montarPedido(noticias, agora) {
  const blocos = assuntosComManchetes(noticias).map(({ nome, icone, itens }) =>
    [`${icone} ${nome}`, ...itens.slice(0, MANCHETES_POR_ASSUNTO_NO_PEDIDO).map(descreverManchete)].join("\n"));
  return `Data de hoje: ${dataPorExtenso(agora)}.\nEscolha um destaque por assunto (a primeira manchete de cada lista é a mais repercutida).\n\n${blocos.join("\n\n")}`;
}

export function validarCorpo(texto) {
  if (texto.length < TAMANHO_MINIMO_DO_CORPO) throw new PostInvalidoError(`curto demais (${texto.length} caracteres)`);
  if (texto.length > TAMANHO_MAXIMO_DO_CORPO) throw new PostInvalidoError(`longo demais (${texto.length} caracteres)`);
  if (/https?:\/\/|www\./i.test(texto)) throw new PostInvalidoError("tem link");
  if (/(^|\s)#\w/.test(texto)) throw new PostInvalidoError("tem hashtag");
  if (/\*\*|__|^#+\s/m.test(texto)) throw new PostInvalidoError("tem markdown");
  return texto;
}

export function corpoPadrao(noticias, agora) {
  const linhas = assuntosComManchetes(noticias).map(({ nome, icone, itens: [destaque] }) => `${icone} ${nome}: ${destaque.titulo} (${destaque.fonte})`);
  return [`Notícias de ${dataPorExtenso(agora)}: o destaque de cada assunto.`, ...linhas].join("\n\n");
}

function postCompleto(corpo, origem, motivoDoPadrao) {
  return { texto: `${corpo}\n\n${FECHAMENTO}`, hashtags: HASHTAGS, origem, motivoDoPadrao };
}

// gerarTexto é opcional: sem ele (chave da Claude API ausente), sai sempre o post padrão.
export function criarRedator({ gerarTexto = null } = {}) {
  return {
    async redigir(noticias, agora) {
      if (!gerarTexto) return postCompleto(corpoPadrao(noticias, agora), "padrao", "sem chave da Claude API");
      try {
        const corpo = validarCorpo(await gerarTexto(INSTRUCOES, montarPedido(noticias, agora)));
        return postCompleto(corpo, "ia");
      } catch (erro) {
        if (!(erro instanceof GeracaoFalhouError || erro instanceof PostInvalidoError)) throw erro;
        return postCompleto(corpoPadrao(noticias, agora), "padrao", erro.message);
      }
    }
  };
}
