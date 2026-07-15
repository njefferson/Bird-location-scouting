// =============================================================================
// Frame — app bootstrap, state, hash routing.
// =============================================================================
import { el, toast } from './ui/dom.js';
import { renderCards, renderMatrix, renderHotspotDetail, renderSpecies, renderSettings } from './ui/views.js';
import { renderRegionPicker } from './ui/regionpicker.js';
import { renderMapView } from './ui/mapview.js';
import { renderTargets, targetBar } from './ui/targets.js';
import { renderSeen, newBirdsBar } from './ui/seen.js';
import { facetBar } from './ui/facetbar.js';
import { loadActiveRegion, regions, activeRegion, setActiveRegion, canAddRegion, regionCenter, regionOverlayDist } from './model/regions.js';
import { recentInBox } from './model/ebird.js';
import { autoSwitchEnabled, pointInCounty } from './model/geo.js';
import { mountAbout } from './ui/about.js';
import { mountThemeToggle } from './ui/theme.js';
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
  rerender() { render(); },
};

// 22px line icons, stroke=currentColor so the tab's colour (--dim / active
// --accent) drives them. Ranking = ascending bars, Planner = window grid,
// Map = pin, Species = magnifier, Settings = two sliders.
const svgIcon = (paths) =>
  `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const TABS = [
  { hash: '#/', label: 'Ranking', icon: svgIcon('<line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="5"/>') },
  { hash: '#/matrix', label: 'Planner', icon: svgIcon('<rect x="4" y="4" width="16" height="16" rx="1.5"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/>') },
  { hash: '#/map', label: 'Map', icon: svgIcon('<path d="M12 21s-6-5.686-6-10a6 6 0 0 1 12 0c0 4.314-6 10-6 10z"/><circle cx="12" cy="11" r="2"/>') },
  { hash: '#/species', label: 'Species', icon: svgIcon('<circle cx="11" cy="11" r="6"/><line x1="20" y1="20" x2="15.5" y2="15.5"/>') },
  { hash: '#/settings', label: 'Settings', icon: svgIcon('<line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/><circle cx="9" cy="8" r="2.5"/><circle cx="15" cy="16" r="2.5"/>') },
];

function renderTabs() {
  const h = location.hash || '#/';
  tabsRoot.replaceChildren(...TABS.map((t) =>
    el('button.tab', {
      class: (h === t.hash || (t.hash === '#/' && h.startsWith('#/hotspot'))) ? 'active' : '',
      onclick: () => nav.go(t.hash),
    }, [el('span.tab-icon', { html: t.icon }), el('span.tab-label', {}, t.label)])));
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
  // The overlay only affects the ranked views, so only they need re-rendering
  // when it arrives — never re-render over the picker, the seen/targets pickers,
  // or Settings (that would wipe an in-progress import textarea and steal focus).
  // And keep the scroll position: the overlay can land seconds after boot, so a
  // scroll-to-top here would yank the list out from under the reader.
  if (recent) {
    state.recent = recent;
    if (isRankedView()) render({ scroll: false });
  }
}

function isRankedView(h = location.hash || '#/') {
  return h === '#/' || h === '#/matrix' || h === '#/map' || h.startsWith('#/hotspot/');
}

// Location auto-switch (opt-in, Settings): find which region's counties the
// device is standing in; if it isn't the active one, switch and say so.
function maybeAutoSwitch() {
  if (!autoSwitchEnabled() || !navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((pos) => {
    // The prompt/resolve can land seconds later — never switch out from under a
    // county selection in progress (it would wipe the picker's draft).
    if (location.hash.startsWith('#/regions') || location.hash.startsWith('#/import')) return;
    const { latitude: lat, longitude: lng } = pos.coords;
    const active = activeRegion();
    if (active.counties.some((c) => pointInCounty(lat, lng, c))) return; // already right
    const here = regions().find((r) => r.counties.some((c) => pointInCounty(lat, lng, c)));
    if (!here) return; // outside every region → leave it alone
    const from = active.id; // remember where we were, so the switch has an exit
    switchRegion(here.id).then(() => toast(`📍 You’re in ${here.name} — switched.`, {
      action: { label: 'Undo', onClick: () => switchRegion(from) },
    }));
  }, () => {}, { maximumAge: 600000, timeout: 8000 });
}

function render(opts = {}) {
  const h = location.hash || '#/';
  renderTabs();
  // Navigation scrolls to the top; an in-place re-render (e.g. the live overlay
  // arriving) passes { scroll: false } to hold the reader's place.
  if (opts.scroll !== false) window.scrollTo(0, 0);
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
  if (h === '#/targets') return renderTargets(app, state, nav);
  if (h === '#/seen') return renderSeen(app, state, nav);
  if (h.startsWith('#/hotspot/')) renderHotspotDetail(app, state, nav, decodeURIComponent(h.slice('#/hotspot/'.length)));
  else if (h === '#/matrix') renderMatrix(app, state, nav);
  else if (h === '#/map') renderMapView(app, state, nav);
  else if (h === '#/species') renderSpecies(app, state, nav);
  else if (h === '#/settings') renderSettings(app, state, nav);
  else renderCards(app, state, nav);
  // Standing list-mode indicators on the ranked views (below the region pills,
  // above the view header). Each is null unless its mode is actually steering
  // the ranking — prepended target-then-new so the region pills stay on top and
  // the mode bars read top-to-bottom: New for me, then target presence.
  const rankedView = h === '#/' || h === '#/matrix' || h === '#/map' || h.startsWith('#/hotspot/');
  if (rankedView) {
    const tb = targetBar(state, nav, render); if (tb) app.prepend(tb);
    const nb = newBirdsBar(state, nav, render); if (nb) app.prepend(nb);
    const fb = facetBar(state, nav, render); if (fb) app.prepend(fb);
  }
  app.prepend(renderRegionBar());
}

window.addEventListener('hashchange', render);

// Boot: the working hotspot list + species codes come from the active region's
// data files, so render only after they load (a quick, SW-cached local fetch).
(async function boot() {
  mountAbout();                  // floating "about" button, available everywhere
  mountThemeToggle();            // floating moon/sun Dawn Mode toggle, everywhere
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
