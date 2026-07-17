// =============================================================================
// HOTSPOT MAP (v17) — every hotspot in the active region, pinned on the county
// map. Pin brightness follows this month's photographer score; tap a pin to
// open that hotspot's page. Uses the same county shapes + pan/zoom as the
// picker, opening zoomed to the active region's counties. If the device has
// already granted location permission (e.g. for auto-switch), a "you are here"
// dot is drawn too — asking for permission stays a Settings decision.
// =============================================================================
import { el, clear } from './dom.js';
import { COUNTY_SHAPES, MAP_VIEWBOX } from '../data/county-shapes.js';
import { COUNTIES } from '../data/counties.js';
import { attachPanZoom } from './panzoom.js';
import { appendBasemap, appendCountyLabels, appendLandmarkLabels } from './basemap.js';
import { latLngToMap, countiesBBox } from '../model/geo.js';
import { getHotspots, activeRegion, regionMeta } from '../model/regions.js';
import { rankHotspots, hotTierCount, checklistN } from '../model/scoring.js';
import { rankingSpec } from '../model/lists.js';
import { MONTHS } from '../model/inference.js';
import { monthSelector, regionDeadEnd, emptyModeNote } from './views.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Expand a bbox by pad% and normalize it to the map's aspect ratio, so the
// initial viewBox doesn't jump on the first zoom (panzoom keeps W:H aspect).
function homeBox(bbox, W, H, pad = 0.12) {
  let { x, y, w, h } = bbox;
  x -= w * pad; y -= h * pad; w *= 1 + 2 * pad; h *= 1 + 2 * pad;
  const aspect = H / W;
  if (h / w > aspect) { const nw = h / aspect; x -= (nw - w) / 2; w = nw; }
  else { const nh = w * aspect; y -= (nh - h) / 2; h = nh; }
  // Clamp into the map (panzoom clamps panning to [0, W-vw]).
  w = Math.min(w, W); h = w * aspect;
  x = Math.min(Math.max(x, 0), W - w);
  y = Math.min(Math.max(y, 0), H - h);
  return { x, y, w, h };
}

export function renderMapView(root, state, nav) {
  clear(root);
  const region = activeRegion();
  const hotspots = getHotspots();
  const spec = rankingSpec();

  root.append(el('header.bar', {}, [
    el('div.title-row', {}, [
      el('h1', {}, 'Hotspot map'),
      el('span.subtitle', {}, `${region.name} · orange = historically strongest in ${MONTHS[state.monthIdx]} · tap a pin`),
    ]),
    monthSelector(state, (i) => nav.setMonth(i)),
  ]));

  if (!hotspots.length) {
    root.append(regionDeadEnd(nav, 'Nothing to map for this region'));
    return;
  }
  // Same empty-working-set guard the Cards and Planner use — never render a map
  // of silent-zero pins when a list/facet mode leaves nothing to count.
  const modeNote = emptyModeNote(spec);
  if (modeNote) { root.append(modeNote); return; }

  const { w: W, h: H } = MAP_VIEWBOX;
  const wrap = el('div.map-wrap.map-tall');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'county-map hotspot-map');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // County fills: the far counties dim, the active region's counties tinted.
  const inRegion = new Set(region.counties);
  for (const code of Object.keys(COUNTY_SHAPES)) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', COUNTY_SHAPES[code]);
    path.setAttribute('class', 'county' + (inRegion.has(code) ? ' region' : ' far'));
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = COUNTIES[code]?.name || code;
    path.append(title);
    svg.append(path);
  }

  // Orientation landmarks (rivers, roads, lakes, parks), clipped to the state.
  appendBasemap(svg, 'bm-hotspot');

  // Re-stroke the region's counties ON TOP of the basemap so their outline is
  // always complete (neighbours drawn later can't paint over it) and the region
  // reads as a distinct, fully-outlined block above the landmarks.
  for (const code of region.counties) {
    const o = document.createElementNS(SVG_NS, 'path');
    o.setAttribute('d', COUNTY_SHAPES[code]);
    o.setAttribute('class', 'county-outline region');
    svg.append(o);
  }

  // Pins, sized to the region zoom. No colour scale — two states only: this
  // month's HOT tier (the natural break in the ranking, hotTierCount) wears
  // --score-hot and a slightly larger dot; every other spot is a quiet, uniform
  // dot. `--pr` (base radius) + the map's `--pcap` (the home-view zoom) let CSS
  // hold each pin at a constant on-screen size once you zoom past the opening
  // view — no more donut-sized blobs pinched all the way in.
  const ranked = rankHotspots(hotspots, state.monthIdx, { species: spec.species, weigh: spec.weigh });
  const hotIds = new Set(ranked.slice(0, hotTierCount(ranked)).map((r) => r.hotspot.id));
  const divById = Object.fromEntries(ranked.map((r) => [r.hotspot.id, r.diversity]));
  const bbox = countiesBBox(region.counties) || { x: 0, y: 0, w: W, h: H };
  const home = homeBox(bbox, W, H);
  const homeZoom = W / home.w;
  svg.style.setProperty('--pcap', homeZoom.toFixed(3));
  // Sized so the opening county view reads as dots, not blobs (0.012 merged
  // dense clusters into a solid mass on iPad — Noah's screenshot).
  const r = Math.max(2, home.w * 0.008);
  const pinNames = document.createElementNS(SVG_NS, 'g');
  pinNames.setAttribute('class', 'pin-names');
  pinNames.setAttribute('aria-hidden', 'true');
  for (const h of hotspots) {
    const [x, y] = latLngToMap(h.lat, h.lng);
    const div = divById[h.id] ?? 0;
    const pin = document.createElementNS(SVG_NS, 'circle');
    pin.setAttribute('cx', x.toFixed(1));
    pin.setAttribute('cy', y.toFixed(1));
    pin.setAttribute('r', r.toFixed(1));
    pin.setAttribute('class', hotIds.has(h.id) ? 'pin hot' : 'pin');
    pin.style.setProperty('--pr', r.toFixed(1));
    pin.dataset.id = h.id;
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = `${h.name} · ${MONTHS[state.monthIdx]} · ${div} species likely`;
    pin.append(title);
    svg.append(pin);
    // The pin's NAME — hidden until you zoom in past ~2× the opening view,
    // then every dot says which hotspot it is (the "which point is Ice House?"
    // problem). dy is in em so the gap tracks the capped label size.
    const nm = document.createElementNS(SVG_NS, 'text');
    nm.setAttribute('x', x.toFixed(1));
    nm.setAttribute('y', y.toFixed(1));
    nm.setAttribute('dy', '1.7em');
    nm.setAttribute('class', 'pin-name');
    nm.setAttribute('font-size', '4.5');
    nm.style.setProperty('--fs', '4.5');
    nm.textContent = h.name;
    pinNames.append(nm);
  }

  // Re-append the hot pins so they draw ON TOP of the ordinary dots — in a
  // dense cluster the standout spot must never be buried under its neighbours.
  svg.querySelectorAll('.pin.hot').forEach((p) => svg.append(p));

  // Landmark names (roads, rivers, lakes, parks), then hotspot names, then
  // county names — all pointer-transparent, all size-capped by --zf.
  appendLandmarkLabels(svg);
  svg.append(pinNames);
  appendCountyLabels(svg);

  wrap.append(svg);
  const pz = attachPanZoom(wrap, svg, {
    W, H, home, maxZoom: 256, // deep enough that Ice House alone fills the screen

    // Hotspot names appear once you're zoomed past ~4× the opening view. At 2×
    // most of the region was still in frame, so hundreds of names flooded on at
    // once and papered over the map (Noah's screenshot); by 4× the view holds
    // few enough pins for names to help rather than bury.
    onZoom: (z) => {
      const on = z >= homeZoom * 4;
      if (on !== svg.classList.contains('pin-names-on')) {
        svg.classList.toggle('pin-names-on', on);
        // The names just (dis)appeared — remeasure so the deep-zoom cull covers
        // them instead of painting every label each frame.
        pz.invalidateCull();
      }
      svg.classList.toggle('map-deep', z >= 48); // one-lake scale: declutter
    },
    onTap: (e) => {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-id]');
      if (hit) nav.go(`#/hotspot/${encodeURIComponent(hit.dataset.id)}`);
    },
  });
  wrap.append(pz.controls());
  root.append(wrap);

  // Honest label: this is PAST-SEASONS frequency, not live activity — these
  // spots aren't "hot right now", they've historically reported the most in
  // this month. Say exactly that. The ⓘ opens the numbers behind the dots —
  // per-site, per-month report counts, computed from the LOADED data so every
  // quarterly refresh updates it (never a static label).
  root.append(el('div.legend-row', {}, [
    el('p.legend', {}, spec.weigh
      ? `Orange pins mark the spots that have historically reported the most shootable birds in ${MONTHS[state.monthIdx]} (past seasons’ Σ frequency × photo weight, discounted for thin coverage — not live sightings). Tap a pin to open it; pinch to zoom, pan with two fingers (one finger scrolls the page) or drag with a mouse.`
      : `Orange pins mark the spots that have historically reported the most birds in ${MONTHS[state.monthIdx]} (past seasons’ Σ frequency, discounted for thin coverage — not live sightings). Tap a pin to open it; pinch to zoom, pan with two fingers (one finger scrolls the page) or drag with a mouse.`),
    el('button.stats-info', {
      'aria-label': 'The numbers behind the dots — reports per site, per month',
      title: 'The numbers behind the dots',
      onclick: () => openStatsDialog(state, spec, hotspots),
    }, 'ⓘ'),
  ]));

  // "You are here" — only if permission was ALREADY granted (never prompts).
  navigator.permissions?.query({ name: 'geolocation' }).then((st) => {
    if (st.state !== 'granted' || !svg.isConnected) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      if (!svg.isConnected) return;
      const [x, y] = latLngToMap(pos.coords.latitude, pos.coords.longitude);
      const me = document.createElementNS(SVG_NS, 'circle');
      me.setAttribute('cx', x.toFixed(1));
      me.setAttribute('cy', y.toFixed(1));
      me.setAttribute('r', (r * 0.8).toFixed(1));
      me.style.setProperty('--pr', (r * 0.8).toFixed(1));
      me.setAttribute('class', 'you-dot');
      svg.append(me);
    }, () => {}, { maximumAge: 300000, timeout: 5000 });
  }).catch(() => {});
}

// =============================================================================
// THE NUMBERS BEHIND THE DOTS — a per-site × per-month table of REPORT COUNTS
// (eBird checklists in the loaded data), opened from the ⓘ by the map caption.
// The point (Noah's ask): the dots only show rank WITHIN a month — nothing
// showed that July's top spot rests on 700 reports while January's rests on 11.
// Everything here is computed from the loaded county data at open time, so a
// quarterly refresh updates it automatically; nothing is a static label.
// Orange cells = that month's historically-strongest tier (the orange pins).
// =============================================================================
function openStatsDialog(state, spec, hotspots) {
  const dialog = el('dialog.facet-dialog.stats-dialog');
  const rows = hotspots.map((h) => ({ h, n: MONTHS.map((_, m) => checklistN(h, m)) }));
  const hotByMonth = MONTHS.map((_, m) => {
    const ranked = rankHotspots(hotspots, m, { species: spec.species, weigh: spec.weigh });
    return new Set(ranked.slice(0, hotTierCount(ranked)).map((r) => r.hotspot.id));
  });

  let sortM = state.monthIdx; // which month column sorts the rows; -1 = by name
  let showAll = false;
  const CAP = 80;

  const built = (() => {
    const d = new Date(regionMeta().builtAt || NaN);
    return Number.isNaN(d.getTime()) ? null : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  })();

  function paint() {
    const order = rows.slice().sort((a, b) => (sortM < 0
      ? a.h.name.localeCompare(b.h.name)
      : (b.n[sortM] ?? -1) - (a.n[sortM] ?? -1) || a.h.name.localeCompare(b.h.name)));
    const shown = showAll ? order : order.slice(0, CAP);

    const table = el('table.stats-table');
    table.append(el('thead', {}, el('tr', {}, [
      el('th.st-site' + (sortM < 0 ? '.sorted' : ''), {
        title: 'Sort by name', onclick: () => { sortM = -1; paint(); },
      }, 'Hotspot'),
      ...MONTHS.map((mo, m) => el('th.st-m' + (sortM === m ? '.sorted' : ''), {
        title: `Sort by ${mo} reports`, onclick: () => { sortM = m; paint(); },
      }, mo)),
    ])));
    const body = el('tbody');
    for (const rw of shown) {
      body.append(el('tr', {}, [
        el('th.st-site', {}, rw.h.name),
        ...rw.n.map((n, m) => el('td' + (hotByMonth[m].has(rw.h.id) ? '.st-hot' : ''), {},
          n == null ? '—' : String(n))),
      ]));
    }
    table.append(body);

    dialog.replaceChildren(
      el('button.si-close', { 'aria-label': 'Close', onclick: () => dialog.close() }, '×'),
      el('div.facet-dialog-head', {}, [
        el('h2', {}, 'The numbers behind the dots'),
      ]),
      // RULE: all body content lives inside .facet-sections (it carries the
      // dialog's padding + scroll — see the v26 photo-dialog lesson).
      el('div.facet-sections', {}, [
        el('p.st-note', {}, [
          'Each number is how many reports (eBird checklists) the loaded data holds for that site in that calendar month. It’s the sample behind the dots: months differ hugely — a top spot can rest on 700 reports in one month and 11 in another, and the dots alone can’t show that. ',
          el('strong', {}, 'Orange cells are that month’s historically-strongest tier — the same spots as the orange pins.'),
          ' Tap a month to sort by it. This table is computed from the data itself, so it updates with every data refresh',
          built ? ` (current data built ${built}).` : '.',
        ]),
        el('div.table-wrap.st-wrap', {}, table),
        (!showAll && order.length > CAP) ? el('button.btn.small.st-more', {
          onclick: () => { showAll = true; paint(); },
        }, `Show all ${order.length} sites`) : null,
      ]),
      el('div.facet-dialog-foot', {}, [
        el('button.btn.small', { onclick: () => dialog.close() }, 'Done'),
      ]),
    );
  }
  paint();

  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}
