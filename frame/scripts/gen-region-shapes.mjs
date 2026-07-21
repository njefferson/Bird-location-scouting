// =============================================================================
// gen-region-shapes.mjs — regenerate the county-shape module for a NEW map area
// =============================================================================
// A parameterized sibling of gen-yellowstone-shapes.mjs (the CA and YS shape
// files stay hand-tended by their own scripts; this one grows the family). Each
// AREA below is a cluster of counties ~hundreds of km from California — on the
// CA canvas they'd project far off the edge, so each gets its OWN viewBox and
// its OWN mid-latitude equirectangular projection (see src/data/map-areas.js).
// Same source, same simplification, same output shape as the YS generator;
// output is committed and shipped offline.
//
//   node scripts/gen-region-shapes.mjs            (from frame/ — builds every area)
//   node scripts/gen-region-shapes.mjs hahira     (just one)
// =============================================================================
import { writeFileSync } from 'node:fs';

const SRC = 'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json';

// Each area: the output module basename, the EXPORT prefix used in that module
// (imported by map-areas.js), its own mid-latitude, and FIPS → eBird region code.
const AREAS = {
  hahira: {
    file: 'hahira-shapes.js',
    prefix: 'HAHIRA',
    midLat: 31.0,
    label: 'the Hahira, GA cluster (Lowndes, Lanier, Brooks, Cook)',
    counties: {
      '13185': 'US-GA-185', // Lowndes — Hahira, Grand Bay WMA, Valdosta
      '13173': 'US-GA-173', // Lanier — Banks Lake NWR
      '13027': 'US-GA-027', // Brooks — Quitman
      '13075': 'US-GA-075', // Cook — Reed Bingham SP, Adel
    },
  },
  panamacity: {
    file: 'panamacity-shapes.js',
    prefix: 'PCB',
    midLat: 30.2,
    label: 'the Panama City Beach, FL cluster (Bay, Gulf, Walton)',
    counties: {
      '12005': 'US-FL-005', // Bay — Panama City Beach, St. Andrews SP, Camp Helen SP
      '12045': 'US-FL-045', // Gulf — St. Joseph Peninsula SP
      '12131': 'US-FL-131', // Walton — Grayton Beach SP, Point Washington SF
    },
  },
};

// Ramer–Douglas–Peucker line simplification on projected [x,y] rings.
function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  let maxD = 0, idx = 0;
  const [ax, ay] = pts[0], [bx, by] = pts[pts.length - 1];
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-12;
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
function ringArea(ring) {
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return Math.abs(a) / 2;
}

const res = await fetch(SRC);
if (!res.ok) { console.error(`Fetch failed: ${res.status}`); process.exit(1); }
const gj = await res.json();

const only = process.argv[2];
const areaKeys = only ? [only] : Object.keys(AREAS);
for (const key of areaKeys) {
  const area = AREAS[key];
  if (!area) { console.error(`Unknown area "${key}" — known: ${Object.keys(AREAS).join(', ')}`); process.exit(1); }
  buildArea(key, area);
}

function buildArea(key, area) {
  const { midLat, counties: WANTED, prefix, file, label } = area;
  const kx = Math.cos((midLat * Math.PI) / 180);
  const projRaw = (lng, lat) => [lng * kx, -lat];

  const feats = {};
  for (const f of gj.features) {
    const code = WANTED[String(f.id)];
    if (!code) continue;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    feats[code] = polys.map((poly) => poly.map((ring) => ring.map(([lng, lat]) => projRaw(lng, lat))));
  }
  const missing = Object.values(WANTED).filter((c) => !feats[c]);
  if (missing.length) { console.error(`[${key}] counties missing from source: ${missing.join(', ')}`); process.exit(1); }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const code in feats) for (const poly of feats[code]) for (const ring of poly) for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  const W = 1000;
  const scale = W / (maxX - minX);
  const H = Math.round((maxY - minY) * scale);
  const fit = ([x, y]) => [(x - minX) * scale, (y - minY) * scale];

  const EPS = 0.9, MIN_AREA = 4;
  const shapes = {};
  let totalPts = 0;
  for (const code in feats) {
    const parts = [];
    for (const poly of feats[code]) for (const ring of poly) {
      const fitted = rdp(ring.map(fit), EPS);
      if (fitted.length < 4 || ringArea(fitted) < MIN_AREA) continue;
      parts.push(fitted.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') + 'Z');
      totalPts += fitted.length;
    }
    shapes[code] = parts.join('');
  }

  const codes = Object.keys(shapes).sort();
  const banner = `// AUTO-GENERATED by scripts/gen-region-shapes.mjs — do not hand-edit.
// SVG path data for ${label}, projected into its OWN ${W}×${H} viewBox
// (equirectangular at mid-lat ${midLat} — NOT the California projection).
// Keyed by eBird region code, matching COUNTIES in counties.js and the
// per-county data files. Consumed via src/data/map-areas.js.
//   x = (lng·kx − minX)·scale,  y = (−lat − minY)·scale
// ${codes.length} counties, ~${totalPts} points.\n`;
  const body = codes.map((c) => `  '${c}': '${shapes[c]}',`).join('\n');
  writeFileSync(`src/data/${file}`,
    `${banner}export const ${prefix}_VIEWBOX = { w: ${W}, h: ${H} };\n\n` +
    `export const ${prefix}_PROJECTION = { kx: ${kx}, minX: ${minX}, minY: ${minY}, scale: ${scale} };\n\n` +
    `export const ${prefix}_SHAPES = {\n${body}\n};\n`);
  console.log(`[${key}] wrote src/data/${file} — ${codes.length} counties, ${totalPts} points, viewBox ${W}x${H}`);
}
