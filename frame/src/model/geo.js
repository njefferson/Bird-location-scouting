// =============================================================================
// GEO — lat/lng ↔ map-viewBox math on top of the generated county shapes.
// =============================================================================
// county-shapes.js carries MAP_PROJECTION (the exact equirectangular fit used
// when the shapes were generated), so any lat/lng projects into the same
// viewBox as the county outlines. That powers:
//   - the hotspot map (ui/mapview.js): pins at real coordinates
//   - location auto-switch: "which county am I standing in?" (point-in-polygon
//     against the county outlines — coarse ~1px-simplified borders, plenty for
//     picking a region)
// =============================================================================

import { COUNTY_SHAPES, MAP_PROJECTION } from '../data/county-shapes.js';

/** Project a lat/lng into county-map viewBox coordinates → [x, y]. */
export function latLngToMap(lat, lng) {
  const { kx, minX, minY, scale } = MAP_PROJECTION;
  return [(lng * kx - minX) * scale, (-lat - minY) * scale];
}

// Parse a county's path string ('M x y L x y … Z', possibly several M…Z parts)
// into rings of [x, y] points. Cached — shapes are static.
const _rings = {};
export function countyRings(code) {
  if (_rings[code]) return _rings[code];
  const d = COUNTY_SHAPES[code];
  if (!d) return (_rings[code] = []);
  const rings = d.split('M').filter(Boolean).map((part) =>
    part.replace(/Z/g, '').split('L').map((pair) => {
      const [x, y] = pair.trim().split(/\s+/).map(Number);
      return [x, y];
    }).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1])));
  return (_rings[code] = rings);
}

// Even-odd ray cast: is viewBox point (x,y) inside any of the county's rings?
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

/** Is this lat/lng inside the given county? */
export function pointInCounty(lat, lng, code) {
  const [x, y] = latLngToMap(lat, lng);
  return inRings(x, y, countyRings(code));
}

/** ViewBox bounding box { x, y, w, h } of a set of counties (for initial zoom). */
export function countiesBBox(codes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const code of codes) for (const ring of countyRings(code)) for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if (minX === Infinity) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// --- Location auto-switch preference (v17) -----------------------------------
// Off by default: turning it on (Settings) is what triggers the browser's
// geolocation permission prompt, on the user's own tap.
const AUTO_KEY = 'frame.autoswitch';
export function autoSwitchEnabled() {
  try { return localStorage.getItem(AUTO_KEY) === '1'; } catch { return false; }
}
export function setAutoSwitch(on) {
  try { localStorage.setItem(AUTO_KEY, on ? '1' : '0'); } catch {}
}
