// Frame service worker — offline-first for the static app, network-first for
// the live eBird overlay (so badges stay fresh, static layer always works).
const CACHE = 'frame-v17';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon.svg', './apple-touch-icon.png',
  './src/styles.css', './src/main.js',
  './src/ui/dom.js', './src/ui/badges.js', './src/ui/views.js', './src/ui/about.js', './src/ui/whatsnew.js', './src/ui/regionpicker.js', './src/ui/mapview.js', './src/ui/panzoom.js',
  './src/data/species.js', './src/data/hotspots.js', './src/data/habitats.js', './src/data/changelog.js', './src/data/counties.js', './src/data/roadmap.js', './src/data/county-shapes.js',
  './src/model/inference.js', './src/model/scoring.js', './src/model/ebird.js', './src/model/regions.js', './src/model/geo.js',
  './data/taxonomy.json',
  './data/counties/US-CA-067.json', './data/counties/US-CA-017.json', './data/counties/US-CA-061.json',
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
  // Everything else: stale-while-revalidate — serve the cache instantly for
  // offline/speed, but ALWAYS refetch in the background so a deployed change
  // (new JS, refreshed county data) reaches installed clients on their
  // next load, without waiting for a service-worker version bump.
  e.respondWith(caches.match(e.request).then((hit) => {
    const refresh = fetch(e.request).then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    });
    if (hit) {
      e.waitUntil(refresh.catch(() => {})); // offline → keep the cached copy
      return hit;
    }
    return refresh.catch(() => hit);
  }));
});
