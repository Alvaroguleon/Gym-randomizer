// Serves the app from cache so it works offline, and refreshes the cache
// in the background so new versions arrive on the next launch.
const CACHE = 'reroll-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
