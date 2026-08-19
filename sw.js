// Relatório Diário de Operações — Service Worker
// Estratégia: cache-first para o app shell (abre instantaneamente offline, que é o requisito
// de campo), com atualização em segundo plano quando há rede (stale-while-revalidate), para
// o app não ficar preso numa versão antiga enquanto houver conexão de vez em quando.
//
// VERSIONAMENTO — ao alterar o index.html, atualize o valor abaixo E o "?v=" usado em:
//   1) index.html -> navigator.serviceWorker.register('./sw.js?v=...')
//   2) manifest.webmanifest -> "start_url": "./index.html?v=..."
const CACHE = 'rdo-v3';

const APP_SHELL = [
 './index.html',
 './manifest.webmanifest',
 './icon-192.png',
 './icon-512.png'
];

self.addEventListener('install', event => {
 event.waitUntil(
  caches.open(CACHE)
   .then(c => c.addAll(APP_SHELL))
   .then(() => self.skipWaiting())
   .catch(err => {
    // addAll() é tudo-ou-nada: se um arquivo falhar, NENHUM fica em cache e o modo offline
    // simplesmente não funciona — em silêncio, se não for logado. Por isso o log explícito.
    console.error('RDO SW: falha ao pré-cachear o app shell — modo offline indisponível.', err);
    throw err;
   })
 );
});

self.addEventListener('activate', event => {
 event.waitUntil(
  caches.keys()
   .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
   .then(() => self.clients.claim())
 );
});

self.addEventListener('fetch', event => {
 const req = event.request;
 // Só intercepta GET do próprio domínio. O app não faz nenhuma chamada de rede externa.
 if(req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

 event.respondWith(
  caches.match(req, {ignoreSearch: true}).then(cacheado => {
   const rede = fetch(req).then(resp => {
    if(resp && resp.ok){
     const copia = resp.clone();
     caches.open(CACHE).then(c => c.put(req, copia));
    }
    return resp;
   }).catch(() => null);

   // Já tem cache: devolve na hora (abertura instantânea offline). A busca de rede acima já
   // está em andamento e atualiza o cache sozinha para a próxima abertura.
   if(cacheado) return cacheado;

   // Primeira visita sem cache: depende da rede, com fallback de navegação.
   return rede.then(resp => {
    if(resp) return resp;
    if(req.mode === 'navigate') return caches.match('./index.html');
    return new Response('Offline e sem versão em cache para este arquivo.', {status: 503, statusText: 'Offline'});
   });
  })
 );
});
