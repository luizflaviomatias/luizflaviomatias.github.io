// Ponte: o ContaCerta saiu de /contacerta/ e foi para /apps/contacerta/app/ (mesmo site, mesmos dados).
// Este service worker substitui o antigo, apaga os caches antigos, se desliga e leva as abas abertas para o endereço novo.
const ENDERECO_NOVO = 'https://luizflaviomatias.github.io/apps/contacerta/app/';
const PRIMEIRA_VERSAO_DO_CACHE_NOVO = 12;

const ehCacheAntigo = (nome) => {
  const versao = /^contacerta-v(\d+)$/.exec(nome);
  return !versao || Number(versao[1]) < PRIMEIRA_VERSAO_DO_CACHE_NOVO;
};

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (evento) => {
  evento.waitUntil((async () => {
    const nomes = await caches.keys();
    await Promise.all(nomes.filter(ehCacheAntigo).map((nome) => caches.delete(nome)));
    await self.registration.unregister();
    const abas = await self.clients.matchAll({ type: 'window' });
    await Promise.all(abas.map((aba) => aba.navigate(ENDERECO_NOVO)));
  })());
});
