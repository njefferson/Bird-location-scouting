// =============================================================================
// Frame — app bootstrap, state, hash routing.
// =============================================================================
import { el, toast } from './ui/dom.js';
import { renderCards, renderMatrix, renderHotspotDetail, renderSpecies, renderSettings } from './ui/views.js';
import { renderRegionPicker } from './ui/regionpicker.js';
import { renderMapView } from './ui/mapview.js';
import { loadActiveRegion, regions, activeRegion, setActiveRegion, canAddRegion, regionCenter, regionOverlayDist } from './model/regions.js';
import { recentInBox } from './model/ebird.js';
import { autoSwitchEnabled, pointInCounty } from './model/geo.js';
import { mountAbout } from './ui/about.js';
import { maybeShowWhatsNew } from './ui/whatsnew.js';

const state = {
  monthIdx: new Date().getMonth(), // default = current month (§5)
  filter: 'all',
  recent: null,        // eBird overlay map: speciesCode → newest obsDt
  speciesQuery: '',
};

const app = document.getElementById('app');
const tabsRoot = document.getElementById('tabs');

const nav = {
  go(hash) { if (location.hash === hash) render(); else location.hash = hash; },
  setMonth(i) { state.monthIdx = i; render(); },
  setFilter(k) { state.filter = k; render(); },
};

const TABS = [
  { hash: '#/', label: 'Ranking', icon: '◆' },
  { hash: '#/matrix', label: 'Planner', icon: '▦' },
  { hash: '#/map', label: 'Map', icon: '🗺' },
  { hash: '#/species', label: 'Species', icon: '🔎' },
  { hash: '#/settings', label: 'Settings', icon: '⚙' },
];

function renderTabs() {
  const h = location.hash || '#/';
  tabsRoot.replaceChildren(...TABS.map((t) =>
    el('button.tab', {
      class: (h === t.hash || (t.hash === '#/' && h.startsWith('#/hotspot'))) ? 'active' : '',
      onclick: () => nav.go(t.hash),
    }, [el('span.tab-icon', {}, t.icon), el('span.tab-label', {}, t.label)])));
}

// Region switcher pills, prepended to every view (except the picker itself).
function renderRegionBar() {
  const bar = el('div.regionbar');
  const active = activeRegion().id;
  for (const r of regions()) {
    bar.append(el('button.region-pill', {
      class: r.id === active ? 'active' : '',
      onclick: () => switchRegion(r.id),
    }, r.name));
  }
  if (canAddRegion()) {
    bar.append(el('button.region-pill.add', {
      title: 'New region', 'aria-label': 'New region', onclick: () => nav.go('#/regions'),
    }, '+'));
  }
  return bar;
}

async function switchRegion(id) {
  if (id === activeRegion().id) return;
  setActiveRegion(id);
  state.recent = null;
  app.replaceChildren(el('p.empty', {}, 'Loading…'));
  await loadActiveRegion();
  render();
  refreshOverlay();
}

async function refreshOverlay() {
  // Radius sized to the region's spread (25–50 km) so sprawling multi-county
  // regions aren't under-served by one small circle.
  const recent = await recentInBox({ back: 14, dist: regionOverlayDist(), ...(regionCenter() || {}) });
  // Don't re-render over the county picker mid-selection — the overlay only
  // affects the ranking/hotspot views anyway.
  if (recent) { state.recent = recent; if (!location.hash.startsWith('#/regions') && !location.hash.startsWith('#/import')) render(); }
}

// Location auto-switch (opt-in, Settings): find which region's counties the
// device is standing in; if it isn't the active one, switch and say so.
function maybeAutoSwitch() {
  if (!autoSwitchEnabled() || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((pos) => {
    const { latitude: lat, longitude: lng } = pos.coords;
    const active = activeRegion();
    if (active.counties.some((c) => pointInCounty(lat, lng, c))) return; // already right
    const here = regions().find((r) => r.counties.some((c) => pointInCounty(lat, lng, c)));
    if (!here) return; // outside every region → leave it alone
    switchRegion(here.id).then(() => toast(`📍 You’re in ${here.name} — switched.`));
  }, () => {}, { maximumAge: 600000, timeout: 8000 });
}

function render() {
  const h = location.hash || '#/';
  renderTabs();
  window.scrollTo(0, 0);
  if (h.startsWith('#/regions')) {
    const id = h.startsWith('#/regions/') ? decodeURIComponent(h.slice('#/regions/'.length)) : null;
    return renderRegionPicker(app, state, nav, id);
  }
  if (h.startsWith('#/import')) {
    // Region share link: #/import?n=<name>&c=<code,code,…> → picker, prefilled.
    const q = new URLSearchParams(h.split('?')[1] || '');
    return renderRegionPicker(app, state, nav, null, {
      name: q.get('n') || '',
      counties: (q.get('c') || '').split(',').filter(Boolean),
    });
  }
  if (h.startsWith('#/hotspot/')) renderHotspotDetail(app, state, nav, decodeURIComponent(h.slice('#/hotspot/'.length)));
  else if (h === '#/matrix') renderMatrix(app, state, nav);
  else if (h === '#/map') renderMapView(app, state, nav);
  else if (h === '#/species') renderSpecies(app, state, nav);
  else if (h === '#/settings') renderSettings(app, state, nav);
  else renderCards(app, state, nav);
  app.prepend(renderRegionBar());
}

window.addEventListener('hashchange', render);

// Boot: the working hotspot list + species codes come from the active region's
// data files, so render only after they load (a quick, SW-cached local fetch).
(async function boot() {
  mountAbout();                  // floating "about" button, available everywhere
  app.replaceChildren(el('p.empty', {}, 'Loading…'));
  await loadActiveRegion();      // county data + species codes for the active region
  render();
  maybeShowWhatsNew();           // one-time release notes after an update
  refreshOverlay();              // live overlay (graceful), centered on the active region
  maybeAutoSwitch();             // opt-in: hop to the region you're standing in
})();

// Register the service worker for offline / installable PWA.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
