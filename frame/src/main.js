// =============================================================================
// Frame — app bootstrap, state, hash routing.
// =============================================================================
import { el } from './ui/dom.js';
import { renderCards, renderMatrix, renderHotspotDetail, renderSpecies, renderSettings } from './ui/views.js';
import { loadReference } from './model/reference.js';
import { recentInBox } from './model/ebird.js';

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

function render() {
  const h = location.hash || '#/';
  renderTabs();
  window.scrollTo(0, 0);
  if (h.startsWith('#/hotspot/')) return renderHotspotDetail(app, state, nav, decodeURIComponent(h.slice('#/hotspot/'.length)));
  if (h === '#/matrix') return renderMatrix(app, state, nav);
  if (h === '#/species') return renderSpecies(app, state, nav);
  if (h === '#/settings') return renderSettings(app, state, nav);
  return renderCards(app, state, nav);
}

window.addEventListener('hashchange', render);

// Boot: paint immediately on the static/inference layer, then enrich.
(async function boot() {
  render();
  await loadReference();         // swap in real eBird data if present
  render();
  const recent = await recentInBox({ back: 14 }); // live overlay (graceful)
  if (recent) { state.recent = recent; render(); }
})();

// Register the service worker for offline / installable PWA.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
