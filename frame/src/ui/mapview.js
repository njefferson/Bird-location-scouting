// =============================================================================
// HOTSPOT MAP (v17) — every hotspot in the active region, pinned on the county
// map. Pin brightness follows this month's photographer score; tap a pin to
// open that hotspot's page. Uses the same county shapes + pan/zoom as the
// picker, opening zoomed to the active region's counties. If the device has
// already granted location permission (e.g. for auto-switch), a "you are here"
// dot is drawn too — asking for permission stays a Settings decision.
// =============================================================================
import { el, clear, scoreScale, scoreColorPct } from './dom.js';
import { COUNTY_SHAPES, MAP_VIEWBOX } from '../data/county-shapes.js';
import { COUNTIES } from '../data/counties.js';
import { attachPanZoom } from './panzoom.js';
import { appendBasemap, appendCountyLabels, appendLandmarkLabels } from './basemap.js';
import { latLngToMap, countiesBBox } from '../model/geo.js';
import { getHotspots, activeRegion } from '../model/regions.js';
import { rankHotspots } from '../model/scoring.js';
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
      el('span.subtitle', {}, `${region.name} · pin colour = ${MONTHS[state.monthIdx]} ${spec.weigh ? 'shootable bird presence' : 'bird presence'} · tap a pin`),
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

  // Pins, sized to the region zoom and colored by this month's score. `--pr`
  // (base radius) + the map's `--pcap` (the home-view zoom) let CSS hold each
  // pin at a constant on-screen size once you zoom past the opening view —
  // no more donut-sized blobs pinched all the way in.
  const ranked = rankHotspots(hotspots, state.monthIdx, { species: spec.species, weigh: spec.weigh });
  const visById = Object.fromEntries(ranked.map((r) => [r.hotspot.id, r.vis]));
  const divById = Object.fromEntries(ranked.map((r) => [r.hotspot.id, r.diversity]));
  const bbox = countiesBBox(region.counties) || { x: 0, y: 0, w: W, h: H };
  const home = homeBox(bbox, W, H);
  const homeZoom = W / home.w;
  svg.style.setProperty('--pcap', homeZoom.toFixed(3));
  const r = Math.max(2.5, home.w * 0.012);
  const pinNames = document.createElementNS(SVG_NS, 'g');
  pinNames.setAttribute('class', 'pin-names');
  pinNames.setAttribute('aria-hidden', 'true');
  for (const h of hotspots) {
    const [x, y] = latLngToMap(h.lat, h.lng);
    const vis = visById[h.id] ?? 0;
    const div = divById[h.id] ?? 0;
    const pin = document.createElementNS(SVG_NS, 'circle');
    pin.setAttribute('cx', x.toFixed(1));
    pin.setAttribute('cy', y.toFixed(1));
    pin.setAttribute('r', r.toFixed(1));
    pin.setAttribute('class', 'pin');
    pin.style.setProperty('--s', scoreColorPct(vis));
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

  // Landmark names (roads, rivers, lakes, parks), then hotspot names, then
  // county names — all pointer-transparent, all size-capped by --zf.
  appendLandmarkLabels(svg);
  svg.append(pinNames);
  appendCountyLabels(svg);

  wrap.append(svg);
  const pz = attachPanZoom(wrap, svg, {
    W, H, home, maxZoom: 256, // deep enough that Ice House alone fills the screen

    // Hotspot names appear once you're zoomed past ~2× the opening view.
    onZoom: (z) => {
      const on = z >= homeZoom * 2;
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

  root.append(scoreScale(spec.weigh
    ? `Fuller colour = more shootable bird presence this ${MONTHS[state.monthIdx]} (Σ frequency × photo weight, discounted for thin coverage). Tap a pin to open it; pinch or scroll to zoom, drag to pan.`
    : `Fuller colour = more bird presence this ${MONTHS[state.monthIdx]} (Σ frequency, discounted for thin coverage). Tap a pin to open it; pinch or scroll to zoom, drag to pan.`));

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
