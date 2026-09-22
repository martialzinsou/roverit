/**
 * Service worker PWA : met en cache l'app shell (stratégie cache-first pour
 * les ressources statiques) et utilise un cache-network pour l'API avec
 * repli hors-ligne.
 */
const CACHE = 'roverit-v1';
const APP_SHELL = ['./index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ ok: false, offline: true }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    return;
  }

  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE + '-api')
            .then((c) => c.put(event.request, copy))
            .catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return new Response(JSON.stringify({ offline: true }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            });
          }),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
          return response;
        }),
    ),
  );
});