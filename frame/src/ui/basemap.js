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
import * as HAHIRA_LAYERS from '../data/hahira-basemap.js';
import * as PCB_LAYERS from '../data/panamacity-basemap.js';
import { WATER_SHAPES } from '../data/water-shapes.js';

// Per-area landmark layers (v38): same export shape from every generated
// module, picked by map area. The OSM water shorelines (WATER_SHAPES) are a
// California-only curation, so they ride only that area's basemap.
const LAYERS = {
  california: CA_LAYERS,
  yellowstone: YS_LAYERS,
  hahira: HAHIRA_LAYERS,
  panamacity: PCB_LAYERS,
};

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

// ---------------------------------------------------------------------------
// FILL CLIPPING (v42 deep-zoom fix). WebKit rasterises an SVG fill by the
// element's own extent, not the visible sliver: at ×256 a county-spanning
// polygon becomes a ~30k-pixel surface and the first paint at that depth
// blocks the main thread for seconds (Noah's iPhone trace: gap 8-9s with ZERO
// DOM ops in flight). The cure is to never hand Safari a giant fill at deep
// zoom — the map swaps it for a polygon CLIPPED IN JS to a box around the
// view (tiny extent, paints in microseconds), identical inside the viewport.
// These helpers do that: parse the generated "M x y L x y … Z" geometry into
// rings, clip rings to a box (Sutherland–Hodgman), and serialise back.
// ---------------------------------------------------------------------------

// Rings of [x,y] pairs from generated path data. Absolute M/L/Z only — the
// only commands our generators emit; anything else returns null and the
// caller paints the original geometry unclipped.
export function parseRings(d) {
  if (/[^MLZ0-9.,\s-]/.test(d)) return null;
  const rings = [];
  for (const seg of d.split('M').slice(1)) {
    const n = seg.match(/-?[0-9.]+/g);
    if (!n || n.length < 6) continue;
    const ring = [];
    for (let i = 0; i + 1 < n.length; i += 2) ring.push([+n[i], +n[i + 1]]);
    rings.push(ring);
  }
  return rings.length ? rings : null;
}

// Sutherland–Hodgman: each ring clipped against the box's four half-planes.
// Correct for the flat-colour fills we draw (holes aren't in the data).
export function clipRingsToBox(rings, x1, y1, x2, y2) {
  const planes = [
    [(p) => p[0] >= x1, (a, b) => [x1, a[1] + (b[1] - a[1]) * (x1 - a[0]) / (b[0] - a[0])]],
    [(p) => p[0] <= x2, (a, b) => [x2, a[1] + (b[1] - a[1]) * (x2 - a[0]) / (b[0] - a[0])]],
    [(p) => p[1] >= y1, (a, b) => [a[0] + (b[0] - a[0]) * (y1 - a[1]) / (b[1] - a[1]), y1]],
    [(p) => p[1] <= y2, (a, b) => [a[0] + (b[0] - a[0]) * (y2 - a[1]) / (b[1] - a[1]), y2]],
  ];
  const out = [];
  for (const ring of rings) {
    let poly = ring;
    for (const [inside, cross] of planes) {
      const next = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const ain = inside(a), bin = inside(b);
        if (ain) { next.push(a); if (!bin) next.push(cross(a, b)); }
        else if (bin) next.push(cross(a, b));
      }
      poly = next;
      if (!poly.length) break;
    }
    if (poly.length >= 3) out.push(poly);
  }
  return out;
}

export function ringsToD(rings) {
  let d = '';
  for (const ring of rings) {
    d += `M${ring[0][0].toFixed(2)} ${ring[0][1].toFixed(2)}`;
    for (let i = 1; i < ring.length; i++) d += `L${ring[i][0].toFixed(2)} ${ring[i][1].toFixed(2)}`;
    d += 'Z';
  }
  return d;
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
// into shorter OVERLAPPING pieces. A single coastline path spans the whole
// coast, so it can never be excluded by a viewport test; chunked, each piece
// has a small bbox and only the pieces in view need to exist at all. Fills are
// NOT chunked (a fill needs its closed ring); they're bounded and test whole.
function chunkPolyline(out, d, cls, maxPts = 20) {
  const nums = d.match(/-?[0-9.]+/g);
  if (!nums || nums.length <= maxPts * 2) { out.push({ d, cls, bb: bboxOfD(d) }); return; }
  for (let i = 0; i + 3 < nums.length; i += (maxPts - 1) * 2) {
    const seg = nums.slice(i, i + maxPts * 2);
    if (seg.length < 4) break;
    let piece = `M${seg[0]} ${seg[1]}`;
    for (let j = 2; j + 1 < seg.length; j += 2) piece += `L${seg[j]} ${seg[j + 1]}`;
    out.push({ d: piece, cls, bb: bboxOfD(piece) });
  }
}

/**
 * The basemap as DATA: [{d, cls, bb}] draw-ordered (fills first, then lines,
 * lines chunked). The hotspot map mounts ONLY the items intersecting its view
 * (virtualisation — the DOM never holds the whole county's geometry); the
 * region picker mounts them all (its view is always the whole state).
 */
export function basemapItems(area = 'california') {
  const L = LAYERS[area];
  const items = [];
  // Fills carry fill:1 — the hotspot map's deep zoom substitutes them with a
  // view-clipped copy (see parseRings/clipRingsToBox above); lines never need
  // it, chunkPolyline already bounds their extents.
  for (const d of L.PARKS) items.push({ d, cls: 'bm-park', bb: bboxOfD(d), fill: 1 });
  for (const d of L.LAKES) items.push({ d, cls: 'bm-lake', bb: bboxOfD(d), fill: 1 });
  if (area === 'california') for (const s of WATER_SHAPES) items.push({ d: s.d, cls: 'bm-lake', bb: bboxOfD(s.d), fill: 1 });
  for (const d of L.RIVERS) chunkPolyline(items, d, 'bm-river');
  for (const d of L.COASTLINE) chunkPolyline(items, d, 'bm-coast');
  for (const d of L.ROADS) chunkPolyline(items, d, 'bm-road');
  return items;
}

/**
 * The basemap SHELL: defs + a decimated county clip + an empty group, ready for
 * items to be mounted into. `id` must be unique per SVG (names the clipPath).
 */
export function basemapShell(svg, id = 'bm', area = 'california') {
  const shapes = MAP_AREAS[area].shapes;
  // Clip to the county silhouette so landmarks never spill into the empty
  // ocean / out-of-region background. Decimated: a clip doesn't need every point.
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
  svg.append(g);
  return g;
}

/**
 * Append the full landmark backdrop (the region picker's whole-state view —
 * everything is always in frame there, so no virtualisation).
 */
export function appendBasemap(svg, id = 'bm', area = 'california') {
  const g = basemapShell(svg, id, area);
  for (const it of basemapItems(area)) g.append(path(it.d, it.cls));
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
