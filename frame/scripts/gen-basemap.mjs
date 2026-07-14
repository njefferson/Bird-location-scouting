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

// --- Curated point labels ----------------------------------------------------
// Natural Earth is a world dataset: it has Lake Tahoe and Shasta but not the
// reservoirs (Folsom, Natoma, Camanche…) or the wildlife refuges/preserves a
// bird photographer actually navigates by. Those get NAME LABELS at a curated
// lat/lng. HONESTY GUARD: every entry declares the county (eBird code) it must
// fall in; the build point-in-polygon checks each against the county shapes and
// FAILS if any coordinate lands in the wrong county — a label can't drift.
// Entries whose name Natural Earth already labels are dropped at build time.
const RESERVOIRS = [
  // Home turf (Sacramento foothills) first.
  { t: 'Folsom Lake',            lat: 38.72,  lng: -121.12,  in: ['US-CA-061', 'US-CA-017', 'US-CA-067'] },
  { t: 'Lake Natoma',            lat: 38.635, lng: -121.18,  in: ['US-CA-067'] },
  { t: 'Rancho Seco Lake',       lat: 38.345, lng: -121.12,  in: ['US-CA-067'] },
  { t: 'Camp Far West Res.',     lat: 39.05,  lng: -121.31,  in: ['US-CA-115', 'US-CA-061', 'US-CA-057'] },
  { t: 'Rollins Reservoir',      lat: 39.14,  lng: -120.95,  in: ['US-CA-061', 'US-CA-057'] },
  { t: 'New Bullards Bar Res.',  lat: 39.41,  lng: -121.14,  in: ['US-CA-115'] },
  { t: 'Englebright Lake',       lat: 39.24,  lng: -121.27,  in: ['US-CA-115', 'US-CA-057'] },
  { t: 'Union Valley Reservoir', lat: 38.87,  lng: -120.43,  in: ['US-CA-017'] },
  { t: 'Ice House Reservoir',    lat: 38.82,  lng: -120.36,  in: ['US-CA-017'] },
  { t: 'Jenkinson Lake',         lat: 38.72,  lng: -120.56,  in: ['US-CA-017'] },
  { t: 'Loon Lake',              lat: 38.98,  lng: -120.32,  in: ['US-CA-017'] },
  { t: 'Camanche Reservoir',     lat: 38.22,  lng: -120.97,  in: ['US-CA-005', 'US-CA-009', 'US-CA-077'] },
  { t: 'Pardee Reservoir',       lat: 38.26,  lng: -120.84,  in: ['US-CA-005', 'US-CA-009'] },
  { t: 'New Hogan Lake',         lat: 38.15,  lng: -120.81,  in: ['US-CA-009'] },
  // Sierra / Tahoe / western Nevada.
  { t: 'Stampede Reservoir',     lat: 39.48,  lng: -120.12,  in: ['US-CA-091', 'US-CA-057'] },
  { t: 'Boca Reservoir',         lat: 39.39,  lng: -120.09,  in: ['US-CA-057'] },
  { t: 'Donner Lake',            lat: 39.32,  lng: -120.27,  in: ['US-CA-057'] },
  { t: 'Fallen Leaf Lake',       lat: 38.90,  lng: -120.06,  in: ['US-CA-017'] },
  { t: 'Washoe Lake',            lat: 39.24,  lng: -119.79,  in: ['US-NV-031'] },
  { t: 'Topaz Lake',             lat: 38.685, lng: -119.545, in: ['US-NV-005', 'US-CA-051'] },
  // Statewide majors Natural Earth misses.
  { t: 'Whiskeytown Lake',       lat: 40.62,  lng: -122.55,  in: ['US-CA-089'] },
  { t: 'Black Butte Lake',       lat: 39.81,  lng: -122.34,  in: ['US-CA-021', 'US-CA-103'] },
  { t: 'Lake Sonoma',            lat: 38.72,  lng: -123.02,  in: ['US-CA-097'] },
  { t: 'Lake Mendocino',         lat: 39.20,  lng: -123.18,  in: ['US-CA-045'] },
  { t: 'Don Pedro Reservoir',    lat: 37.87,  lng: -120.60,  in: ['US-CA-109'] },
  { t: 'Lake McClure',           lat: 37.61,  lng: -120.27,  in: ['US-CA-043'] },
  { t: 'New Melones Lake',       lat: 37.95,  lng: -120.52,  in: ['US-CA-009', 'US-CA-109'] },
  { t: 'Pine Flat Lake',         lat: 36.87,  lng: -119.25,  in: ['US-CA-019'] },
  { t: 'Lake Kaweah',            lat: 36.42,  lng: -118.99,  in: ['US-CA-107'] },
  { t: 'Lake Cachuma',           lat: 34.58,  lng: -119.96,  in: ['US-CA-083'] },
  { t: 'Lake Nacimiento',        lat: 35.76,  lng: -120.88,  in: ['US-CA-079'] },
  { t: 'Lake San Antonio',       lat: 35.87,  lng: -120.99,  in: ['US-CA-053'] },
  { t: 'Castaic Lake',           lat: 34.52,  lng: -118.60,  in: ['US-CA-037'] },
  { t: 'Silverwood Lake',        lat: 34.28,  lng: -117.33,  in: ['US-CA-071'] },
  { t: 'Big Bear Lake',          lat: 34.24,  lng: -116.95,  in: ['US-CA-071'] },
  { t: 'Lake Perris',            lat: 33.86,  lng: -117.17,  in: ['US-CA-065'] },
  { t: 'Diamond Valley Lake',    lat: 33.69,  lng: -117.04,  in: ['US-CA-065'] },
  { t: 'Lake Elsinore',          lat: 33.66,  lng: -117.34,  in: ['US-CA-065'] },
  { t: 'Lake Casitas',           lat: 34.39,  lng: -119.34,  in: ['US-CA-111'] },
  { t: 'Los Vaqueros Reservoir', lat: 37.83,  lng: -121.73,  in: ['US-CA-013'] },
  { t: 'Lake Del Valle',         lat: 37.59,  lng: -121.70,  in: ['US-CA-001'] },
  { t: 'Anderson Lake',          lat: 37.17,  lng: -121.63,  in: ['US-CA-085'] },
  { t: 'Crystal Springs Res.',   lat: 37.53,  lng: -122.36,  in: ['US-CA-081'] },
];
// Wildlife refuges & preserves — the landmarks that matter most in a bird app;
// Natural Earth's parks layer is NPS-only and has none of these.
const REFUGES = [
  { t: 'Cosumnes River Preserve', lat: 38.27, lng: -121.44,  in: ['US-CA-067', 'US-CA-077'] },
  { t: 'Yolo Bypass WA',          lat: 38.55, lng: -121.60,  in: ['US-CA-113'] },
  { t: 'Gray Lodge WA',           lat: 39.31, lng: -121.84,  in: ['US-CA-007'] },
  { t: 'Sacramento NWR',          lat: 39.42, lng: -122.18,  in: ['US-CA-021'] },
  { t: 'Colusa NWR',              lat: 39.18, lng: -122.06,  in: ['US-CA-011'] },
  { t: 'Sutter NWR',              lat: 39.03, lng: -121.75,  in: ['US-CA-101'] },
  { t: 'San Luis NWR',            lat: 37.15, lng: -120.85,  in: ['US-CA-047'] },
  { t: 'Merced NWR',              lat: 37.19, lng: -120.62,  in: ['US-CA-047'] },
  { t: 'Kern NWR',                lat: 35.75, lng: -119.60,  in: ['US-CA-029'] },
  { t: 'Sonny Bono Salton Sea NWR', lat: 33.18, lng: -115.62, in: ['US-CA-025'] },
  { t: 'Tule Lake NWR',           lat: 41.90, lng: -121.55,  in: ['US-CA-093', 'US-CA-049'] },
];

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
