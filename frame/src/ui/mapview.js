// =============================================================================
// HOTSPOT MAP (v17) — every hotspot in the active region, pinned on the county
// map. Pin brightness follows this month's photographer score; tap a pin to
// open that hotspot's page. Uses the same county shapes + pan/zoom as the
// picker, opening zoomed to the active region's counties. If the device has
// already granted location permission (e.g. for auto-switch), a "you are here"
// dot is drawn too — asking for permission stays a Settings decision.
// =============================================================================
import { el, clear } from './dom.js';
import { MAP_AREAS, areaOfRegion } from '../data/map-areas.js';
import { COUNTIES } from '../data/counties.js';
import { attachPanZoom } from './panzoom.js';
import { appendBasemap, appendCountyLabels, appendLandmarkLabels } from './basemap.js';
import { latLngToMap, countiesBBox } from '../model/geo.js';
import { getHotspots, activeRegion } from '../model/regions.js';
import { rankHotspots, hotTierCount } from '../model/scoring.js';
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

  // No hotspot data (not downloaded yet / empty region): explain it honestly —
  // but STILL DRAW THE BASE MAP below. The geography (counties, lakes, rivers,
  // park boundaries) is app code and always available offline; only the pins
  // need data. A text wall where a place should be reads as broken (Noah,
  // v38 staging: "why is there no empty base map already there?").
  const empty = !hotspots.length;
  if (empty) root.append(regionDeadEnd(nav, 'Nothing to map for this region'));
  // Same empty-working-set guard the Cards and Planner use — never render a map
  // of silent-zero pins when a list/facet mode leaves nothing to count. (Here a
  // bare map WOULD mislead — the data exists, the active mode filtered it out.)
  const modeNote = empty ? null : emptyModeNote(spec);
  if (modeNote) { root.append(modeNote); return; }

  // Which map canvas this region draws on (california | yellowstone) — its own
  // viewBox, projection and county shapes. See data/map-areas.js.
  const area = areaOfRegion(region);
  const A = MAP_AREAS[area];
  const { w: W, h: H } = A.viewBox;
  const wrap = el('div.map-wrap.map-tall');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'county-map hotspot-map');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  // The pins are a pointer surface (759 tab stops would be keyboard hell);
  // the Planner holds the same spots as a keyboard-accessible table, and the
  // map says so to assistive tech (/ACCESSIBILITY.md A7).
  svg.setAttribute('aria-label',
    `Map of ${region.name} hotspots — pins need a pointer; the Planner tab lists the same spots as a keyboard-accessible table.`);

  // County fills: the far counties dim, the active region's counties tinted.
  const inRegion = new Set(region.counties);
  for (const code of Object.keys(A.shapes)) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', A.shapes[code]);
    path.setAttribute('class', 'county' + (inRegion.has(code) ? ' region' : ' far'));
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = COUNTIES[code]?.name || code;
    path.append(title);
    svg.append(path);
  }

  // Orientation landmarks (rivers, roads, lakes, parks) — the generated layers
  // are per-area; California's ship since v20, Yellowstone's since v38.
  appendBasemap(svg, 'bm-hotspot', area);

  // Re-stroke the region's counties ON TOP of the basemap so their outline is
  // always complete (neighbours drawn later can't paint over it) and the region
  // reads as a distinct, fully-outlined block above the landmarks.
  for (const code of region.counties) {
    const o = document.createElementNS(SVG_NS, 'path');
    o.setAttribute('d', A.shapes[code]);
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
  // dense clusters into a solid mass on iPad — Noah's screenshot). Smaller still
  // for a dense county (Humboldt's 597 spots) so clusters read as a stipple.
  const r = Math.max(1.6, home.w * 0.006);
  const pinNames = document.createElementNS(SVG_NS, 'g');
  pinNames.setAttribute('class', 'pin-names');
  pinNames.setAttribute('aria-hidden', 'true');
  const nmById = {}; // id → {el, x, y, name}, gathered for the declutter pass
  for (const h of hotspots) {
    const [x, y] = latLngToMap(h.lat, h.lng, area);
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
    nmById[h.id] = { el: nm, x, y, name: h.name };
  }
  // Labels in RANK order (best spots first) so the declutter pass names the
  // spots worth photographing before the long tail.
  const labelItems = ranked.map((rk) => nmById[rk.hotspot.id]).filter(Boolean);

  // Re-append the hot pins so they draw ON TOP of the ordinary dots — in a
  // dense cluster the standout spot must never be buried under its neighbours.
  svg.querySelectorAll('.pin.hot').forEach((p) => svg.append(p));

  // Landmark names (roads, rivers, lakes, parks), then hotspot names, then
  // county names — all pointer-transparent, all size-capped by --zf.
  appendLandmarkLabels(svg, area);
  svg.append(pinNames);
  appendCountyLabels(svg, Object.keys(A.shapes));

  wrap.append(svg);

  // LABEL DECLUTTER — the fix for "cannot read the screen for words" on a dense
  // county. Every dot has a name in the DOM (hidden by default), but painting
  // all 597 at once is unreadable AND slow. So on each settle we reveal only a
  // NON-OVERLAPPING subset: walk the pins best-first, and show a label only if
  // it's in view and its box clears every label already shown, up to a cap.
  // Zoomed out, no labels; zoom in and more of the tail earns a name as the
  // crowd thins. Cheap: it runs debounced on settle, over stored coordinates.
  const LABEL_MAX = 36, CHAR_W = 0.56, LINE_H = 1.25, LABEL_ON = homeZoom * 2.4;
  function relabel() {
    const vb = svg.viewBox.baseVal;
    if (!vb || !vb.width) return;
    const zf = W / vb.width;
    const fk = parseFloat(svg.style.getPropertyValue('--fk')) || 1;
    const fs = 4.5 * fk; // on-screen-capped label size, in user units
    if (zf < LABEL_ON) { for (const it of labelItems) it.el.classList.remove('lbl-show'); return; }
    const vx1 = vb.x, vy1 = vb.y, vx2 = vb.x + vb.width, vy2 = vb.y + vb.height;
    const placed = [];
    let shown = 0;
    for (const it of labelItems) {
      let show = false;
      if (shown < LABEL_MAX && it.x >= vx1 && it.x <= vx2 && it.y >= vy1 && it.y <= vy2) {
        const w = Math.max(6, it.name.length * fs * CHAR_W), h = fs * LINE_H;
        const lx1 = it.x - w / 2, lx2 = it.x + w / 2;
        const ly1 = it.y + fs * 1.7 - h / 2, ly2 = ly1 + h;
        let clash = false;
        for (const p of placed) { if (!(lx2 < p.x1 || lx1 > p.x2 || ly2 < p.y1 || ly1 > p.y2)) { clash = true; break; } }
        if (!clash) { show = true; placed.push({ x1: lx1, y1: ly1, x2: lx2, y2: ly2 }); shown++; }
      }
      it.el.classList.toggle('lbl-show', show);
    }
  }
  let relabelT = 0;

  const pz = attachPanZoom(wrap, svg, {
    W, H, home, maxZoom: 256, // deep enough that Ice House alone fills the screen

    onZoom: (z) => {
      svg.classList.toggle('map-deep', z >= 48); // one-lake scale: declutter
      // Recompute the visible label set after the gesture settles (fires on pan
      // and zoom); debounced so it never runs mid-frame.
      clearTimeout(relabelT);
      relabelT = setTimeout(relabel, 110);
    },
    onTap: (e) => {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-id]');
      if (hit) nav.go(`#/hotspot/${encodeURIComponent(hit.dataset.id)}`);
    },
  });
  wrap.append(pz.controls());
  root.append(wrap);
  relabelT = setTimeout(relabel, 160); // initial pass once the viewBox is set

  // Honest label: this is PAST-SEASONS frequency, not live activity — these
  // spots aren't "hot right now", they've historically reported the most in
  // this month. Say exactly that. The ⓘ jumps to the PLANNER in reports mode —
  // the site × month table already exists there; the report counts (the numbers
  // behind the dots) live in it rather than in a duplicate popup.
  // (With no data there are no pins — the dead-end above explains, no legend.)
  if (!empty) root.append(el('div.legend-row', {}, [
    el('p.legend', {}, spec.weigh
      ? `Orange pins mark the spots that have historically reported the most shootable birds in ${MONTHS[state.monthIdx]} (past seasons’ Σ frequency × photo weight, discounted for thin coverage — not live sightings). Tap a pin to open it; pinch to zoom, pan with two fingers (one finger scrolls the page) or drag with a mouse.`
      : `Orange pins mark the spots that have historically reported the most birds in ${MONTHS[state.monthIdx]} (past seasons’ Σ frequency, discounted for thin coverage — not live sightings). Tap a pin to open it; pinch to zoom, pan with two fingers (one finger scrolls the page) or drag with a mouse.`),
    el('button.stats-info', {
      'aria-label': 'See the numbers behind the dots — report counts per site, per month, in the Planner',
      title: 'The numbers behind the dots (opens the Planner)',
      onclick: () => { state.plannerNumbers = 'reports'; nav.go('#/matrix'); },
    }, 'ⓘ'),
  ]));

  // "You are here" — only if permission was ALREADY granted (never prompts).
  navigator.permissions?.query({ name: 'geolocation' }).then((st) => {
    if (st.state !== 'granted' || !svg.isConnected) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      if (!svg.isConnected) return;
      const [x, y] = latLngToMap(pos.coords.latitude, pos.coords.longitude, area);
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
