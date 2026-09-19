// Page: network first, cache when offline. Other app files: cache first, refreshed in the background.
// Exercise photos: kept in their own cache once viewed, so they work offline too.
const CACHE = 'reroll-v6';
const IMG_CACHE = 'reroll-photos';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.hostname === 'raw.githubusercontent.com') {
    e.respondWith(caches.open(IMG_CACHE).then(async cache => {
      const hit = await cache.match(e.request);
      if (hit) return hit;
      const res = await fetch(e.request);
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    }));
    return;
  }
  // The page itself: always try the network first so updates show up, fall back to cache offline.
  if (e.request.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      try {
        const res = await fetch(e.request, { cache: 'no-store' });
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      } catch (err) {
        return (await cache.match(e.request, { ignoreSearch: true })) || cache.match('./index.html');
      }
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  }));
});
