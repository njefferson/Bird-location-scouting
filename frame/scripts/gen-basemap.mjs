// =============================================================================
// gen-basemap.mjs — regenerate src/data/basemap.js (orientation landmarks)
// =============================================================================
// Companion to gen-county-shapes.mjs. Downloads public-domain Natural Earth
// vectors (coastline, rivers/lakes, major roads, parks & protected lands),
// clips them to the CA + Tahoe/Reno NV extent, projects them into the SAME
// 1000×1178 viewBox as the counties (reusing MAP_PROJECTION), and emits both
// the path data AND a set of NAME LABELS (one per feature-name, so a road /
// river / lake / park can be identified, not just seen). Rivers use Natural
// Earth's finer North-America layer so local rivers (e.g. the American) show,
// not only the Sacramento. Output is committed and shipped offline.
//
//   node scripts/gen-basemap.mjs
// =============================================================================
import { writeFileSync } from 'node:fs';
import { RESERVOIRS, REFUGES } from './curated-landmarks.mjs';
import { MAP_PROJECTION as P, MAP_VIEWBOX as VB, COUNTY_SHAPES } from '../src/data/county-shapes.js';

const { kx, minX, minY, scale } = P;
const { w: W, h: H } = VB;
const proj = (lng, lat) => [(lng * kx - minX) * scale, (-lat - minY) * scale];

const SRC = {
  coastline: 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_coastline.json',
  rivers:    'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_rivers_lake_centerlines.json',
  riversNA:  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_rivers_north_america.geojson',
  lakes:     'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_lakes.json',
  lakesNA:   'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes_north_america.geojson',
  roads:     'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_roads.geojson',
  parks:     'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_parks_and_protected_lands_area.geojson',
};

// Keep only major roads — orientation, not navigation.
const ROAD_TYPES = new Set(['Major Highway', 'Secondary Highway', 'Beltway', 'Bypass']);
const roadKeep = (pr) => ROAD_TYPES.has(pr.type) || (typeof pr.scalerank === 'number' && pr.scalerank <= 8);


const M = 24; // clip margin (viewBox px)
const inBox = ([x, y]) => x >= -M && x <= W + M && y >= -M && y <= H + M;

// --- county rings (silhouette clip + per-county label verification) ----------
const ringsByCode = {};
for (const code of Object.keys(COUNTY_SHAPES)) {
  ringsByCode[code] = [];
  for (const part of COUNTY_SHAPES[code].split('M').filter(Boolean)) {
    const ring = part.replace(/Z/g, '').split('L').map((s) => s.trim().split(/\s+/).map(Number)).filter((p) => p.length === 2 && p.every(Number.isFinite));
    if (ring.length > 2) ringsByCode[code].push(ring);
  }
}
function inRings(x, y, rings) {
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
const allRings = Object.values(ringsByCode).flat();
const inCounties = (x, y) => inRings(x, y, allRings);

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let maxD = 0, idx = 0;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy || 1e-12;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i];
    const t = ((px - ax) * dx + (py - ay) * dy) / len2;
    const cx = ax + t * dx, cy = ay + t * dy;
    const d = (px - cx) ** 2 + (py - cy) ** 2;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps * eps) return rdp(pts.slice(0, idx + 1), eps).slice(0, -1).concat(rdp(pts.slice(idx), eps));
  return [pts[0], pts[pts.length - 1]];
}

function clipLine(pts) {
  const runs = []; let cur = [];
  for (let i = 0; i < pts.length; i++) {
    if (inBox(pts[i])) { if (!cur.length && i > 0) cur.push(pts[i - 1]); cur.push(pts[i]); }
    else if (cur.length) { cur.push(pts[i]); runs.push(cur); cur = []; }
  }
  if (cur.length) runs.push(cur);
  return runs;
}
const fmt = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');

async function load(url) { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); }
function toLines(geom) {
  if (!geom) return [];
  const t = geom.type, c = geom.coordinates;
  if (t === 'LineString') return [c.map(([a, b]) => proj(a, b))];
  if (t === 'MultiLineString') return c.map((l) => l.map(([a, b]) => proj(a, b)));
  if (t === 'Polygon') return c.map((r) => r.map(([a, b]) => proj(a, b)));
  if (t === 'MultiPolygon') return c.flatMap((p) => p.map((r) => r.map(([a, b]) => proj(a, b))));
  return [];
}

// Geometry helpers for label anchors.
function lineLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
function midpoint(pts) {
  const total = lineLen(pts); let half = total / 2, acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc + seg >= half) { const t = (half - acc) / (seg || 1); return [pts[i - 1][0] + t * (pts[i][0] - pts[i - 1][0]), pts[i - 1][1] + t * (pts[i][1] - pts[i - 1][1])]; }
    acc += seg;
  }
  return pts[Math.floor(pts.length / 2)];
}
function polyCentroid(ring) {
  let x = 0, y = 0, A = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const cross = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    A += cross; x += (ring[j][0] + ring[i][0]) * cross; y += (ring[j][1] + ring[i][1]) * cross;
  }
  A *= 0.5;
  if (Math.abs(A) < 1e-6) { const n = ring.length; return [ring.reduce((s, p) => s + p[0], 0) / n, ring.reduce((s, p) => s + p[1], 0) / n]; }
  return [x / (6 * A), y / (6 * A)];
}
const cleanName = (s) => (s || '').replace(/\s+/g, ' ').trim();
const roundLabel = (x, y, t) => ({ x: +x.toFixed(1), y: +y.toFixed(1), t });

// Build a LINE layer of paths + one label per name (longest segment's midpoint).
// Each label carries the feature's best (lowest) scalerank so road shields can
// be limited to major routes.
async function lineLayer(urls, { eps, filter, nameKey = 'name' } = {}) {
  const paths = []; const byName = new Map(); let pts = 0;
  for (const url of [].concat(urls)) {
    const gj = await load(url);
    for (const f of gj.features) {
      if (filter && !filter(f.properties || {})) continue;
      const nm = cleanName(f.properties?.[nameKey] || f.properties?.name_en);
      const rank = typeof f.properties?.scalerank === 'number' ? f.properties.scalerank : 9;
      for (const line of toLines(f.geometry)) {
        for (const run of clipLine(line)) {
          const simp = rdp(run, eps);
          if (simp.length < 2) continue;
          paths.push(fmt(simp)); pts += simp.length;
          if (nm) {
            const cur = byName.get(nm);
            const L = lineLen(simp);
            if (!cur || L > cur.len) byName.set(nm, { len: L, pts: simp, rank: Math.min(rank, cur?.rank ?? 9) });
            else cur.rank = Math.min(cur.rank, rank);
          }
        }
      }
    }
  }
  const labels = [];
  for (const [t, { pts: line, rank }] of byName) {
    const [x, y] = midpoint(line);
    if (inBox([x, y]) && inCounties(x, y)) labels.push({ ...roundLabel(x, y, t), rank });
  }
  return { paths, labels, pts };
}

// Road shields: majors only (the minor-route numbers were visual noise), then a
// greedy min-distance pass so shields can never collide ("980" over "3").
function pickShields(labels, { maxRank = 6, minDist = 13 } = {}) {
  const keep = [];
  for (const l of labels.filter((x) => x.rank <= maxRank).sort((a, b) => a.rank - b.rank)) {
    if (keep.every((k) => Math.hypot(k.x - l.x, k.y - l.y) >= minDist)) keep.push(l);
  }
  return keep;
}

// Project + verify the curated point labels. Every point must land inside one
// of its declared counties — otherwise the BUILD fails (labels stay honest).
// Names Natural Earth already labels are dropped so nothing shows twice.
function curatedPoints(entries, existingNames) {
  const out = []; const errors = [];
  const seen = new Set([...existingNames].map((n) => n.toLowerCase()));
  for (const e of entries) {
    if (seen.has(e.t.toLowerCase())) continue;
    const [x, y] = proj(e.lng, e.lat);
    const hit = e.in.find((code) => ringsByCode[code] && inRings(x, y, ringsByCode[code]));
    if (!hit) { errors.push(`${e.t} (${e.lat},${e.lng}) is not inside ${e.in.join('/')}`); continue; }
    out.push(roundLabel(x, y, e.t));
  }
  if (errors.length) { console.error('CURATED LABEL VERIFICATION FAILED:\n  ' + errors.join('\n  ')); process.exit(1); }
  return out;
}

// Build a FILL layer of closed paths + one label per name (centroid of largest ring).
async function fillLayer(urls, { eps, nameKey = 'name', minPts = 4 } = {}) {
  const paths = []; const byName = new Map(); let pts = 0;
  for (const url of [].concat(urls)) {
    const gj = await load(url);
    for (const f of gj.features) {
      const nm = cleanName(f.properties?.[nameKey] || f.properties?.unit_name);
      for (const ring of toLines(f.geometry)) {
        for (const run of clipLine(ring)) {
          const simp = rdp(run, eps);
          if (simp.length < minPts) continue;
          paths.push(fmt(simp) + 'Z'); pts += simp.length;
          if (nm) { const [cx, cy] = polyCentroid(simp); const area = Math.abs(lineLen(simp)); const cur = byName.get(nm); if (!cur || area > cur.area) byName.set(nm, { area, x: cx, y: cy }); }
        }
      }
    }
  }
  const labels = [];
  for (const [t, { x, y }] of byName) { if (inBox([x, y]) && inCounties(x, y)) labels.push(roundLabel(x, y, t)); }
  return { paths, labels, pts };
}

console.log('Fetching + projecting Natural Earth landmarks…');
const coastline = await lineLayer(SRC.coastline, { eps: 0.8 });
const rivers    = await lineLayer([SRC.riversNA, SRC.rivers], { eps: 0.7 });
const roads     = await lineLayer(SRC.roads, { eps: 1.0, filter: roadKeep });
roads.labels    = pickShields(roads.labels);
const lakes     = await fillLayer([SRC.lakes, SRC.lakesNA], { eps: 0.7 });
const parks     = await fillLayer(SRC.parks, { eps: 0.9, nameKey: 'name' });
const waterPts  = curatedPoints(RESERVOIRS, lakes.labels.map((l) => l.t));
const refugePts = curatedPoints(REFUGES, parks.labels.map((l) => l.t));
for (const [n, l] of Object.entries({ coastline, rivers, roads, lakes, parks })) console.log(`  ${n}: ${l.paths.length} paths, ${l.labels.length} labels`);
console.log(`  curated: ${waterPts.length} reservoirs/lakes, ${refugePts.length} refuges (county-verified)`);

const banner = `// AUTO-GENERATED by scripts/gen-basemap.mjs — do not hand-edit.
// Orientation landmarks (Natural Earth, public domain) projected into the same
// ${W}×${H} viewBox as county-shapes.js. Path arrays draw the features; the
// *_LABELS arrays name them ({x,y,t}), one label per feature-name placed inside
// the county silhouette. WATER_POINTS / REFUGE_POINTS are the curated,
// county-verified reservoir & refuge labels. Consumed by ui/basemap.js.
`;
const arr = (name, xs) => `export const ${name} = [\n${xs.map((d) => `  '${d}',`).join('\n')}\n];\n`;
const larr = (name, xs) => `export const ${name} = [\n${xs.map((l) => `  { x: ${l.x}, y: ${l.y}, t: ${JSON.stringify(l.t)} },`).join('\n')}\n];\n`;
writeFileSync('src/data/basemap.js',
  banner + '\n' +
  arr('COASTLINE', coastline.paths) + '\n' +
  arr('RIVERS', rivers.paths) + '\n' + larr('RIVER_LABELS', rivers.labels) + '\n' +
  arr('LAKES', lakes.paths) + '\n' + larr('LAKE_LABELS', lakes.labels) + '\n' +
  arr('ROADS', roads.paths) + '\n' + larr('ROAD_LABELS', roads.labels) + '\n' +
  arr('PARKS', parks.paths) + '\n' + larr('PARK_LABELS', parks.labels) + '\n' +
  larr('WATER_POINTS', waterPts) + '\n' + larr('REFUGE_POINTS', refugePts));

const total = coastline.paths.length + rivers.paths.length + lakes.paths.length + roads.paths.length + parks.paths.length;
console.log(`Wrote src/data/basemap.js — ${total} paths, ${rivers.labels.length + lakes.labels.length + roads.labels.length + parks.labels.length} named + ${waterPts.length + refugePts.length} curated labels`);
