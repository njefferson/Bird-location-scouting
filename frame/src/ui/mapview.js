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
import { basemapShell, basemapItems, appendCountyLabels, appendLandmarkLabels } from './basemap.js';
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
  // Cap the size to the canvas, but DON'T clamp x/y into [0,W] any more: coastal
  // regions frame pelagic pins that sit west of the canvas (negative x), and the
  // pan clamp now works off the pin bounds, so the opening view may start there.
  if (w > W) { w = W; h = w * aspect; }
  if (h > H) { h = H; w = h / aspect; }
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
  // (Always mounted — 63 simple polygons is the cheap, stable ground layer.)
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

  // Orientation landmarks (rivers, roads, lakes, parks) — VIRTUALISED: the group
  // is mounted here for z-order, but its pieces live in a data list and only the
  // ones inside the current view are ever in the DOM (see startSwap() below). Zoomed
  // out, the view holds the whole county so everything mounts — same picture as
  // before; zoomed in, the DOM holds just the local geometry.
  const bmGroup = basemapShell(svg, 'bm-hotspot', area);
  const bmItems = basemapItems(area).map((it) => ({ ...it, el: null, on: false }));

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
  // Project every pin up front and take their bounding box. Coastal counties
  // have PELAGIC hotspots (e.g. Humboldt's "Offshore", "Eel River Canyon") that
  // sit WEST of the county's land — off the built-in map canvas entirely (negative
  // x). The view and the pan limits must be framed around the PINS, not just the
  // county polygon, or those spots can never be scrolled to (they hid behind the
  // old [0,W] pan clamp) and the coast can't be centred. — Noah's screenshots.
  const pos = hotspots.map((h) => { const [x, y] = latLngToMap(h.lat, h.lng, area); return { h, x, y }; });
  const cb = countiesBBox(region.counties) || { x: 0, y: 0, w: W, h: H };
  let cx1 = cb.x, cy1 = cb.y, cx2 = cb.x + cb.w, cy2 = cb.y + cb.h;
  for (const p of pos) { if (p.x < cx1) cx1 = p.x; if (p.y < cy1) cy1 = p.y; if (p.x > cx2) cx2 = p.x; if (p.y > cy2) cy2 = p.y; }
  const content = { x: cx1, y: cy1, w: cx2 - cx1, h: cy2 - cy1 };
  const bounds = { x1: cx1, y1: cy1, x2: cx2, y2: cy2 }; // pan limits (centre stays in here)
  const home = homeBox(content, W, H);
  const homeZoom = W / home.w;
  svg.style.setProperty('--pcap', homeZoom.toFixed(3));
  // Sized so the opening county view reads as dots, not blobs (0.012 merged
  // dense clusters into a solid mass on iPad — Noah's screenshot). Smaller still
  // for a dense county (Humboldt's 597 spots) so clusters read as a stipple.
  const r = Math.max(1.6, home.w * 0.006);

  // PINS + NAMES are VIRTUALISED too: plain data records here; startSwap() below
  // mounts only the ones inside the current view and removes them as they leave.
  // Two pin groups so the hot tier always draws ON TOP of ordinary dots in a
  // dense cluster; both sit under the label layers (original z-order).
  const gPins = document.createElementNS(SVG_NS, 'g');
  const gPinsHot = document.createElementNS(SVG_NS, 'g');
  svg.append(gPins, gPinsHot);
  const nmById = {};
  const pinItems = pos.map(({ h, x, y }) => {
    const it = {
      x, y, hot: hotIds.has(h.id), id: h.id, name: h.name,
      title: `${h.name} · ${MONTHS[state.monthIdx]} · ${divById[h.id] ?? 0} species likely`,
      el: null, on: false,
    };
    nmById[h.id] = { x, y, name: h.name, el: null, on: false };
    return it;
  });
  function makePin(it) {
    const pin = document.createElementNS(SVG_NS, 'circle');
    pin.setAttribute('cx', it.x.toFixed(1));
    pin.setAttribute('cy', it.y.toFixed(1));
    pin.setAttribute('r', r.toFixed(1));
    pin.setAttribute('class', it.hot ? 'pin hot' : 'pin');
    pin.style.setProperty('--pr', r.toFixed(1));
    pin.dataset.id = it.id;
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = it.title;
    pin.append(title);
    return pin;
  }
  // Labels in RANK order (best spots first) so the declutter pass names the
  // spots worth photographing before the long tail.
  const labelItems = ranked.map((rk) => nmById[rk.hotspot.id]).filter(Boolean);
  function makeLabel(it) {
    const nm = document.createElementNS(SVG_NS, 'text');
    nm.setAttribute('x', it.x.toFixed(1));
    nm.setAttribute('y', it.y.toFixed(1));
    nm.setAttribute('dy', '1.7em');
    nm.setAttribute('class', 'pin-name lbl-show');
    nm.setAttribute('font-size', '4.5');
    nm.style.setProperty('--fs', '4.5');
    nm.textContent = it.name;
    return nm;
  }

  // Landmark names (roads, rivers, lakes, parks), then hotspot names, then
  // county names — all pointer-transparent, all size-capped by --zf.
  // VIRTUALISED like everything else: build once, detach every child into a
  // data list, and let the swap mount only the ones near the window. Text is the
  // most expensive thing Safari paints — none of it may sit in the DOM unseen.
  function anchorBox(node) {
    if (node.tagName === 'g') { // road shield: rect carries the geometry
      const rc = node.querySelector('rect');
      if (rc) { const x = +rc.getAttribute('x'), y = +rc.getAttribute('y'); return [x - 2, y - 2, x + +rc.getAttribute('width') + 2, y + +rc.getAttribute('height') + 2]; }
    }
    const x = +(node.getAttribute('x') ?? node.getAttribute('cx') ?? 0);
    const y = +(node.getAttribute('y') ?? node.getAttribute('cy') ?? 0);
    const hw = (node.textContent?.length || 2) * 2.4 + 6; // generous text half-width
    return [x - hw, y - 10, x + hw, y + 10];
  }
  function virtualizeGroup(group) {
    const items = [];
    for (const node of [...group.children]) { items.push({ el: node, bb: anchorBox(node), on: false }); node.remove(); }
    return { group, items };
  }
  const lmVirt = virtualizeGroup(appendLandmarkLabels(svg, area));
  const pinNames = document.createElementNS(SVG_NS, 'g');
  pinNames.setAttribute('class', 'pin-names');
  pinNames.setAttribute('aria-hidden', 'true');
  svg.append(pinNames);
  const ctyVirt = virtualizeGroup(appendCountyLabels(svg, Object.keys(A.shapes)));

  wrap.append(svg);

  // VIRTUALISATION — the map's core loading rule (Noah's): the DOM only ever
  // holds what's inside the window. When the box stops, startSwap() walks the data lists
  // and MOUNTS the basemap pieces and pins whose boxes intersect the view (with
  // a margin so a small pan doesn't hit blank edge), and REMOVES the ones that
  // left. Zoom out and the detail releases; zoom in somewhere else and that
  // area's geometry mounts. Nothing region-wide is ever built up front except
  // the plain data arrays. Labels ride the same pass: only the non-overlapping,
  // best-first subset in view exists at all (cap LABEL_MAX).
  const LABEL_MAX = 36, CHAR_W = 0.56, LINE_H = 1.25, LABEL_ON = homeZoom * 2.4;
  function relabel(vb, zf) {
    const fk = parseFloat(svg.style.getPropertyValue('--fk')) || 1;
    const fs = 4.5 * fk; // on-screen-capped label size, in user units
    const placed = [];
    let shown = 0;
    for (const it of labelItems) {
      let show = false;
      if (zf >= LABEL_ON && shown < LABEL_MAX &&
          it.x >= vb.x && it.x <= vb.x + vb.width && it.y >= vb.y && it.y <= vb.y + vb.height) {
        const w = Math.max(6, it.name.length * fs * CHAR_W), h = fs * LINE_H;
        const lx1 = it.x - w / 2, lx2 = it.x + w / 2;
        const ly1 = it.y + fs * 1.7 - h / 2, ly2 = ly1 + h;
        let clash = false;
        for (const p of placed) { if (!(lx2 < p.x1 || lx1 > p.x2 || ly2 < p.y1 || ly1 > p.y2)) { clash = true; break; } }
        if (!clash) { show = true; placed.push({ x1: lx1, y1: ly1, x2: lx2, y2: ly2 }); shown++; }
      }
      if (show && !it.on) { if (!it.el) it.el = makeLabel(it); pinNames.append(it.el); it.on = true; }
      else if (!show && it.on) { it.el.remove(); it.on = false; }
    }
  }
  // THE SWAP, run ONLY when the box has stopped (Noah's rule — nothing happens
  // while the box moves): release everything that isn't in the box, mount what
  // is, then place the labels for that height. Two properties matter as much as
  // when it runs:
  //  • it is SLICED — the decisions are made up front in plain JS (cheap), and
  //    the DOM work is applied in ~5ms slices across frames, releases first, so
  //    no single frame ever swallows a hundreds-of-nodes burst ("the load");
  //  • it is ABANDONABLE — the moment the box moves again, the in-flight queue
  //    is dropped at the next slice boundary and freed. A gesture never waits
  //    on loading; the next stop starts a fresh swap from whatever is mounted.
  let syncT = 0, swapGen = 0, swapRaf = 0;
  function startSwap() {
    const gen = ++swapGen;
    const vb = svg.viewBox.baseVal;
    if (!vb || !vb.width) return;
    const zf = W / vb.width;
    const mx = vb.width * 0.35, my = vb.height * 0.35; // pan headroom
    const x1 = vb.x - mx, y1 = vb.y - my, x2 = vb.x + vb.width + mx, y2 = vb.y + vb.height + my;
    const inBox = (b) => !!b && !(b[2] < x1 || b[0] > x2 || b[3] < y1 || b[1] > y2);
    const mountBm = (it) => { if (!it.el) { it.el = document.createElementNS(SVG_NS, 'path'); it.el.setAttribute('d', it.d); it.el.setAttribute('class', it.cls); } bmGroup.append(it.el); };
    const mountPin = (it) => { if (!it.el) it.el = makePin(it); (it.hot ? gPinsHot : gPins).append(it.el); };
    // Decide everything now; queue only the DOM operations.
    const toRemove = [], toMount = [];
    for (const it of bmItems) { const on = inBox(it.bb); if (on !== it.on) (on ? toMount : toRemove).push([it, mountBm]); }
    for (const it of pinItems) {
      const on = it.x >= x1 - r && it.x <= x2 + r && it.y >= y1 - r && it.y <= y2 + r;
      if (on !== it.on) (on ? toMount : toRemove).push([it, mountPin]);
    }
    for (const v of [lmVirt, ctyVirt]) {
      for (const it of v.items) { const on = inBox(it.bb); if (on !== it.on) (on ? toMount : toRemove).push([it, (i) => v.group.append(i.el)]); }
    }
    let ri = 0, mi = 0;
    const step = () => {
      swapRaf = 0;
      if (gen !== swapGen) return; // box moved — abandon; the queue dies here
      const t0 = performance.now();
      while (ri < toRemove.length && performance.now() - t0 < 5) { const it = toRemove[ri++][0]; it.el.remove(); it.on = false; }
      while (ri >= toRemove.length && mi < toMount.length && performance.now() - t0 < 5) { const [it, mount] = toMount[mi++]; mount(it); it.on = true; }
      if (ri < toRemove.length || mi < toMount.length) { swapRaf = requestAnimationFrame(step); return; }
      relabel(vb, zf); // final slice: the ≤36 labels for this height
    };
    step();
  }

  const pz = attachPanZoom(wrap, svg, {
    W, H, home, bounds, maxZoom: 256, // deep enough that Ice House alone fills the screen
    // This map manages its own DOM (mount/unmount by view) — the generic
    // visibility cull would fight it and cache detached nodes.
    viewCull: false,
    onZoom: () => {
      // NOTHING happens while the box moves — any in-flight swap is abandoned
      // and freed IMMEDIATELY, and the one settle swap is pushed back.
      swapGen++;
      if (swapRaf) { cancelAnimationFrame(swapRaf); swapRaf = 0; }
      clearTimeout(syncT);
      syncT = setTimeout(startSwap, 90);
    },
    onTap: (e) => {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-id]');
      if (hit) nav.go(`#/hotspot/${encodeURIComponent(hit.dataset.id)}`);
    },
  });
  wrap.append(pz.controls());
  root.append(wrap);
  syncT = setTimeout(startSwap, 0); // initial mount for the opening view

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
