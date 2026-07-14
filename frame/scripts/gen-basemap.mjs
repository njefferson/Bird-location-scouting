// =============================================================================
// gen-basemap.mjs — regenerate src/data/basemap.js (orientation landmarks)
// =============================================================================
// Companion to gen-county-shapes.mjs. Downloads public-domain Natural Earth
// vectors (coastline, rivers/lakes, major roads, parks & protected lands),
// clips them to the CA + Tahoe/Reno NV extent, and projects them into the SAME
// 1000×1178 viewBox as the counties (reusing MAP_PROJECTION), so they line up
// exactly under the county shapes. Output is committed and shipped offline —
// this is a quiet orientation backdrop, deliberately coarse ("for an idea",
// not turn-by-turn). Rerun only to re-derive; the output is checked in.
//
//   node scripts/gen-basemap.mjs
// =============================================================================
import { writeFileSync } from 'node:fs';
import { MAP_PROJECTION as P, MAP_VIEWBOX as VB } from '../src/data/county-shapes.js';

const { kx, minX, minY, scale } = P;
const { w: W, h: H } = VB;
const proj = (lng, lat) => [(lng * kx - minX) * scale, (-lat - minY) * scale];

// Sources (public domain). Rivers/lakes/coastline from martynafford's mirror;
// roads/parks from nvkelso's natural-earth-vector (has North-America roads and
// US parks that martynafford's physical-only set omits).
const SRC = {
  coastline: 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_coastline.json',
  rivers:    'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_rivers_lake_centerlines.json',
  lakes:     'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/10m/physical/ne_10m_lakes.json',
  roads:     'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_roads.geojson',
  parks:     'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_parks_and_protected_lands_area.geojson',
};

// Keep only major roads — this is orientation, not navigation.
const ROAD_TYPES = new Set(['Major Highway', 'Secondary Highway', 'Beltway', 'Bypass']);
const roadKeep = (pr) => ROAD_TYPES.has(pr.type) || (typeof pr.scalerank === 'number' && pr.scalerank <= 8);

// Clip margin (viewBox pixels): keep anything just past the edge so lines run to
// the border cleanly; the SVG clipPath hides the overflow at render time.
const M = 24;
const inBox = ([x, y]) => x >= -M && x <= W + M && y >= -M && y <= H + M;

// Ramer–Douglas–Peucker on projected pixel [x,y] paths (same as counties).
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

// Split a projected line into runs that touch the box (keeping one out-of-box
// point on each side so segments reach the border instead of stopping short).
function clipLine(proj_pts) {
  const runs = [];
  let cur = [];
  for (let i = 0; i < proj_pts.length; i++) {
    const p = proj_pts[i];
    if (inBox(p)) {
      if (!cur.length && i > 0) cur.push(proj_pts[i - 1]); // reach back to border
      cur.push(p);
    } else {
      if (cur.length) { cur.push(p); runs.push(cur); cur = []; } // reach forward
    }
  }
  if (cur.length) runs.push(cur);
  return runs;
}

const fmt = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');

async function load(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

// Each geometry → array of projected pixel rings/lines.
function toLines(geom) {
  if (!geom) return [];
  const t = geom.type, c = geom.coordinates;
  if (t === 'LineString') return [c.map(([a, b]) => proj(a, b))];
  if (t === 'MultiLineString') return c.map((l) => l.map(([a, b]) => proj(a, b)));
  if (t === 'Polygon') return c.map((r) => r.map(([a, b]) => proj(a, b)));
  if (t === 'MultiPolygon') return c.flatMap((p) => p.map((r) => r.map(([a, b]) => proj(a, b))));
  return [];
}

// Build a layer of open paths (lines) or closed paths (fills).
async function layer(key, { eps, filter, close = false, minPts = 2 }) {
  const gj = await load(SRC[key]);
  const out = [];
  let pts = 0;
  for (const f of gj.features) {
    if (filter && !filter(f.properties || {})) continue;
    for (const line of toLines(f.geometry)) {
      for (const run of clipLine(line)) {
        const simp = rdp(run, eps);
        if (simp.length < minPts) continue;
        out.push(fmt(simp) + (close ? 'Z' : ''));
        pts += simp.length;
      }
    }
  }
  console.log(`  ${key}: ${out.length} paths, ${pts} points`);
  return out;
}

console.log('Fetching + projecting Natural Earth landmarks…');
const coastline = await layer('coastline', { eps: 0.8 });
const rivers    = await layer('rivers',    { eps: 0.8 });
const lakes     = await layer('lakes',     { eps: 0.7, close: true, minPts: 4 });
const roads     = await layer('roads',     { eps: 1.0, filter: roadKeep });
const parks     = await layer('parks',     { eps: 0.9, close: true, minPts: 4 });

const banner = `// AUTO-GENERATED by scripts/gen-basemap.mjs — do not hand-edit.
// Orientation landmarks (Natural Earth, public domain) projected into the same
// ${W}×${H} viewBox as county-shapes.js. A quiet offline backdrop for the maps —
// deliberately coarse. Consumed by ui/basemap.js.
`;
const arr = (name, xs) => `export const ${name} = [\n${xs.map((d) => `  '${d}',`).join('\n')}\n];\n`;
writeFileSync('src/data/basemap.js',
  banner + '\n' +
  arr('COASTLINE', coastline) + '\n' +
  arr('RIVERS', rivers) + '\n' +
  arr('LAKES', lakes) + '\n' +
  arr('ROADS', roads) + '\n' +
  arr('PARKS', parks));

const total = coastline.length + rivers.length + lakes.length + roads.length + parks.length;
console.log(`Wrote src/data/basemap.js — ${total} paths total`);
