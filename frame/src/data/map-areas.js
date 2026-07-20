// =============================================================================
// MAP AREAS (v38) — one map canvas per part of the world the planner covers.
// =============================================================================
// The county map was born California-only: one generated viewBox + projection
// (county-shapes.js) shared by every consumer. Yellowstone (v38) is ~900 km
// away at a different latitude — on the CA canvas it would project far off the
// edge, and stretching one canvas to hold both would shrink California to a
// thumbnail. So each AREA carries its own generated viewBox / projection /
// county shapes, and consumers resolve the area from the region (or county)
// they're drawing. California's generated file is untouched; Yellowstone's is
// a sibling (yellowstone-shapes.js, gen-yellowstone-shapes.mjs).
//
// The COUNTY-PICKER map stays California-only on purpose: custom regions are a
// CA/NV feature; Yellowstone ships as a BUILT-IN region, so nothing needs to
// tap WY/MT/ID counties on a map.
// =============================================================================

import { MAP_VIEWBOX, MAP_PROJECTION, COUNTY_SHAPES } from './county-shapes.js';
import { YS_VIEWBOX, YS_PROJECTION, YS_SHAPES } from './yellowstone-shapes.js';
import { HAHIRA_VIEWBOX, HAHIRA_PROJECTION, HAHIRA_SHAPES } from './hahira-shapes.js';
import { PCB_VIEWBOX, PCB_PROJECTION, PCB_SHAPES } from './panamacity-shapes.js';

export const MAP_AREAS = {
  california: { viewBox: MAP_VIEWBOX, projection: MAP_PROJECTION, shapes: COUNTY_SHAPES },
  yellowstone: { viewBox: YS_VIEWBOX, projection: YS_PROJECTION, shapes: YS_SHAPES },
  // Southeast additions (v3.1) — each its own canvas, hundreds of km apart.
  hahira: { viewBox: HAHIRA_VIEWBOX, projection: HAHIRA_PROJECTION, shapes: HAHIRA_SHAPES },
  panamacity: { viewBox: PCB_VIEWBOX, projection: PCB_PROJECTION, shapes: PCB_SHAPES },
};

/** Which area a county's shape lives on (null for a code with no shape). */
export function areaOfCounty(code) {
  if (code in COUNTY_SHAPES) return 'california';
  if (code in YS_SHAPES) return 'yellowstone';
  if (code in HAHIRA_SHAPES) return 'hahira';
  if (code in PCB_SHAPES) return 'panamacity';
  return null;
}

/** Which area a region draws on — the first county decides (regions never mix
 * areas; the picker can't create a mixed one and the built-ins don't). */
export function areaOfRegion(region) {
  return areaOfCounty(region?.counties?.[0]) || 'california';
}
