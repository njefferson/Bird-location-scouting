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
import { basemapShell, basemapItems, appendCountyLabels, appendLandmarkLabels, bboxOfD } from './basemap.js';
import { mapLog, getMapLog } from './maplog.js';
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
  // VIRTUALISED like everything else (they were the last always-mounted giants:
  // 63 full-canvas polygons repainted at map scale were most of what remained
  // of the deep-zoom transitional 1.6-3s frames in Noah's readouts). The group
  // keeps them at the bottom of the z-order; the swap mounts only in-box ones.
  const inRegion = new Set(region.counties);
  const gCounty = document.createElementNS(SVG_NS, 'g');
  svg.append(gCounty);
  const countyItems = Object.keys(A.shapes).map((code) => {
    const p = document.createElementNS(SVG_NS, 'path');
    p.setAttribute('d', A.shapes[code]);
    p.setAttribute('class', 'county' + (inRegion.has(code) ? ' region' : ' far'));
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = COUNTIES[code]?.name || code;
    p.append(title);
    return { el: p, bb: bboxOfD(A.shapes[code]), on: false };
  });

  // Orientation landmarks (rivers, roads, lakes, parks) — VIRTUALISED: the group
  // is mounted here for z-order, but its pieces live in a data list and only the
  // ones inside the current view are ever in the DOM (see startSwap() below). Zoomed
  // out, the view holds the whole county so everything mounts — same picture as
  // before; zoomed in, the DOM holds just the local geometry.
  const bmGroup = basemapShell(svg, 'bm-hotspot', area);
  const bmClip = bmGroup.getAttribute('clip-path');
  let clipOff = false; // current clip state — toggled only on change (see swap vars phase)
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

  // SCALE BAR (Noah's ask) — a real distance scale for users, updated at rest
  // with everything else (never during the gesture). The small ×N zoom factor
  // beside it doubles as debugging aid: a screenshot now says exactly where in
  // the zoom the map was. km-per-map-unit is derived once from the projection
  // at the region's own latitude.
  const kmPerUnit = (() => {
    const ref = hotspots[0] || { lat: 39, lng: -121 };
    const [ax] = latLngToMap(ref.lat, ref.lng, area);
    const [bx] = latLngToMap(ref.lat, ref.lng + 0.2, area);
    const km = 0.2 * 111.32 * Math.cos((ref.lat * Math.PI) / 180);
    return km / Math.abs(bx - ax || 1);
  })();
  const scaleBar = el('span.map-scale-bar');
  const scaleTxt = el('span.map-scale-txt');
  wrap.append(el('div.map-scale', {
    'aria-hidden': 'true', title: 'Map diagnostics',
    onclick: () => dbgSet(dbgBox.hidden), // tap the scale = toggle the data window
  }, [scaleBar, scaleTxt]));
  const NICE_MI = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50, 100, 200];
  function updateScale(vb, zf, ms) {
    const rect = svg.getBoundingClientRect();
    if (!rect.width) return;
    const pxPerUnit = Math.min(rect.width / vb.width, rect.height / vb.height);
    const miPerPx = (kmPerUnit / 1.60934) / pxPerUnit;
    const maxPx = rect.width * 0.3;
    let mi = NICE_MI[0];
    for (const n of NICE_MI) { if (n / miPerPx <= maxPx) mi = n; else break; }
    scaleBar.style.width = `${Math.round(mi / miPerPx)}px`;
    scaleTxt.textContent = `${mi < 1 ? mi : Math.round(mi)} mi`;
    // ×zoom + last update duration, small and dim: any screenshot pins the
    // exact zoom AND how long the last swap took.
    scaleTxt.append(el('span.map-scale-zf', {}, ` ·×${zf >= 10 ? Math.round(zf) : zf.toFixed(1)}${ms != null ? ` ·${(ms / 1000).toFixed(1)}s` : ''}`));
  }

  // PROGRESS READOUT (Noah's ask) — while the map updates at rest, a small
  // overlay shows each data type's live count ("free 120/300 · pins 40/210 ·
  // labels 4/24"), updated once per slice. It's an HTML overlay OUTSIDE the
  // SVG, so updating it never invalidates map rendering. The spinner runs on a
  // compositor-driven CSS animation, which keeps turning even while the main
  // thread is busy — so a screenshot distinguishes "working" (spinner turning,
  // counts advancing), "main thread blocked" (spinner turning, counts stuck —
  // the stuck phase names the culprit), and "renderer stalled" (both frozen).
  const progTxt = el('span.map-progress-txt');
  const prog = el('div.map-progress', { 'aria-hidden': 'true', hidden: true }, [el('span.map-progress-spin'), progTxt]);
  wrap.append(prog);
  let progHideT = 0;
  const progUpdate = (text) => { prog.hidden = false; progTxt.textContent = text; };
  const progDone = (ms) => { progTxt.textContent = `updated ·${(ms / 1000).toFixed(1)}s`; clearTimeout(progHideT); progHideT = setTimeout(() => { prog.hidden = true; }, 1400); };
  const progHide = () => { clearTimeout(progHideT); prog.hidden = true; };

  // HOLD-TO-LOAD line (Noah's design): while the box is quiet but fingers are
  // (or appear) still down, a thin bar fills over ~3s; at full, the swap runs
  // anyway — the affordance for "pause to load without lifting", and the
  // self-heal for iOS's swallowed pointerups (which otherwise gate loading
  // forever). Hidden the moment the box moves or the swap starts.
  const holdFill = el('span.map-hold-fill');
  const holdEl = el('div.map-hold', { 'aria-hidden': 'true', hidden: true }, [holdFill]);
  wrap.append(holdEl);
  const holdShow = (f) => { holdEl.hidden = false; holdFill.style.width = `${Math.min(100, f * 100).toFixed(0)}%`; };
  const holdHide = () => { holdEl.hidden = true; };
  const HOLD_MS = 2700; // + the 280ms settle ≈ Noah's "up to 3 seconds"

  // DEBUG WINDOW (Noah's ask) — tap the scale bar to overlay live map internals
  // to screenshot mid-freeze: zoom + viewBox, mounted/total per data type, a
  // frame-jank meter, a tick counter (its number STOPS when the main thread is
  // blocked — pair with the spinner, which keeps turning on the compositor),
  // and the last few swap events. Persisted (frame.mapDebug); zero cost while
  // off. Diagnostics are second to users: it's invisible unless summoned.
  const DBG_KEY = 'frame.mapDebug';
  const dbgLog = [];
  const dbgT0 = performance.now();
  const dbgEvent = (msg) => {
    dbgLog.push(`${((performance.now() - dbgT0) / 1000).toFixed(1)} ${msg}`);
    if (dbgLog.length > 6) dbgLog.shift();
    mapLog(msg); // every event also lands in the persistent runtime log
  };
  mapLog(`== map open ${region.id} ${hotspots.length} spots ==`);
  const dbgPre = el('pre.map-debug', {});
  // Copy-log lives IN the window too (Noah): right after a repro, one tap here
  // grabs the persistent trace without leaving the map. Tap-only like the rest
  // of the overlay (off tab order); the accessible path stays in Settings.
  const dbgCopy = el('button.map-debug-copy', {
    tabindex: '-1',
    onclick: async () => {
      try { await navigator.clipboard.writeText(getMapLog() || '(log empty)'); dbgCopy.textContent = 'copied ✓'; }
      catch { dbgCopy.textContent = 'copy failed'; }
      setTimeout(() => { dbgCopy.textContent = 'copy log'; }, 1400);
    },
  }, 'copy log');
  const dbgBox = el('div.map-debug-box', { hidden: true, 'aria-hidden': 'true' }, [dbgPre, dbgCopy]);
  wrap.append(dbgBox);
  let dbgTimer = 0, dbgRaf = 0, dbgTick = 0, dbgLast = 0, dbgWorst = 0, dbgWorstAt = 0;
  function dbgFrame(now) {
    dbgTick++;
    const d = dbgLast ? now - dbgLast : 0;
    dbgLast = now;
    if (now - dbgWorstAt > 2000) { dbgWorst = d; dbgWorstAt = now; }
    else if (d > dbgWorst) dbgWorst = d;
    // Any long frame lands in the trace — INCLUDING outside swaps (mid-gesture,
    // at idle), which the swap's own gap events can't see. A swap-time stall
    // shows as gap+jank at the same timestamp; a jank alone means the browser
    // stalled with no swap running — a different suspect entirely.
    if (d > 250) mapLog(`jank ${Math.round(d)}ms`);
    dbgRaf = requestAnimationFrame(dbgFrame);
  }
  // Returning from the background resumes rAF with a huge stale delta — reset
  // so it isn't logged as a phantom jank (the log's own "page hidden" line
  // already marks the real story).
  document.addEventListener('visibilitychange', () => { if (svg.isConnected) dbgLast = 0; });
  const dbgOn = (arr) => arr.reduce((n, it) => n + (it.on ? 1 : 0), 0);
  let dbgLive = false; // becomes true once the svg is actually in the document
  function dbgRender() {
    if (!svg.isConnected) {
      // Before first attach: just wait for the next tick. After having been
      // live: the view was re-rendered away — stop this instance's timers but
      // KEEP the preference so the window survives navigation.
      if (dbgLive) { clearInterval(dbgTimer); cancelAnimationFrame(dbgRaf); dbgTimer = 0; dbgRaf = 0; }
      return;
    }
    dbgLive = true;
    const vb = svg.viewBox.baseVal;
    dbgPre.textContent =
`×${(W / vb.width).toFixed(1)}  vb ${vb.x.toFixed(0)},${vb.y.toFixed(0)} ${vb.width.toFixed(0)}×${vb.height.toFixed(0)}
pins ${dbgOn(pinItems)}/${pinItems.length}  map ${dbgOn(bmItems)}/${bmItems.length}
names ${dbgOn(lmVirt.items) + dbgOn(ctyVirt.items)}/${lmVirt.items.length + ctyVirt.items.length}  labels ${dbgOn(labelItems)}
tick ${dbgTick}  worst frame ${dbgWorst.toFixed(0)}ms/2s
${dbgLog.join('\n')}`;
  }
  function dbgSet(on) {
    dbgBox.hidden = !on;
    clearInterval(dbgTimer); cancelAnimationFrame(dbgRaf); dbgTimer = 0; dbgRaf = 0;
    if (on) { dbgLast = 0; dbgRaf = requestAnimationFrame(dbgFrame); dbgTimer = setInterval(dbgRender, 250); dbgRender(); }
    try { localStorage.setItem(DBG_KEY, on ? '1' : '0'); } catch { /* private mode */ }
  }
  try { if (localStorage.getItem(DBG_KEY) === '1') dbgSet(true); } catch { /* private mode */ }

  // VIRTUALISATION — the map's core loading rule (Noah's): the DOM only ever
  // holds what's inside the window. When the box stops, startSwap() walks the data lists
  // and MOUNTS the basemap pieces and pins whose boxes intersect the view (with
  // a margin so a small pan doesn't hit blank edge), and REMOVES the ones that
  // left. Zoom out and the detail releases; zoom in somewhere else and that
  // area's geometry mounts. Nothing region-wide is ever built up front except
  // the plain data arrays. Labels ride the same pass: only the non-overlapping,
  // best-first subset in view exists at all (cap LABEL_MAX).
  const LABEL_MAX = 36, CHAR_W = 0.56, LINE_H = 1.25, LABEL_ON = homeZoom * 2.4;
  // Decide the label set for this height (pure JS, no DOM): which mounted
  // labels must go, and which new ones to mount — the swap applies them sliced.
  function planLabels(vb, zf) {
    const fk = parseFloat(svg.style.getPropertyValue('--fk')) || 1;
    const fs = 4.5 * fk; // on-screen-capped label size, in user units
    const placed = [], keep = new Set();
    if (zf >= LABEL_ON) {
      let shown = 0;
      for (const it of labelItems) {
        if (shown >= LABEL_MAX) break;
        if (it.x < vb.x || it.x > vb.x + vb.width || it.y < vb.y || it.y > vb.y + vb.height) continue;
        const w = Math.max(6, it.name.length * fs * CHAR_W), h = fs * LINE_H;
        const lx1 = it.x - w / 2, lx2 = it.x + w / 2;
        const ly1 = it.y + fs * 1.7 - h / 2, ly2 = ly1 + h;
        let clash = false;
        for (const p of placed) { if (!(lx2 < p.x1 || lx1 > p.x2 || ly2 < p.y1 || ly1 > p.y2)) { clash = true; break; } }
        if (!clash) { placed.push({ x1: lx1, y1: ly1, x2: lx2, y2: ly2 }); keep.add(it); shown++; }
      }
    }
    return {
      hide: labelItems.filter((it) => it.on && !keep.has(it)),
      show: [...keep].filter((it) => !it.on),
    };
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
  // The swap runs in STRICT PHASES, each in op-capped slices (~40 DOM ops per
  // frame — a JS-time budget lied: .remove()/.append() are cheap to CALL, the
  // style/layout/paint lands after the frame yields, so 5ms of calls could cost
  // Safari 100ms+ of rendering):
  //   1. RELEASES — shrink the tree first.
  //   2. ONE sizing-var write (pz.applyVars) — this is the "text resize". It
  //      restyles every mounted var() consumer, so it runs exactly once per
  //      stop, over the SMALLEST possible set, never racing the mounts.
  //      (It used to fire on its own timer against the big pre-swap set — the
  //      freeze Noah pinned to the moment the text resized.)
  //   3. MOUNTS — batched per slice through DocumentFragments (one insertion
  //      per group per frame), each new node styling once with correct vars.
  //   4. LABELS + the scale readout, last.
  // Abandonable at every slice boundary: any box movement bumps the generation
  // and the queue dies.
  const OPS = 40;
  let syncT = 0, swapGen = 0, swapRaf = 0, swapActive = false, holdStart = 0;
  function startSwap() {
    // "The box has stopped" requires the FINGERS OFF THE GLASS, not just a
    // quiet timer: human pinches pause >90ms between strokes constantly, and
    // timer-only settling fired swap after swap mid-gesture (Noah's debug
    // screenshot: swaps at 7.9/8.0/8.2s + a vars write, all while pinching).
    // While touching, the hold line fills; short of full it just checks back
    // soon (the swap normally runs on release) — but a FULL line (~3s of quiet
    // with fingers down) loads anyway: Noah's pause-to-load, and the escape
    // hatch when iOS never delivered the pointerup.
    if (pz && pz.isGesturing()) {
      if (!holdStart) holdStart = performance.now();
      const held = performance.now() - holdStart;
      if (held < HOLD_MS) {
        holdShow(held / HOLD_MS);
        clearTimeout(syncT); syncT = setTimeout(startSwap, 120); return;
      }
      dbgEvent('hold-load'); // line full — load with fingers down
    }
    holdStart = 0; holdHide();
    const gen = ++swapGen;
    const vb = svg.viewBox.baseVal;
    if (!vb || !vb.width) return;
    const zf = W / vb.width;
    const mx = vb.width * 0.35, my = vb.height * 0.35; // pan headroom
    const x1 = vb.x - mx, y1 = vb.y - my, x2 = vb.x + vb.width + mx, y2 = vb.y + vb.height + my;
    const inBox = (b) => !!b && !(b[2] < x1 || b[0] > x2 || b[3] < y1 || b[1] > y2);
    // Decide everything now; queue only the DOM operations. Mount entries carry
    // their target group so a slice can batch all appends into one fragment.
    // DEEP-ZOOM FREE DEFERRAL (from Noah's iPhone trace): the 3s lockup was a
    // BROWSER stall ("gap 3042ms") right after the first free slice at ×256 —
    // while the same free counts were cheap at ×21/×112 (258 and 304 frees in
    // ~0.27s). Removals hand Safari a rendering bill that scales with zoom
    // depth. So past FREE_HOLD_ZF the swap HOLDS its frees: the items stay
    // mounted (invisible — they're outside the box) and are re-queued by the
    // first shallower swap, where freeing is proven cheap. Bounded: a deep view
    // is ≤1/32 of the county, so deep panning accumulates slowly, and zooming
    // out re-uses the held nodes instead of remounting them.
    const FREE_HOLD_ZF = 32;
    const holdFrees = zf >= FREE_HOLD_ZF;
    let held = 0;
    const freeN = { p: 0, b: 0, c: 0, n: 0 }; // pins/basemap/county fills/names
    const toRemove = [], toMount = [];
    const drop = (it, t) => { if (holdFrees) held++; else { toRemove.push(it); freeN[t]++; } };
    const ensureBm = (it) => { if (!it.el) { it.el = document.createElementNS(SVG_NS, 'path'); it.el.setAttribute('d', it.d); it.el.setAttribute('class', it.cls); } return it.el; };
    const ensurePin = (it) => (it.el || (it.el = makePin(it)));
    const ensureEl = (it) => it.el;
    for (const it of countyItems) { const on = inBox(it.bb); if (on !== it.on) { if (on) toMount.push([it, gCounty, ensureEl]); else drop(it, 'c'); } }
    for (const it of bmItems) { const on = inBox(it.bb); if (on !== it.on) { if (on) toMount.push([it, bmGroup, ensureBm]); else drop(it, 'b'); } }
    for (const it of pinItems) {
      const on = it.x >= x1 - r && it.x <= x2 + r && it.y >= y1 - r && it.y <= y2 + r;
      if (on !== it.on) { if (on) toMount.push([it, it.hot ? gPinsHot : gPins, ensurePin]); else drop(it, 'p'); }
    }
    for (const v of [lmVirt, ctyVirt]) {
      for (const it of v.items) { const on = inBox(it.bb); if (on !== it.on) { if (on) toMount.push([it, v.group, ensureEl]); else drop(it, 'n'); } }
    }
    // Per-type totals for the progress readout (pins vs map geometry vs names).
    const isPin = (g) => g === gPins || g === gPinsHot;
    const totPins = toMount.reduce((n, [, g]) => n + isPin(g), 0);
    const totMap = toMount.length - totPins;
    let ri = 0, mi = 0, mPins = 0, li = 0, lhi = 0, varsDone = false, labelPlan = null;
    const t0 = performance.now();
    if (swapActive) dbgEvent('superseded'); // a prior chain never finished
    swapActive = true;
    // The free breakdown ([p]ins [b]asemap [c]ounty fills [n]ames) tells the
    // trace WHICH content type a free-phase stall follows; "hold" = frees
    // deferred to a shallower swap (deep-zoom rule above).
    const fb = ['p', 'b', 'c', 'n'].filter((k) => freeN[k]).map((k) => `${k}${freeN[k]}`).join(' ');
    dbgEvent(`swap ×${zf.toFixed(0)} free ${toRemove.length}${fb ? `[${fb}]` : ''}${held ? ` hold ${held}` : ''} mount ${toMount.length}`);
    const progress = () => {
      const parts = [];
      if (totPins) parts.push(`pins ${mPins}/${totPins}`);
      if (totMap) parts.push(`map ${Math.min(mi - mPins, totMap)}/${totMap}`);
      if (toRemove.length) parts.push(`free ${ri}/${toRemove.length}`);
      if (labelPlan && labelPlan.show.length) parts.push(`labels ${li}/${labelPlan.show.length}`);
      progUpdate(parts.join(' · ') || 'updating…');
    };
    // PHASE ORDER — what the user can SEE comes first (Noah's blank-map
    // screenshot: two consecutive stops spent all their time freeing invisible
    // off-screen junk and were killed before ever mounting — the view starved):
    //   1. MOUNTS — fill the box NOW (tiny at deep zoom: first frame).
    //   2. FREES — invisible housekeeping, after the picture is whole.
    //   3. one sizing-var write (smallest set: frees already done).
    //   4. LABELS, hardest-capped (halo'd text is Safari's priciest paint).
    // Pins can't render mis-sized in phase 1: --fp refreshes ~8 Hz mid-gesture.
    let prevStepEnd = 0, lastPhase = 'start', lastOps = 0;
    const step = () => {
      swapRaf = 0;
      const s0 = performance.now();
      // The seconds go ONE of two places: inside our JS slice ("slice Nms") or
      // between our frames, where the browser pays style/layout/raster for the
      // previous slice ("gap Nms after <phase>"). Noah's ×256 trace answered:
      // gap 3042ms after the first free slice — Safari's bill, not our JS.
      if (prevStepEnd && s0 - prevStepEnd > 250) dbgEvent(`gap ${Math.round(s0 - prevStepEnd)}ms after ${lastPhase}(${lastOps})`);
      if (gen !== swapGen) { progHide(); swapActive = false; dbgEvent('swap abandoned'); return; } // box moved — queue dies
      let ops = 0, phase = 'mounts';
      if (mi < toMount.length) {
        const frags = new Map();
        while (mi < toMount.length && ops < OPS) {
          const [it, group, ensure] = toMount[mi++];
          let f = frags.get(group); if (!f) { f = document.createDocumentFragment(); frags.set(group, f); }
          f.append(ensure(it)); it.on = true; if (isPin(group)) mPins++; ops++;
        }
        for (const [group, f] of frags) group.append(f);
      } else if (ri < toRemove.length) {
        phase = 'frees';
        while (ri < toRemove.length && ops < OPS) { const it = toRemove[ri++]; it.el.remove(); it.on = false; ops++; }
      } else if (!varsDone) {
        phase = 'vars';
        varsDone = true; pz.applyVars();
        // Deep zoom: drop the basemap clip — Safari rasterises the clip
        // geometry at map scale (huge offscreen surfaces), and inside a county
        // there is nothing to clip away. Restored on the way back out. Toggled
        // ONLY on an actual state change: re-setting the same attribute every
        // swap can invalidate the clip raster all over again.
        const wantClipOff = zf >= 10;
        if (wantClipOff !== clipOff) {
          clipOff = wantClipOff;
          if (wantClipOff) bmGroup.removeAttribute('clip-path'); else if (bmClip) bmGroup.setAttribute('clip-path', bmClip);
          dbgEvent(`clip ${wantClipOff ? 'off' : 'on'}`);
        }
        dbgEvent('vars write'); // the one restyle gets its own frame
      } else if (!labelPlan) {
        phase = 'labelplan';
        labelPlan = planLabels(vb, zf); // pure JS — the hides run SLICED below
      } else if (lhi < labelPlan.hide.length || li < labelPlan.show.length) {
        phase = 'labels';
        // Hides ride the same op cap as shows — "removals are cheap" died with
        // the ×256 trace (removals are exactly what stalled the free phase).
        while (lhi < labelPlan.hide.length && ops < 8) { const it = labelPlan.hide[lhi++]; it.el.remove(); it.on = false; ops++; }
        while (li < labelPlan.show.length && ops < 8) { const it = labelPlan.show[li++]; if (!it.el) it.el = makeLabel(it); pinNames.append(it.el); it.on = true; ops++; }
      } else {
        const ms = performance.now() - t0;
        updateScale(vb, zf, ms);
        progDone(ms);
        swapActive = false;
        dbgEvent(`done ${(ms / 1000).toFixed(2)}s labels +${labelPlan.show.length}${labelPlan.hide.length ? ` -${labelPlan.hide.length}` : ''}`);
        return;
      }
      progress();
      const d = performance.now() - s0;
      if (d > 120) dbgEvent(`slice ${Math.round(d)}ms ${phase} ops ${ops}`);
      lastPhase = phase; lastOps = ops;
      prevStepEnd = performance.now();
      swapRaf = requestAnimationFrame(step);
    };
    step();
  }

  const pz = attachPanZoom(wrap, svg, {
    W, H, home, bounds, maxZoom: 256, // deep enough that Ice House alone fills the screen
    // This map manages its own DOM (mount/unmount by view) — the generic
    // visibility cull would fight it and cache detached nodes.
    viewCull: false,
    // The sizing-var write is SEQUENCED inside the stop-swap (phase 2) so the
    // one big restyle never races the mounts — see startSwap.
    deferVars: true,
    onZoom: () => {
      // NOTHING happens while the box moves — any in-flight swap is abandoned
      // and freed IMMEDIATELY (its progress readout too), and the one settle
      // swap is pushed back. 280ms of quiet + fingers off the glass (checked in
      // startSwap) is what "stopped" means — 90ms fired inside natural pinch
      // micro-pauses.
      swapGen++;
      if (swapRaf) { cancelAnimationFrame(swapRaf); swapRaf = 0; swapActive = false; dbgEvent('abandon'); }
      progHide();
      holdStart = 0; holdHide();
      clearTimeout(syncT);
      syncT = setTimeout(startSwap, 280);
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
