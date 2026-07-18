// =============================================================================
// BASEMAP — the offline orientation backdrop shared by the county picker and
// the hotspot map. Draws Natural-Earth landmarks (parks, lakes, rivers,
// coastline, major roads) clipped to the county silhouette, plus soft county
// name labels. Everything is projected into the same viewBox as the counties
// (see data/basemap.js / gen-basemap.mjs), so it lines up exactly.
//
// Layer order matters: landmarks sit ON TOP of the county fills (so the fill
// still tints them) but UNDER the interactive layer and the county labels. The
// caller draws county fills first, then calls appendBasemap(), then draws its
// own selection outlines / pins, then appendCountyLabels() last.
// =============================================================================
import { MAP_AREAS } from '../data/map-areas.js';
import { COUNTIES } from '../data/counties.js';
import * as CA_LAYERS from '../data/basemap.js';
import * as YS_LAYERS from '../data/yellowstone-basemap.js';
import { WATER_SHAPES } from '../data/water-shapes.js';

// Per-area landmark layers (v38): same export shape from both generated
// modules, picked by map area. The OSM water shorelines (WATER_SHAPES) are a
// California-only curation, so they ride only that area's basemap.
const LAYERS = { california: CA_LAYERS, yellowstone: YS_LAYERS };

// Curated waters that have a real OSM shoreline — those render as actual lakes,
// so they get no marker dot (the shape IS the marker; the name still labels it).
const SHAPED = new Set(WATER_SHAPES.map((s) => s.t));
import { countyCentroid } from '../model/geo.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Bounding box straight from the path's own numbers ("M x y L x y …"), stored on
// the element as __bb = [x1,y1,x2,y2]. The viewport cull reads this instead of
// calling getBBox() at runtime — measuring every element in the county on the
// first deep zoom was a synchronous LAYOUT STORM that froze the app mid-gesture
// (Noah: "it pauses like it's loading"). Computing it here, from data we already
// have, moves that cost to load time and spreads it across element creation.
export function bboxOfD(d) {
  const n = d.match(/-?[0-9.]+/g);
  if (!n || n.length < 2) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) {
    const x = +n[i], y = +n[i + 1];
    if (x < x1) x1 = x; if (y < y1) y1 = y; if (x > x2) x2 = x; if (y > y2) y2 = y;
  }
  return [x1, y1, x2, y2];
}

// Coarsen a closed shape for use as a CLIP path only — clipping doesn't need
// every point, and a lighter clip region is much cheaper for Safari to evaluate
// each frame. Never used for anything visible.
function decimateRing(d, keep = 4) {
  const n = d.match(/-?[0-9.]+/g);
  if (!n || n.length < keep * 4) return d;
  let out = `M${n[0]} ${n[1]}`;
  for (let i = 2 * keep; i + 1 < n.length; i += 2 * keep) out += `L${n[i]} ${n[i + 1]}`;
  return out + 'Z';
}

function path(d, cls) {
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('class', cls);
  const bb = bboxOfD(d);
  if (bb) p.__bb = bb;
  return p;
}

// Split a long polyline ("M x y L x y …", the only commands the basemap uses)
// into shorter OVERLAPPING pieces, and append each as its own <path>. A single
// coastline path spans the whole coast, so its bounding box always overlaps the
// view and the viewport cull can never drop it — Safari then re-tessellates the
// entire thing every frame at deep zoom (the lockup). Chunked, each piece has a
// small bbox, so off-screen pieces cull and only what's actually on screen draws.
// Fills are NOT chunked (a fill needs its closed ring); they're bounded and cull
// whole. maxPts keeps each piece cheap while overlapping one point for continuity.
function appendPolyline(g, d, cls, maxPts = 20) {
  const nums = d.match(/-?[0-9.]+/g);
  if (!nums || nums.length <= maxPts * 2) { g.append(path(d, cls)); return; }
  for (let i = 0; i + 3 < nums.length; i += (maxPts - 1) * 2) {
    const seg = nums.slice(i, i + maxPts * 2);
    if (seg.length < 4) break;
    let piece = `M${seg[0]} ${seg[1]}`;
    for (let j = 2; j + 1 < seg.length; j += 2) piece += `L${seg[j]} ${seg[j + 1]}`;
    g.append(path(piece, cls));
  }
}

/**
 * Append the landmark backdrop to an SVG, clipped to the county silhouette.
 * `id` must be unique per SVG (it names the clipPath). Returns the <g> so a
 * caller can toggle it. Idempotent-ish: pass a fresh id per map instance.
 */
export function appendBasemap(svg, id = 'bm', area = 'california') {
  const L = LAYERS[area];
  const shapes = MAP_AREAS[area].shapes;
  // Clip everything to the union of county shapes, so landmarks never spill
  // into the empty ocean / out-of-region background.
  const defs = document.createElementNS(SVG_NS, 'defs');
  const clip = document.createElementNS(SVG_NS, 'clipPath');
  clip.setAttribute('id', id);
  for (const code of Object.keys(shapes)) clip.append(path(decimateRing(shapes[code]), 'clip-c'));
  defs.append(clip);
  svg.append(defs);

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'basemap');
  g.setAttribute('clip-path', `url(#${id})`);
  g.setAttribute('aria-hidden', 'true');
  // Fills first (parks, lakes — including the OSM reservoir shorelines), then
  // lines over them (rivers, coast, roads).
  for (const d of L.PARKS) g.append(path(d, 'bm-park'));
  for (const d of L.LAKES) g.append(path(d, 'bm-lake'));
  if (area === 'california') for (const s of WATER_SHAPES) g.append(path(s.d, 'bm-lake'));
  // Lines are chunked so off-screen pieces cull (see appendPolyline); fills above
  // stay whole.
  for (const d of L.RIVERS) appendPolyline(g, d, 'bm-river');
  for (const d of L.COASTLINE) appendPolyline(g, d, 'bm-coast');
  for (const d of L.ROADS) appendPolyline(g, d, 'bm-road');
  svg.append(g);
  return g;
}

// A styled name label. Water/park names are plain text in their layer colour;
// road numbers get a small shield so a bare "50" reads as a highway.
// `--fs` is the base size in viewBox units; CSS combines it with the map's
// `--zf` so labels grow with the zoom only up to a cap, then hold a constant
// on-screen size — no more billboard text when pinched all the way in.
function textLabel(l, cls, size, dy) {
  const t = document.createElementNS(SVG_NS, 'text');
  t.setAttribute('x', l.x); t.setAttribute('y', l.y);
  if (dy) t.setAttribute('dy', dy); // em offset: tracks the (capped) font size
  t.setAttribute('class', cls); t.setAttribute('font-size', size);
  t.style.setProperty('--fs', size);
  t.textContent = l.t;
  return t;
}

/**
 * Append landmark NAME labels (rivers, lakes, parks) and road-number shields, so
 * the lines and blobs are identifiable rather than anonymous. Pointer-transparent
 * and scaled in viewBox units, like the county labels — quiet statewide, readable
 * as you pinch in. Draw this UNDER the county labels (county names win).
 */
export function appendLandmarkLabels(svg, area = 'california') {
  const L = LAYERS[area];
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'landmark-labels');
  g.setAttribute('aria-hidden', 'true');

  for (const l of L.PARK_LABELS) g.append(textLabel(l, 'lm-park', 5.5));
  for (const l of L.LAKE_LABELS) g.append(textLabel(l, 'lm-water', 5.5));
  for (const l of L.RIVER_LABELS) g.append(textLabel(l, 'lm-water lm-river', 5));

  // Curated points (reservoirs, refuges — county-verified at build time):
  // a small dot at the true position, the name just beneath it.
  const dot = (l, cls) => {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', l.x); c.setAttribute('cy', l.y); c.setAttribute('r', '1.4');
    c.setAttribute('class', cls);
    return c;
  };
  for (const l of L.WATER_POINTS) {
    if (!SHAPED.has(l.t)) g.append(dot(l, 'lm-dot lm-dot-water'));
    g.append(textLabel(l, 'lm-water', 4.5, SHAPED.has(l.t) ? '0.35em' : '1.5em'));
  }
  for (const l of L.REFUGE_POINTS) {
    g.append(dot(l, 'lm-dot lm-dot-park'));
    g.append(textLabel(l, 'lm-park', 4.5, '1.5em'));
  }

  // Road shields: a pill in the ROAD colour (so the number reads as part of the
  // road it sits on), major routes only, de-collided at build time. The rect's
  // geometry is mirrored into CSS vars so the pill counter-scales with the text.
  for (const l of L.ROAD_LABELS) {
    const fs = 4.5, h = fs + 3, w = Math.max(h, l.t.length * fs * 0.62 + 3.6);
    const shield = document.createElementNS(SVG_NS, 'g');
    shield.setAttribute('class', 'lm-shield');
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', (l.x - w / 2).toFixed(1)); r.setAttribute('y', (l.y - h / 2).toFixed(1));
    r.setAttribute('width', w.toFixed(1)); r.setAttribute('height', h.toFixed(1));
    r.setAttribute('rx', (h / 2).toFixed(1));
    r.style.setProperty('--cx', l.x); r.style.setProperty('--cy', l.y);
    r.style.setProperty('--w', w.toFixed(1)); r.style.setProperty('--h', h.toFixed(1));
    const t = textLabel(l, 'lm-shield-t', fs);
    shield.append(r, t);
    g.append(shield);
  }
  svg.append(g);
  return g;
}

/**
 * Append soft county-name labels at each county's centroid. Font size is set in
 * viewBox units, so labels are quiet when the whole state is in view and become
 * readable as you pinch into your scouting area. Labels carry a faint halo
 * (paint-order stroke) so they read over both pale counties and the landmarks.
 * `codes` defaults to every county; pass a subset to label only those.
 */
export function appendCountyLabels(svg, codes = Object.keys(MAP_AREAS.california.shapes)) {
  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'county-labels');
  g.setAttribute('aria-hidden', 'true');
  for (const code of codes) {
    const c = countyCentroid(code);
    if (!c) continue;
    const name = (COUNTIES[code]?.name || code).replace(' (NV)', '');
    // Fit the label to the county: narrow counties get a smaller font so the
    // name doesn't overspill its shape at the default zoom.
    const size = Math.max(5, Math.min(11, c.w / (name.length * 0.62)));
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', c.x.toFixed(1));
    t.setAttribute('y', c.y.toFixed(1));
    t.setAttribute('class', 'county-label');
    t.setAttribute('font-size', size.toFixed(1));
    t.style.setProperty('--fs', size.toFixed(1)); // counter-scaled by --zf in CSS
    t.textContent = name;
    g.append(t);
  }
  svg.append(g);
  return g;
}
