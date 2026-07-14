// =============================================================================
// HOTSPOT MAP (v17) — every hotspot in the active region, pinned on the county
// map. Pin brightness follows this month's photographer score; tap a pin to
// open that hotspot's page. Uses the same county shapes + pan/zoom as the
// picker, opening zoomed to the active region's counties. If the device has
// already granted location permission (e.g. for auto-switch), a "you are here"
// dot is drawn too — asking for permission stays a Settings decision.
// =============================================================================
import { el, clear, scoreScale } from './dom.js';
import { COUNTY_SHAPES, MAP_VIEWBOX } from '../data/county-shapes.js';
import { COUNTIES } from '../data/counties.js';
import { attachPanZoom } from './panzoom.js';
import { appendBasemap, appendCountyLabels, appendLandmarkLabels } from './basemap.js';
import { latLngToMap, countiesBBox } from '../model/geo.js';
import { getHotspots, activeRegion } from '../model/regions.js';
import { rankHotspots } from '../model/scoring.js';
import { MONTHS } from '../model/inference.js';
import { monthSelector, regionDeadEnd } from './views.js';

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

  root.append(el('header.bar', {}, [
    el('div.title-row', {}, [
      el('h1', {}, 'Hotspot map'),
      el('span.subtitle', {}, `${region.name} · pin brightness = ${MONTHS[state.monthIdx]} score · tap a pin`),
    ]),
    monthSelector(state, (i) => nav.setMonth(i)),
  ]));

  if (!hotspots.length) {
    root.append(regionDeadEnd(nav, 'Nothing to map for this region'));
    return;
  }

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

  // Pins, sized to the region zoom and colored by this month's score.
  const ranked = rankHotspots(hotspots, state.monthIdx);
  const scoreById = Object.fromEntries(ranked.map((r) => [r.hotspot.id, r.score]));
  const bbox = countiesBBox(region.counties) || { x: 0, y: 0, w: W, h: H };
  const home = homeBox(bbox, W, H);
  const r = Math.max(2.5, home.w * 0.012);
  for (const h of hotspots) {
    const [x, y] = latLngToMap(h.lat, h.lng);
    const score = scoreById[h.id] ?? 0;
    const pin = document.createElementNS(SVG_NS, 'circle');
    pin.setAttribute('cx', x.toFixed(1));
    pin.setAttribute('cy', y.toFixed(1));
    pin.setAttribute('r', r.toFixed(1));
    pin.setAttribute('class', 'pin');
    pin.style.setProperty('--s', score);
    pin.dataset.id = h.id;
    const title = document.createElementNS(SVG_NS, 'title');
    title.textContent = `${h.name} · ${MONTHS[state.monthIdx]} score ${score}`;
    pin.append(title);
    svg.append(pin);
  }

  // Landmark names (roads, rivers, lakes, parks), then county names on top —
  // both pointer-transparent, quiet statewide, readable as you pinch in.
  appendLandmarkLabels(svg);
  appendCountyLabels(svg);

  wrap.append(svg);
  const pz = attachPanZoom(wrap, svg, {
    W, H, home, maxZoom: 24,
    onTap: (e) => {
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-id]');
      if (hit) nav.go(`#/hotspot/${encodeURIComponent(hit.dataset.id)}`);
    },
  });
  wrap.append(pz.controls());
  root.append(wrap);

  root.append(scoreScale(`Fuller colour = higher photographer score this ${MONTHS[state.monthIdx]}. Tap a pin to open it; pinch or scroll to zoom, drag to pan.`));

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
      me.setAttribute('class', 'you-dot');
      svg.append(me);
    }, () => {}, { maximumAge: 300000, timeout: 5000 });
  }).catch(() => {});
}
