// Frame service worker — offline-first for the static app, network-first for
// the live eBird overlay (so badges stay fresh, static layer always works).
const CACHE = 'frame-v2';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon.svg',
  './src/styles.css', './src/main.js',
  './src/ui/dom.js', './src/ui/badges.js', './src/ui/views.js', './src/ui/about.js',
  './src/data/species.js', './src/data/hotspots.js', './src/data/habitats.js',
  './src/model/inference.js', './src/model/scoring.js', './src/model/ebird.js', './src/model/reference.js',
  './data/reference.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // Live overlay (eBird proxy): never cache; fail soft.
  if (url.pathname.includes('/api/ebird') || url.hostname.includes('ebird.org')) {
    e.respondWith(fetch(e.request).catch(() => new Response('null', { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  // Navigations: network-first so deploys update, fall back to cached shell.
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('./index.html')));
    return;
  }
  // Everything else: cache-first (offline), revalidate in background.
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
    return res;
  }).catch(() => hit)));
});
