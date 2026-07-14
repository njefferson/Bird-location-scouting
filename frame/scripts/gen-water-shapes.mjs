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
// Overpass etiquette (learned from run 3's 42× HTTP 429): identify yourself,
// ask ONCE (a single combined query — not one per reservoir), and when told to
// back off, back off in minutes, not seconds.
const UA = 'bird-location-scouting-basemap/1.0 (+https://github.com/njefferson/Bird-location-scouting)';
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
  for (let round = 0; round < 3; round++) {
    for (const url of MIRRORS) {
      try {
        console.log(`  querying ${new URL(url).host}…`);
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain', 'User-Agent': UA }, body: query });
        if (res.status === 429 || res.status === 504) {
          lastErr = new Error(`${res.status}`);
          console.log(`  ${res.status} — cooling down 75 s before the next attempt`);
          await sleep(75000);
          continue;
        }
        if (!res.ok) throw new Error(`${res.status}`);
        return await res.json();
      } catch (e) { lastErr = e; await sleep(8000); }
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

// Two transports, one matcher:
//   default      — ONE combined Overpass query (43 separate queries is what
//                  tripped the rate limiter): union the around-clauses, fetch
//                  once, match locally.
//   --from FILE  — a GeoJSONSeq of natural=water features exported from a
//                  Geofabrik extract (see gen-basemap.yml's fallback step).
//                  Deterministic bulk download; cannot be rate-limited.
const fromIdx = process.argv.indexOf('--from');
const fromFile = fromIdx > -1 ? process.argv[fromIdx + 1] : null;

const candidates = [];
function addCandidate(ringLL, name) {
  const ring = ringLL.map(([lng, lat]) => proj(lng, lat));
  const area = ringArea(ring);
  if (area < 0.5) return; // sub-pixel puddles
  candidates.push({ ring, area, name: name || '' });
}

if (fromFile) {
  console.log(`Reading water features from ${fromFile} (Geofabrik extract)…`);
  const { createReadStream } = await import('node:fs');
  const readline = await import('node:readline');
  // Only features near a curated point matter — cheap lat/lng prefilter.
  const nearAny = (lng, lat) => RESERVOIRS.some((r) => Math.abs(r.lat - lat) < 0.12 && Math.abs(r.lng - lng) < 0.15);
  const rl = readline.createInterface({ input: createReadStream(fromFile), crlfDelay: Infinity });
  let seen = 0;
  for await (const line of rl) {
    const s = line.replace(/^\x1e/, '').trim(); // RS-delimited GeoJSONSeq
    if (!s) continue;
    let f; try { f = JSON.parse(s); } catch { continue; }
    const g = f.geometry;
    if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) continue;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const first = polys[0]?.[0]?.[0];
    if (!first || !nearAny(first[0], first[1])) continue;
    seen++;
    for (const poly of polys) for (const ringLL of poly) addCandidate(ringLL, f.properties?.name);
  }
  console.log(`  ${seen} nearby water features kept`);
} else {
  const clauses = RESERVOIRS.map((r) =>
    `  way["natural"="water"](around:8000,${r.lat},${r.lng});\n  relation["natural"="water"](around:8000,${r.lat},${r.lng});`).join('\n');
  const query = `[out:json][timeout:180];\n(\n${clauses}\n);\nout geom qt;`;
  console.log(`One combined Overpass query for ${RESERVOIRS.length} waters…`);
  const res = await overpass(query);
  console.log(`  ${res.elements?.length ?? 0} water elements returned`);
  const seenEl = new Set();
  for (const el of res.elements || []) {
    const key = `${el.type}/${el.id}`;
    if (seenEl.has(key)) continue;
    seenEl.add(key);
    for (const ringLL of elementRings(el)) addCandidate(ringLL, el.tags?.name);
  }
}

const minDistTo = (px, py, ring) => {
  let d = Infinity;
  for (const [x, y] of ring) { const dd = Math.hypot(x - px, y - py); if (dd < d) d = dd; }
  return d;
};

const shapes = [];
const misses = [];
for (const r of RESERVOIRS) {
  const [px, py] = proj(r.lng, r.lat);
  let best = null;
  for (const c of candidates) {
    const nameMatch = c.name && (norm(c.name) === norm(r.t) || norm(c.name).includes(norm(r.t)) || norm(r.t).includes(norm(c.name)));
    const containsPt = inRings(px, py, [c.ring]);
    // Anonymous far-away giants must not win: without a name match or point
    // containment, a candidate only qualifies if it hugs the curated point.
    if (!nameMatch && !containsPt && minDistTo(px, py, c.ring) > 4) continue;
    const scoreVal = (nameMatch ? 2e6 : 0) + (containsPt ? 1e6 : 0) + c.area;
    if (!best || scoreVal > best.scoreVal) best = { ...c, scoreVal };
  }
  if (!best) { misses.push(`${r.t}: no water polygon near the point`); continue; }
  // Honesty check: the polygon must overlap the declared county
  // (test the curated point AND the ring centroid).
  let cx = 0, cy = 0;
  for (const [x, y] of best.ring) { cx += x; cy += y; }
  cx /= best.ring.length; cy /= best.ring.length;
  const okCounty = r.in.some((code) => ringsByCode[code] && (inRings(px, py, ringsByCode[code]) || inRings(cx, cy, ringsByCode[code])));
  if (!okCounty) { misses.push(`${r.t}: polygon landed outside ${r.in.join('/')}`); continue; }
  // eps 0.05 viewBox units ~= 45 m: smooth at the 256x zoom where one lake
  // fills the screen (0.35 was visibly angular there).
  const simp = rdp(best.ring, 0.05);
  if (simp.length < 4) { misses.push(`${r.t}: degenerate after simplify`); continue; }
  const d = simp.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') + 'Z';
  shapes.push({ t: r.t, d, pts: simp.length, osm: best.name || '(unnamed)' });
  console.log(`  ✓ ${r.t} ← OSM "${best.name || '(unnamed)'}" (${simp.length} pts)`);
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
