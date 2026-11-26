// Ponto de entrada (npm run noticias): atualiza noticias/dados/<idioma>.json para cada idioma do fontes.json.
// Feed fora do ar vira aviso; o processo só termina com erro se alguma categoria ficar vazia.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { criarBuscador } from "./buscador.mjs";
import { atualizarIdioma, categoriasIncompletas } from "./motor.mjs";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const PASTA_DADOS = join(RAIZ, "noticias", "dados");

async function lerJson(caminho) {
  try {
    return JSON.parse(await readFile(caminho, "utf8"));
  } catch (erro) {
    if (erro.code === "ENOENT") return null;
    throw new Error(`não consegui ler ${caminho}: ${erro.message}`);
  }
}

// Aviso no formato que o GitHub Actions mostra no resumo da execução.
const avisar = (mensagem) => console.log(`::warning::${mensagem}`);

async function principal() {
  const configuracao = await lerJson(join(RAIZ, "motor-noticias", "fontes.json"));
  const buscarXml = criarBuscador();
  const agora = new Date();
  await mkdir(PASTA_DADOS, { recursive: true });
  let algumaCategoriaVazia = false;

  for (const [idioma, config] of Object.entries(configuracao)) {
    const caminho = join(PASTA_DADOS, `${idioma}.json`);
    const resultado = await atualizarIdioma({ idioma, config, buscarXml, anterior: await lerJson(caminho), agora });

    for (const falha of resultado.fontesComFalha) avisar(`[${idioma}] ${falha.fonte} fora do ar: ${falha.erro}`);
    for (const id of categoriasIncompletas(resultado)) avisar(`[${idioma}] ${id} ficou com menos de 5 notícias`);
    const vazias = resultado.categorias.filter((categoria) => !categoria.itens.length);
    algumaCategoriaVazia ||= vazias.length > 0;

    await writeFile(caminho, JSON.stringify(resultado, null, 2) + "\n");
    const resumo = resultado.categorias.map((categoria) => `${categoria.id}=${categoria.itens.length}`).join(" ");
    console.log(`[${idioma}] ${resumo} · ${resultado.fontesComFalha.length} fonte(s) com falha`);
  }

  if (algumaCategoriaVazia) {
    console.error("Alguma categoria ficou sem nenhuma notícia; veja os avisos acima.");
    process.exitCode = 1;
  }
}

principal().catch((erro) => {
  console.error(erro);
  process.exitCode = 1;
});
