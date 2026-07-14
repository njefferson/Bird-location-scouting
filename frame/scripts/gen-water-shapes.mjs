// =============================================================================
// gen-water-shapes.mjs — real lake/reservoir polygons for the curated waters
// =============================================================================
// Natural Earth (world-scale) has no shoreline for Folsom, Ice House, Union
// Valley & co. — you could label them but never SEE them. OpenStreetMap has
// them all. This fetches each curated reservoir's water polygon from Overpass,
// projects it into the county viewBox, simplifies it, VERIFIES it sits in the
// declared county, and writes src/data/water-shapes.js.
//
// Runs on a GitHub Actions runner (.github/workflows/gen-basemap.yml —
// push-to-trigger via .github/trigger/gen-basemap): the app sandbox can't
// reach OSM, runners can. Data © OpenStreetMap contributors (ODbL) — keep the
// attribution in the About panel and README when touching this.
//
//   node scripts/gen-water-shapes.mjs        (from frame/)
// =============================================================================
import { writeFileSync } from 'node:fs';
import { RESERVOIRS } from './curated-landmarks.mjs';
import { MAP_PROJECTION as P, MAP_VIEWBOX as VB, COUNTY_SHAPES } from '../src/data/county-shapes.js';

const { kx, minX, minY, scale } = P;
const { w: W, h: H } = VB;
const proj = (lng, lat) => [(lng * kx - minX) * scale, (-lat - minY) * scale];

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const DELAY_MS = 1200; // courtesy pause between queries — a one-off batch of ~40
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- county rings for the honesty check --------------------------------------
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

function ringArea(ring) { // signed shoelace on projected coords
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  return Math.abs(a) / 2;
}

async function overpass(query) {
  let lastErr;
  for (const url of MIRRORS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: query });
        if (res.status === 429 || res.status === 504) { lastErr = new Error(`${res.status}`); await sleep(5000); continue; }
        if (!res.ok) throw new Error(`${res.status}`);
        return await res.json();
      } catch (e) { lastErr = e; await sleep(2500); }
    }
  }
  throw lastErr || new Error('all mirrors failed');
}

// Rings (arrays of [lng,lat]) from an Overpass element (way with geometry, or
// multipolygon relation: outer members stitched end-to-end where they chain).
function elementRings(el) {
  if (el.type === 'way' && el.geometry) {
    return [el.geometry.map((g) => [g.lon, g.lat])];
  }
  if (el.type === 'relation' && el.members) {
    const outers = el.members.filter((m) => m.role !== 'inner' && m.geometry);
    const segs = outers.map((m) => m.geometry.map((g) => [g.lon, g.lat]));
    // Stitch open segments into closed rings.
    const rings = [];
    const pool = segs.slice();
    while (pool.length) {
      let ring = pool.shift();
      let extended = true;
      while (extended && ring.length) {
        extended = false;
        const [hx, hy] = ring[0], [tx, ty] = ring[ring.length - 1];
        if (Math.abs(hx - tx) < 1e-7 && Math.abs(hy - ty) < 1e-7) break; // closed
        for (let i = 0; i < pool.length; i++) {
          const s = pool[i], [sx, sy] = s[0], [ex, ey] = s[s.length - 1];
          if (Math.abs(tx - sx) < 1e-7 && Math.abs(ty - sy) < 1e-7) { ring = ring.concat(s.slice(1)); pool.splice(i, 1); extended = true; break; }
          if (Math.abs(tx - ex) < 1e-7 && Math.abs(ty - ey) < 1e-7) { ring = ring.concat(s.slice(0, -1).reverse()); pool.splice(i, 1); extended = true; break; }
        }
      }
      if (ring.length > 3) rings.push(ring);
    }
    return rings;
  }
  return [];
}

const norm = (s) => (s || '').toLowerCase().replace(/\b(reservoir|res\.?|lake|the)\b/g, '').replace(/[^a-z]/g, '');

const shapes = [];
const misses = [];
for (const r of RESERVOIRS) {
  const q = `[out:json][timeout:45];
(
  way["natural"="water"](around:8000,${r.lat},${r.lng});
  relation["natural"="water"](around:8000,${r.lat},${r.lng});
);
out geom qt;`;
  try {
    const res = await overpass(q);
    const [px, py] = proj(r.lng, r.lat);
    let best = null;
    for (const el of res.elements || []) {
      const nameMatch = el.tags?.name && (norm(el.tags.name) === norm(r.t) || norm(el.tags.name).includes(norm(r.t)) || norm(r.t).includes(norm(el.tags.name)));
      for (const ringLL of elementRings(el)) {
        const ring = ringLL.map(([lng, lat]) => proj(lng, lat));
        const area = ringArea(ring);
        if (area < 0.5) continue; // sub-pixel puddles
        const containsPt = inRings(px, py, [ring]);
        // Prefer: named match > contains the curated point > sheer size.
        const scoreVal = (nameMatch ? 2e6 : 0) + (containsPt ? 1e6 : 0) + area;
        if (!best || scoreVal > best.scoreVal) best = { ring, area, scoreVal, osmName: el.tags?.name || '(unnamed)' };
      }
    }
    if (!best) { misses.push(`${r.t}: no water polygon within 8 km`); continue; }
    // Honesty check: the polygon's biggest ring must overlap the declared county
    // (test the curated point AND the ring centroid).
    let cx = 0, cy = 0;
    for (const [x, y] of best.ring) { cx += x; cy += y; }
    cx /= best.ring.length; cy /= best.ring.length;
    const okCounty = r.in.some((code) => ringsByCode[code] && (inRings(px, py, ringsByCode[code]) || inRings(cx, cy, ringsByCode[code])));
    if (!okCounty) { misses.push(`${r.t}: polygon landed outside ${r.in.join('/')}`); continue; }
    const simp = rdp(best.ring, 0.35);
    if (simp.length < 4) { misses.push(`${r.t}: degenerate after simplify`); continue; }
    const d = simp.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') + 'Z';
    shapes.push({ t: r.t, d, pts: simp.length, osm: best.osmName });
    console.log(`  ✓ ${r.t} ← OSM "${best.osmName}" (${simp.length} pts)`);
  } catch (e) {
    misses.push(`${r.t}: ${e.message}`);
  }
  await sleep(DELAY_MS);
}

console.log(`\n${shapes.length}/${RESERVOIRS.length} shorelines fetched.`);
if (misses.length) console.log('Missing:\n  ' + misses.join('\n  '));
if (shapes.length < RESERVOIRS.length * 0.6) {
  console.error('Under 60% coverage — refusing to write a mostly-empty layer.');
  process.exit(1);
}

const banner = `// AUTO-GENERATED by scripts/gen-water-shapes.mjs — do not hand-edit.
// Real shorelines for the curated reservoirs, fetched from OpenStreetMap
// (© OpenStreetMap contributors, ODbL) and projected into the same viewBox as
// county-shapes.js. Each polygon is verified against its declared county at
// build time. Rendered by ui/basemap.js beneath the labels.
// ${shapes.length} of ${RESERVOIRS.length} curated waters have shapes.
`;
writeFileSync('src/data/water-shapes.js',
  banner + 'export const WATER_SHAPES = [\n' +
  shapes.map((s) => `  { t: ${JSON.stringify(s.t)}, d: '${s.d}' },`).join('\n') +
  '\n];\n');
console.log(`Wrote src/data/water-shapes.js (${shapes.length} shapes)`);
