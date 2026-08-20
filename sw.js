// Controle Operacional — Service Worker
//
// O index.html já registrava "./sw.js?v=3.10.0", mas o arquivo nunca existiu: o registro
// falhava em silêncio e o app não funcionava offline. Este arquivo fecha essa lacuna.
//
// Estratégia: cache-first para o app shell (abre instantâneo offline, que é o requisito de
// campo), atualizando em segundo plano quando há rede.
//
// VERSIONAMENTO — ao alterar o index.html, atualize o valor abaixo E o "?v=" usado em:
//   1) index.html -> navigator.serviceWorker.register('./sw.js?v=...')
//   2) manifest.webmanifest -> "start_url"
const CACHE = 'controle-operacional-v3.10.0';

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
    console.error('Controle Operacional SW: falha ao pré-cachear o app shell.', err);
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

   // Já tem cache: devolve na hora. A busca de rede acima segue rodando e atualiza
   // o cache sozinha para a próxima abertura.
   if(cacheado) return cacheado;

   return rede.then(resp => {
    if(resp) return resp;
    if(req.mode === 'navigate') return caches.match('./index.html');
    return new Response('Offline e sem versão em cache para este arquivo.', {status: 503, statusText: 'Offline'});
   });
  })
 );
});
