// Normalização de títulos para comparar, filtrar e classificar sem depender de acento ou caixa.

const PALAVRAS_VAZIAS = new Set([
  // pt
  "para", "como", "mais", "sobre", "apos", "entre", "pelo", "pela", "pelos", "pelas", "essa", "esse", "este", "esta",
  "isso", "quando", "onde", "dizem", "contra", "seus", "suas", "sera", "pode", "podem", "deve", "devem", "ainda",
  "desde", "veja", "saiba", "nova", "novo", "novas", "novos", "anos", "hoje", "faz", "fazer", "depois", "antes",
  "qual", "quais", "muito", "outro", "outra", "todos", "todas", "porque",
  // en
  "with", "from", "that", "this", "after", "over", "into", "about", "what", "when", "will", "have", "says", "said",
  "more", "their", "they", "than", "could", "would", "amid", "just", "your", "were", "been", "here", "there", "which",
  // es
  "tras", "pero", "segun", "cuando", "donde", "dice", "tambien", "hasta", "estos"
]);

const TAMANHO_MINIMO_PALAVRA = 4;

export function normalizar(texto) {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9%?]+/g, " ")
    .trim();
}

// Palavras que identificam a história: sem acento, sem palavras vazias e sem as muito curtas.
export function palavrasDoTitulo(titulo) {
  return new Set(
    normalizar(titulo)
      .split(" ")
      .map((palavra) => palavra.replace(/[%?]/g, ""))
      .filter((palavra) => palavra.length >= TAMANHO_MINIMO_PALAVRA && !PALAVRAS_VAZIAS.has(palavra))
  );
}

// "Áudio: ...", "Watch: ..." e afins não fazem parte da manchete.
const PREFIXO_DE_MIDIA = /^(áudio|audio|vídeo|video|watch|listen|ao vivo|en vivo|live|podcast)\s*[:|–-]\s*/i;

export function limparTitulo(titulo) {
  return String(titulo).replace(/\s+/g, " ").trim().replace(PREFIXO_DE_MIDIA, "");
}
