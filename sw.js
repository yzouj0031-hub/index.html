const CACHE_NAME = 'wolf-pwa-v45-reasoning-context';
const APP_SHELL = [
  './',
  './index.html',
  './i18n.js',
  './reasoning-control.js',
  './undercover-ui.js',
  './undercover-ui.css',
  './manifest.webmanifest',
  './tablet.css',
  './role-effects.css?v=36',
  './role-effects.js?v=36',
  './role-sigils.js',
  './action-cg.js',
  './ui-icons.js',
  './teaching-worldbooks.js',
  './reasoning-context.js',
  './community-matches.js',
  './mystery.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

function shouldRefreshFromNetwork(url) {
  return url.pathname.endsWith('/native-http.js') ||
    url.pathname.endsWith('/replay-generator.js') ||
    url.pathname.endsWith('/community-matches.js') ||
    url.pathname.endsWith('/role-effects.js') ||
    url.pathname.endsWith('/role-effects.css') ||
    url.pathname.includes('/icons/roles/');
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('wolf-pwa-') && key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Role-card code and portraits change whenever roles are added. Fetching these
  // from the network first prevents an older service-worker cache from leaving
  // newly added roles as blank cards; the cached copy still keeps offline play.
  if (shouldRefreshFromNetwork(url)) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      }
      return response;
    }))
  );
});
