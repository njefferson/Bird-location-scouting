// =============================================================================
// VIEWS — the four screens from §5: Cards, Matrix, Species search, Settings,
// plus a per-hotspot species matrix detail.
// =============================================================================
import { el, clear, pct, sparkline } from './dom.js';
import { trustBadge, inferredChip, liveBadge, nBadge } from './badges.js';
import { SPECIES } from '../data/species.js';
import { hotspotMapLink, BOX } from '../data/hotspots.js';
import { HABITATS } from '../data/habitats.js';
import { MONTHS, frequencySeries, frequency, seasonality, STATUS_LABEL } from '../model/inference.js';
import { rankHotspots, FILTERS, bestForSpecies, TRUST } from '../model/scoring.js';
import { getHotspots, regionMeta, regions, savedRegions, canAddRegion, activeRegion } from '../model/regions.js';
import { ebirdSettings, saveEbirdSettings, probe, nearestForSpecies } from '../model/ebird.js';

function daysAgo(obsDt) {
  if (!obsDt) return null;
  const d = new Date(obsDt.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return null;
  // Date.now() at call time, not module load — a PWA can stay open for days.
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
}

// A bird name that opens that species' page INSIDE the planner (the Species view).
function speciesLink(cls, s, state, nav) {
  return el(`a.bird-link${cls ? '.' + cls : ''}`, {
    href: '#/species',
    title: `See ${s.name} in the planner`,
    onclick: (ev) => { ev.preventDefault(); state.speciesQuery = s.name; nav.go('#/species'); },
  }, s.name);
}

// External link to a species' full eBird page (kept available from the Species view).
function ebirdLink(s) {
  return el('a.ebird-link', {
    href: `https://ebird.org/species/${s.code}`,
    target: '_blank', rel: 'noopener',
    title: `Open ${s.name} on eBird.org`,
  }, '↗ eBird');
}

// --- Shared controls --------------------------------------------------------
function monthSelector(state, onChange) {
  const sel = el('div.months');
  MONTHS.forEach((m, i) => {
    sel.append(el('button.month', {
      class: i === state.monthIdx ? 'active' : '',
      onclick: () => onChange(i),
    }, m));
  });
  return sel;
}

function filterBar(state, onChange) {
  const bar = el('div.filters');
  const active = FILTERS[state.filter] || FILTERS.all;
  Object.values(FILTERS).forEach((f) => {
    bar.append(el('button.filter', {
      class: f.key === active.key ? 'active' : '',
      title: f.hint,
      onclick: () => onChange(f.key),
    }, f.label));
  });
  bar.append(el('div.filter-hint', {}, active.hint));
  return bar;
}

// =============================================================================
// CARDS (default view)
// =============================================================================
export function renderCards(root, state, nav) {
  clear(root);
  root.append(el('header.bar', {}, [
    el('div.title-row', {}, [
      el('h1', {}, 'Frame'),
      el('span.subtitle', {}, `Photographer’s hotspot ranking · ${MONTHS[state.monthIdx]}`),
    ]),
    monthSelector(state, (i) => nav.setMonth(i)),
    filterBar(state, (k) => nav.setFilter(k)),
  ]));

  const ranked = rankHotspots(getHotspots(), state.monthIdx);
  const rows = (FILTERS[state.filter] || FILTERS.all).apply(ranked);

  const list = el('div.cards');
  if (!rows.length) {
    list.append(el('p.empty', {}, 'No hotspots match this filter for this month.'));
  }
  for (const r of rows) list.append(card(r, state, nav));
  root.append(list);
  root.append(dataProvenanceFooter());
}

function card(r, state, nav) {
  const h = r.hotspot;
  const top = r.contributions.slice(0, 3);

  // Live badge: most-recent of this card's top species, if the overlay has it.
  let live = null;
  if (state.recent) {
    const ds = top.map((c) => state.recent[c.species.code]).filter(Boolean).map(daysAgo).filter((x) => x != null);
    if (ds.length) live = liveBadge(Math.min(...ds));
  }

  const scoreRing = el('div.score', { style: `--s:${r.score}` }, [
    el('span.score-num', {}, String(r.score)),
    el('span.score-cap', {}, 'score'),
  ]);

  const head = el('div.card-head', {}, [
    el('div.card-head-main', {}, [
      el('h2', {}, h.name),
      el('div.tags', {}, [
        trustBadge(r.trust),
        nBadge(r.n),
        inferredChip(r.inferredCount),
        live,
        h.outsideBox ? el('span.chip.dim', { title: 'Just outside the strict box — toggle in Settings.' }, 'edge') : null,
      ]),
    ]),
    scoreRing,
  ]);

  const habs = el('div.habs', {}, (h.habitats || []).map((k) => el('span.hab', { title: HABITATS[k]?.blurb }, HABITATS[k]?.label || k)));

  const species = el('div.top-species', {}, top.length
    ? top.map((c) => el('div.tsp', {}, [
        speciesLink('tsp-name', c.species, state, nav),
        el('span.tsp-freq', { title: c.freq.rule }, pct(c.freq.value) + (c.freq.inferred ? '*' : '')),
        el('span.tsp-bar', {}, el('i', { style: `width:${Math.round(c.freq.value * 100)}%` })),
      ]))
    : el('span.dim', {}, 'Nothing notably photographable this month.'));

  const actions = el('div.card-actions', {}, [
    el('a.btn', { href: hotspotMapLink(h), target: '_blank', rel: 'noopener' }, '🗺 Maps'),
    el('button.btn', { onclick: () => nav.go(`#/hotspot/${h.id}`) }, 'Species matrix'),
    el('button.btn.ghost', { onclick: () => toggleNotes(card, h) }, 'Access'),
  ]);

  const node = el('div.card', {}, [head, habs, species, actions]);
  node._hotspot = h;
  return node;
}

function toggleNotes(_, h) {
  // Lightweight expandable access note (imported from the location file later).
  const existing = document.querySelector(`.card-notes[data-h="${h.id}"]`);
  if (existing) { existing.remove(); return; }
  const all = [...document.querySelectorAll('.card')].find((c) => c._hotspot === h);
  if (all) all.append(el('div.card-notes', { dataset: { h: h.id } }, h.access || 'No curated access notes for this hotspot yet — use the 🗺 Maps button.'));
}

function dataProvenanceFooter() {
  const meta = regionMeta();
  let msg = meta.loaded
    ? `${meta.region} region · ${meta.hotspots} hotspots across ${meta.counties} county file(s) · eBird histogram data built ${meta.builtAt || '(date n/a)'}. * = a value still on the habitat/season model.`
    : 'No region data loaded yet — every frequency is the transparent habitat/season model (marked *).';
  // Loud, honest failure: county data without species codes zeroes every score.
  if (meta.loaded && !meta.taxonomy) msg += ' ⚠ data/taxonomy.json failed to load — species codes are missing, so scores read 0. Run the Refresh eBird data action.';
  return el('footer.provenance', {}, [el('strong', {}, 'Data: '), msg]);
}

// =============================================================================
// MATRIX — hotspot × month heatmap of HotspotScore (§5)
// =============================================================================
export function renderMatrix(root, state, nav) {
  clear(root);
  root.append(el('header.bar', {}, [
    el('h1', {}, 'Year planner'),
    el('span.subtitle', {}, 'HotspotScore by month — tap a cell for that month’s detail.'),
  ]));

  // Pre-rank each month so cell color is comparable within a month column.
  const byMonth = MONTHS.map((_, m) => {
    const ranked = rankHotspots(getHotspots(), m);
    return Object.fromEntries(ranked.map((r) => [r.hotspot.id, r]));
  });

  const table = el('table.matrix');
  const head = el('tr', {}, [el('th.corner', {}, 'Hotspot'), ...MONTHS.map((m, i) =>
    el('th', { class: i === state.monthIdx ? 'col-active' : '' }, m))]);
  table.append(head);

  // Order rows by their best month score.
  const order = getHotspots().map((h) => ({ h, best: Math.max(...byMonth.map((mm) => mm[h.id].score)) }))
    .sort((a, b) => b.best - a.best);

  for (const { h } of order) {
    const tr = el('tr', {}, [el('th.rowhead', { onclick: () => nav.go(`#/hotspot/${h.id}`) }, h.name)]);
    MONTHS.forEach((_, m) => {
      const r = byMonth[m][h.id];
      const cell = el('td.cell', {
        class: m === state.monthIdx ? 'col-active' : '',
        style: `--s:${r.score}`,
        title: `${h.name} · ${MONTHS[m]} · score ${r.score} · ${r.trust.label}`,
        onclick: () => { nav.setMonth(m); nav.go(`#/hotspot/${h.id}`); },
      }, String(r.score));
      tr.append(cell);
    });
    table.append(tr);
  }
  root.append(el('div.matrix-wrap', {}, table));
  root.append(el('p.legend', {}, 'Darker = higher photographer score that month. Score is normalized within each month column.'));
}

// =============================================================================
// HOTSPOT DETAIL — full species × month matrix for one hotspot (§4)
// =============================================================================
export function renderHotspotDetail(root, state, nav, hotspotId) {
  clear(root);
  const h = getHotspots().find((x) => x.id === hotspotId);
  if (!h) { root.append(el('p.empty', {}, 'Unknown hotspot.')); return; }

  const ranked = rankHotspots(getHotspots(), state.monthIdx).find((r) => r.hotspot.id === h.id);

  root.append(el('header.bar', {}, [
    el('button.back', { onclick: () => nav.go('#/') }, '‹ Back'),
    el('div.title-row', {}, [el('h1', {}, h.name),
      el('span.subtitle', {}, `${MONTHS[state.monthIdx]} score ${ranked.score} · `), trustBadge(ranked.trust), nBadge(ranked.n)]),
    monthSelector(state, (i) => nav.setMonth(i)),
  ]));

  root.append(el('div.access-box', {}, [el('strong', {}, 'Access: '), h.access,
    el('div', {}, el('a.btn', { href: hotspotMapLink(h), target: '_blank', rel: 'noopener' }, '🗺 Open in Maps'))]));

  // Species table: name · photoability · this-month freq · sparkline · shoot subscore.
  const rows = SPECIES.map((s) => {
    const series = frequencySeries(s, h);
    const fNow = series[state.monthIdx];
    return { s, series, fNow, shoot: fNow.value * s.photoability };
  }).filter((r) => r.series.some((f) => f.value > 0.01))
    .sort((a, b) => b.shoot - a.shoot);

  const table = el('table.species-table');
  table.append(el('tr', {}, ['Species', 'Photoability', `${MONTHS[state.monthIdx]} freq`, '12-mo', 'Shoot-it'].map((t) => el('th', {}, t))));
  for (const r of rows) {
    const inferredNow = r.fNow.inferred;
    table.append(el('tr', {}, [
      el('td', {}, [speciesLink('', r.s, state, nav), inferredNow ? el('span.star', { title: r.fNow.rule }, ' *') : null]),
      el('td', {}, photoabilityCell(r.s)),
      el('td', { title: r.fNow.rule }, pct(r.fNow.value)),
      el('td', {}, sparkline(r.series, { inferred: inferredNow })),
      el('td', {}, scorePill(r.shoot)),
    ]));
  }
  root.append(el('div.table-wrap', {}, table));
  root.append(el('p.legend', {}, '* = inferred from the habitat/season model (hover for the rule). Shoot-it = frequency × photoability.'));
}

function photoabilityCell(s) {
  return el('span.photoability', { title: s.note, style: `--p:${Math.round(s.photoability * 100)}` }, [
    el('i'), el('span.pa-num', {}, s.photoability.toFixed(2)),
  ]);
}

function scorePill(x) {
  const v = Math.round(x * 100);
  return el('span.pill', { style: `--v:${v}` }, String(v));
}

// =============================================================================
// SPECIES SEARCH — where + when to photograph a species (§5)
// =============================================================================
export function renderSpecies(root, state, nav) {
  clear(root);
  root.append(el('header.bar', {}, [
    el('h1', {}, 'Find a species'),
    el('span.subtitle', {}, 'Where in the box, and which month, to photograph one bird.'),
  ]));

  const input = el('input.search', { type: 'search', placeholder: 'Search a species (e.g. Wood Duck)…', value: state.speciesQuery || '' });
  const results = el('div.species-results');
  const list = el('datalist', { id: 'splist' }, SPECIES.map((s) => el('option', { value: s.name })));
  input.setAttribute('list', 'splist');

  function run() {
    state.speciesQuery = input.value;
    clear(results);
    const q = input.value.trim().toLowerCase();
    const s = SPECIES.find((x) => x.name.toLowerCase() === q) || SPECIES.find((x) => x.name.toLowerCase().includes(q) && q.length >= 2);
    if (!s) { results.append(el('p.dim', {}, q ? 'No match in the curated list.' : 'Type a species name.')); return; }
    results.append(speciesPanel(s, state, nav));
  }
  input.addEventListener('input', run);
  root.append(el('div.search-wrap', {}, [input, list]));
  root.append(results);
  run();
}

function speciesPanel(s, state, nav) {
  const panel = el('div.sp-panel');
  panel.append(el('div.sp-head', {}, [
    el('h2', {}, s.name),
    el('span.badge', { style: `--c:${s.photoability >= 0.7 ? '#2e7d32' : s.photoability >= 0.5 ? '#1565c0' : '#9e9e9e'}` }, `photoability ${s.photoability.toFixed(2)}`),
    el('span.chip', {}, STATUS_LABEL[s.status] || s.status),
    ebirdLink(s),
  ]));
  panel.append(el('p.sp-note', {}, s.note));

  const ranked = bestForSpecies(s, getHotspots());
  const best = ranked[0];
  if (best && best.best.shootScore > 0) {
    panel.append(el('p.sp-best', {}, [
      'Best bet: ', el('strong', {}, best.hotspot.name), ' in ', el('strong', {}, MONTHS[best.best.monthIdx]),
      ` (${pct(best.best.value)} freq${best.best.inferred ? '*' : ''}).`,
    ]));
  }

  // Per-hotspot best month table.
  const table = el('table.species-table');
  table.append(el('tr', {}, ['Hotspot', 'Best month', 'Freq', '12-mo'].map((t) => el('th', {}, t))));
  for (const r of ranked) {
    if (r.best.shootScore <= 0.001) continue;
    table.append(el('tr', { onclick: () => { state.monthIdx = r.best.monthIdx; nav.go(`#/hotspot/${r.hotspot.id}`); } }, [
      el('td', {}, r.hotspot.name),
      el('td', {}, MONTHS[r.best.monthIdx]),
      el('td', { title: r.best.rule }, pct(r.best.value) + (r.best.inferred ? '*' : '')),
      el('td', {}, sparkline(r.months, { inferred: r.best.inferred })),
    ]));
  }
  panel.append(el('div.table-wrap', {}, table));

  // Live "nearest recent" via the overlay (graceful). Debounced: the panel is
  // rebuilt on every keystroke, so wait a beat and only fetch if this panel is
  // still the one on screen — otherwise typing a name fires a call per letter.
  const liveLine = el('p.sp-live.dim', {}, 'Checking live eBird sightings…');
  panel.append(liveLine);
  setTimeout(() => {
    if (!liveLine.isConnected) return; // superseded by a newer render
    nearestForSpecies(s.code).then((obs) => {
      if (!obs || !obs.length) { liveLine.textContent = 'No live eBird sighting nearby (or overlay disabled).'; return; }
      const o = obs[0];
      liveLine.classList.remove('dim');
      clear(liveLine);
      liveLine.append('Live: last reported at ', el('strong', {}, o.locName || o.subId || 'a nearby spot'),
        o.obsDt ? ` (${daysAgo(o.obsDt)}d ago)` : '', '.');
    });
  }, 300);

  panel.append(el('p.legend', {}, '* inferred from the habitat/season model. Live row uses the eBird recent-obs API.'));
  return panel;
}

// =============================================================================
// SETTINGS — editable box + eBird overlay config (§1, §6)
// =============================================================================
export function renderSettings(root, state, nav) {
  clear(root);
  root.append(el('header.bar', {}, [el('button.back', { onclick: () => nav.go('#/') }, '‹ Back'), el('h1', {}, 'Settings')]));

  const e = ebirdSettings();
  const form = el('div.settings');

  // --- Regions (v14) --------------------------------------------------------
  const saved = savedRegions();
  const activeId = activeRegion().id;
  const regionRows = regions().map((r) => {
    const isSaved = saved.some((s) => s.id === r.id);
    const nCounty = r.counties.length;
    return el('div.region-row', {}, [
      el('div.region-row-main', {}, [
        el('strong', {}, r.name),
        r.id === activeId ? el('span.chip', {}, 'active') : null,
        el('span.dim', {}, ` ${nCounty} count${nCounty === 1 ? 'y' : 'ies'}`),
      ]),
      isSaved
        ? el('button.btn.ghost.small', { onclick: () => nav.go(`#/regions/${encodeURIComponent(r.id)}`) }, 'Edit')
        : el('span.dim.small', {}, 'built-in'),
    ]);
  });
  form.append(section('Regions', [
    el('p.dim', {}, 'Switch regions from the pills at the top. Built-in regions can’t be changed; your own saved regions (up to 3) can be edited or deleted here.'),
    el('div.region-rows', {}, regionRows),
    canAddRegion()
      ? el('button.btn.primary', { onclick: () => nav.go('#/regions') }, '+ New region from map')
      : el('p.dim', {}, 'You’ve saved the maximum of 3 regions — edit or delete one to add another.'),
  ]));

  form.append(section('The box (§1)', [
    el('p.dim', {}, 'The geographic rectangle the planner covers.'),
    grid([
      field('SW lat', BOX.swLat), field('SW lng', BOX.swLng),
      field('NE lat', BOX.neLat), field('NE lng', BOX.neLng),
    ]),
    el('p.dim', {}, 'Editing the box live is a v1 item; it currently re-seeds the hotspot pull in the build script.'),
  ]));

  form.append(section('Live eBird overlay (§2C)', [
    el('label.row', {}, [el('span', {}, 'Enabled'), checkbox(e.enabled, (v) => saveEbirdSettings({ enabled: v }))]),
    el('label.row', {}, [el('span', {}, 'Proxy base URL'),
      el('input', { value: e.proxyBase, placeholder: '/api/ebird', onchange: (ev) => saveEbirdSettings({ proxyBase: ev.target.value }) })]),
    el('p.dim', {}, 'The overlay calls a same-origin proxy that injects your eBird key. Never ship the key in the client bundle (§6). A sample Cloudflare Pages Function is in scripts/ebird-proxy/.'),
    el('button.btn', { onclick: async (ev) => { ev.target.textContent = 'Probing…'; const ok = await probe(); ev.target.textContent = ok ? '✓ Overlay reachable' : '✗ Not reachable (app still works offline)'; } }, 'Test overlay'),
  ]));

  const meta = regionMeta();
  form.append(section('Static reference data (§2A)', [
    el('p', {}, meta.loaded
      ? `Active region: ${meta.region} — ${meta.hotspots} hotspots across ${meta.counties} county file(s), eBird histogram data built ${meta.builtAt || '(date n/a)'}. ${meta.taxonomy} species have resolved eBird codes.`
      : 'No region data loaded — running on the inference model.'),
    el('p.dim', {}, 'Refresh data with the “Refresh eBird data” GitHub Action (see HANDOFF.md) — it rebuilds the per-county files and resolves species codes from the live eBird taxonomy.'),
  ]));

  root.append(form);
}

function section(title, kids) { return el('section.card.setting', {}, [el('h2', {}, title), ...kids]); }
function grid(kids) { return el('div.kv-grid', {}, kids); }
function field(label, value) { return el('label.kv', {}, [el('span', {}, label), el('input', { value, disabled: true })]); }
function checkbox(checked, onchange) { const c = el('input', { type: 'checkbox' }); c.checked = checked; c.addEventListener('change', () => onchange(c.checked)); return c; }
