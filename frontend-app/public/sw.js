const CACHE_VERSION = 'trilva-v1';
const CACHE_SHELL = `${CACHE_VERSION}-shell`;
const OFFLINE_URL = '/offline.html';
const APP_SHELL = [OFFLINE_URL, '/manifest.json', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((c) => !c.startsWith(CACHE_VERSION)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // nao intercepta chamadas de API (outro host)

  // navegacao entre paginas: tenta rede, cai pro cache e por fim pra pagina offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_SHELL).then((cache) => cache.put(request, copia));
          return resposta;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))),
    );
    return;
  }

  // assets estaticos (_next, ícones, css): cache-first, atualizando em segundo plano
  if (url.pathname.startsWith('/_next/static/') || url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const buscaRede = fetch(request)
          .then((resposta) => {
            caches.open(CACHE_SHELL).then((cache) => cache.put(request, resposta.clone()));
            return resposta;
          })
          .catch(() => cached);
        return cached || buscaRede;
      }),
    );
  }
});
