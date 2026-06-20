// ============================================================
// VidTudo Service Worker — PWA Cache & Offline
// ============================================================
const APP_VERSION    = 'vidtudo-v1.0.0';
const CACHE_STATIC   = `${APP_VERSION}-static`;
const CACHE_DYNAMIC  = `${APP_VERSION}-dynamic`;

// Arquivos essenciais para funcionar offline
const STATIC_FILES = [
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── INSTALL: pré-cacheou os estáticos ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpa caches antigos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: Cache-First para estáticos, Network-First para resto ──
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar extensões de browser e requisições não-HTTP
  if (!request.url.startsWith('http')) return;

  // Cache-First para arquivos do próprio app
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request)
          .then(response => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_STATIC).then(c => c.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline fallback
            if (request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
    );
    return;
  }

  // Network-First para recursos externos (fontes, CDN)
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_DYNAMIC).then(c => c.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ── PUSH NOTIFICATIONS (preparado para futuro) ──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'VidTudo';
  const options = {
    body:    data.body    || 'Novo vídeo disponível!',
    icon:    data.icon    || './icons/icon-192.png',
    badge:   data.badge   || './icons/icon-96.png',
    image:   data.image   || null,
    tag:     data.tag     || 'vidtudo-notif',
    renotify: true,
    vibrate: [200, 100, 200],
    data:    { url: data.url || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data.url;
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC (salvar ações offline) ──
self.addEventListener('sync', event => {
  if (event.tag === 'sync-videos') {
    event.waitUntil(sincronizarVideos());
  }
});

async function sincronizarVideos() {
  // Placeholder para sincronização com backend no futuro
  console.log('[SW] Sincronizando vídeos pendentes...');
}
