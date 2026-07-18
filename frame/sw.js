// Frame service worker — offline-first for the static app, network-first for
// the live eBird overlay (so badges stay fresh, static layer always works).
const CACHE = 'frame-v36';
const ASSETS = [
  './', './index.html', './manifest.webmanifest', './icon.svg', './apple-touch-icon.png',
  './src/styles.css', './src/main.js',
  './src/ui/dom.js', './src/ui/badges.js', './src/ui/views.js', './src/ui/about.js', './src/ui/theme.js', './src/ui/whatsnew.js', './src/ui/regionpicker.js', './src/ui/mapview.js', './src/ui/panzoom.js', './src/ui/basemap.js', './src/ui/scoreinfo.js', './src/ui/facetbar.js', './src/ui/photo.js', './src/ui/targets.js', './src/ui/seen.js', './src/ui/freshness.js',
  './src/data/species.js', './src/data/facets.js', './src/data/hotspots.js', './src/data/habitats.js', './src/data/changelog.js', './src/data/counties.js', './src/data/roadmap.js', './src/data/county-shapes.js', './src/data/basemap.js', './src/data/water-shapes.js',
  './src/model/inference.js', './src/model/scoring.js', './src/model/facets.js', './src/model/photo.js', './src/model/ebird.js', './src/model/regions.js', './src/model/geo.js', './src/model/targets.js', './src/model/seen.js', './src/model/lists.js', './src/model/freshness.js',
  './data/taxonomy.json',
  './data/counties/US-CA-067.json', './data/counties/US-CA-017.json', './data/counties/US-CA-061.json',
];

const PRECACHED = new Set(ASSETS.map((u) => new URL(u, self.registration.scope).href));

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // Precache each asset INDIVIDUALLY. cache.addAll is atomic — one flaky
    // request (any of ~8 MB of assets) rejects the whole batch, and the old
    // swallow-then-skipWaiting left the new cache empty while activate deleted
    // the old one, permanently breaking offline. allSettled keeps whatever
    // succeeded; the rest self-heal via the fetch handler on later loads.
    await Promise.allSettled(ASSETS.map((u) => c.add(u)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    for (const k of await caches.keys()) {
      if (k === CACHE) continue;
      // Carry forward runtime-cached data (county JSONs a user downloaded by
      // visiting other regions, cached fonts) so a version bump doesn't force a
      // re-download of offline data. App code is NOT carried over — the new
      // precache already holds the current version, so the module graph stays
      // consistent.
      const old = await caches.open(k);
      for (const req of await old.keys()) {
        if (PRECACHED.has(req.url)) continue;
        if (!(await c.match(req))) {
          const res = await old.match(req);
          if (res) await c.put(req, res);
        }
      }
      await caches.delete(k);
    }
    await self.clients.claim();
  })());
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
  // Cross-origin Google Fonts (the IBM Plex faces — every number in the app):
  // their responses are opaque (res.ok is false), so the generic branch below
  // would never cache them and offline would lose the fonts entirely. Cache the
  // opaque response so the offline-first promise holds after one online load.
  const isFont = url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');

  // Everything else: stale-while-revalidate — serve the cache instantly for
  // offline/speed, but ALWAYS refetch in the background so a deployed change
  // (new JS, refreshed county data) reaches installed clients on their
  // next load, without waiting for a service-worker version bump.
  e.respondWith(caches.match(e.request).then((hit) => {
    const refresh = fetch(e.request).then((res) => {
      if (res && (res.ok || (isFont && res.type === 'opaque'))) {
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
