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
import { COUNTY_SHAPES } from '../data/county-shapes.js';
import { COUNTIES } from '../data/counties.js';
import { COASTLINE, RIVERS, LAKES, ROADS, PARKS } from '../data/basemap.js';
import { countyCentroid } from '../model/geo.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function path(d, cls) {
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('class', cls);
  return p;
}

/**
 * Append the landmark backdrop to an SVG, clipped to the county silhouette.
 * `id` must be unique per SVG (it names the clipPath). Returns the <g> so a
 * caller can toggle it. Idempotent-ish: pass a fresh id per map instance.
 */
export function appendBasemap(svg, id = 'bm') {
  // Clip everything to the union of county shapes, so landmarks never spill
  // into the empty ocean / out-of-region background.
  const defs = document.createElementNS(SVG_NS, 'defs');
  const clip = document.createElementNS(SVG_NS, 'clipPath');
  clip.setAttribute('id', id);
  for (const code of Object.keys(COUNTY_SHAPES)) clip.append(path(COUNTY_SHAPES[code], 'clip-c'));
  defs.append(clip);
  svg.append(defs);

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('class', 'basemap');
  g.setAttribute('clip-path', `url(#${id})`);
  g.setAttribute('aria-hidden', 'true');
  // Fills first (parks, lakes), then lines over them (rivers, coast, roads).
  for (const d of PARKS) g.append(path(d, 'bm-park'));
  for (const d of LAKES) g.append(path(d, 'bm-lake'));
  for (const d of RIVERS) g.append(path(d, 'bm-river'));
  for (const d of COASTLINE) g.append(path(d, 'bm-coast'));
  for (const d of ROADS) g.append(path(d, 'bm-road'));
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
export function appendCountyLabels(svg, codes = Object.keys(COUNTY_SHAPES)) {
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
    t.textContent = name;
    g.append(t);
  }
  svg.append(g);
  return g;
}
