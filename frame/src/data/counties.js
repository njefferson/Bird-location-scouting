// =============================================================================
// COUNTY VOCABULARY — every county the planner can cover: all 58 California
// counties, the 5 Nevada counties ringing Lake Tahoe / Reno, and the 5
// Greater-Yellowstone counties (WY/MT/ID — data-only for now, see below).
// =============================================================================
// Keys are eBird region codes (US-<state>-<3-digit county FIPS>), which is also
// how the per-county data files are named (data/counties/<code>.json) and how
// the live-overlay region queries are addressed. Used by:
//   - scripts/build-counties.mjs  (which counties to enumerate + how deep)
//   - the app's region model      (loading county data, naming)
//   - (v13) the county-picker map (tap a county → toggle its code)
//
// `depth` = how many top-coverage hotspots the build keeps for that county.
// Featured counties (home turf + Humboldt + the Yosemite pair) keep EVERY
// hotspot (depth Infinity — slice(0, Infinity) keeps all): ~184/216/359/585
// each per the July 2026 census, so field spots like Ice House Reservoir make
// the cut. Statewide default stays shallow to keep the data and eBird load
// small. The data itself lands with the next "Refresh eBird data" run (needs a
// live EBIRD_COOKIE) — a scoped run (a `scope: US-CA-043 ...` line in the
// trigger COMMIT MESSAGE) rebuilds just the named counties in minutes, not hours.
// =============================================================================

export const DEFAULT_DEPTH = 15;
export const FULL_DEPTH = Infinity; // "all of them" — see note above

export const COUNTIES = {
  // --- California --------------------------------------------------------
  'US-CA-001': { name: 'Alameda' },
  'US-CA-003': { name: 'Alpine' },
  'US-CA-005': { name: 'Amador' },
  'US-CA-007': { name: 'Butte' },
  'US-CA-009': { name: 'Calaveras' },
  'US-CA-011': { name: 'Colusa' },
  'US-CA-013': { name: 'Contra Costa' },
  'US-CA-015': { name: 'Del Norte' },
  'US-CA-017': { name: 'El Dorado', depth: FULL_DEPTH },
  'US-CA-019': { name: 'Fresno' },
  'US-CA-021': { name: 'Glenn' },
  'US-CA-023': { name: 'Humboldt', depth: FULL_DEPTH },
  'US-CA-025': { name: 'Imperial' },
  'US-CA-027': { name: 'Inyo' },
  'US-CA-029': { name: 'Kern' },
  'US-CA-031': { name: 'Kings' },
  'US-CA-033': { name: 'Lake' },
  'US-CA-035': { name: 'Lassen' },
  'US-CA-037': { name: 'Los Angeles' },
  'US-CA-039': { name: 'Madera' },
  'US-CA-041': { name: 'Marin' },
  'US-CA-043': { name: 'Mariposa', depth: FULL_DEPTH },   // Yosemite Valley side (v37)
  'US-CA-045': { name: 'Mendocino' },
  'US-CA-047': { name: 'Merced' },
  'US-CA-049': { name: 'Modoc' },
  'US-CA-051': { name: 'Mono' },
  'US-CA-053': { name: 'Monterey' },
  'US-CA-055': { name: 'Napa' },
  'US-CA-057': { name: 'Nevada' },
  'US-CA-059': { name: 'Orange' },
  'US-CA-061': { name: 'Placer', depth: FULL_DEPTH },
  'US-CA-063': { name: 'Plumas' },
  'US-CA-065': { name: 'Riverside' },
  'US-CA-067': { name: 'Sacramento', depth: FULL_DEPTH },
  'US-CA-069': { name: 'San Benito' },
  'US-CA-071': { name: 'San Bernardino' },
  'US-CA-073': { name: 'San Diego' },
  'US-CA-075': { name: 'San Francisco' },
  'US-CA-077': { name: 'San Joaquin' },
  'US-CA-079': { name: 'San Luis Obispo' },
  'US-CA-081': { name: 'San Mateo' },
  'US-CA-083': { name: 'Santa Barbara' },
  'US-CA-085': { name: 'Santa Clara' },
  'US-CA-087': { name: 'Santa Cruz' },
  'US-CA-089': { name: 'Shasta' },
  'US-CA-091': { name: 'Sierra' },
  'US-CA-093': { name: 'Siskiyou' },
  'US-CA-095': { name: 'Solano' },
  'US-CA-097': { name: 'Sonoma' },
  'US-CA-099': { name: 'Stanislaus' },
  'US-CA-101': { name: 'Sutter' },
  'US-CA-103': { name: 'Tehama' },
  'US-CA-105': { name: 'Trinity' },
  'US-CA-107': { name: 'Tulare' },
  'US-CA-109': { name: 'Tuolumne', depth: FULL_DEPTH },   // Yosemite high country (v37)
  'US-CA-111': { name: 'Ventura' },
  'US-CA-113': { name: 'Yolo' },
  'US-CA-115': { name: 'Yuba' },
  // --- Nevada (Tahoe / Reno ring) ----------------------------------------
  'US-NV-005': { name: 'Douglas (NV)' },
  'US-NV-019': { name: 'Lyon (NV)' },
  'US-NV-029': { name: 'Storey (NV)' },
  'US-NV-031': { name: 'Washoe (NV)' },
  'US-NV-510': { name: 'Carson City (NV)' },
  // --- Greater Yellowstone (data captured 2026-07-18 while a cookie was live;
  // see the FULL-taxonomy fallback in build-counties.mjs — these carry EVERY
  // species, so later species-list curation needs no rebuild). NO region/map
  // UI yet: county-shapes.js + MAP_PROJECTION are California-fitted, so these
  // have no shapes and can't be picked on the map — the Yellowstone REGION is
  // a separate, larger piece of work (projection, shapes, basemap, species).
  'US-WY-029': { name: 'Park (WY)', depth: FULL_DEPTH },      // Yellowstone NE: Mammoth, Lamar, Canyon, Lake
  'US-WY-039': { name: 'Teton (WY)', depth: FULL_DEPTH },     // Yellowstone S + Grand Teton NP, Jackson
  'US-MT-031': { name: 'Gallatin (MT)', depth: FULL_DEPTH },  // West Yellowstone entrance, park NW corner
  'US-MT-067': { name: 'Park (MT)', depth: FULL_DEPTH },      // Gardiner / north entrance, Paradise Valley
  'US-ID-043': { name: 'Fremont (ID)', depth: FULL_DEPTH },   // Island Park / Harriman SP, Bechler corner
};

export function countyDepth(code) {
  return COUNTIES[code]?.depth || DEFAULT_DEPTH;
}

export const COUNTY_CODES = Object.keys(COUNTIES);

// --- Regions ----------------------------------------------------------------
// A region is a named set of counties — what the APP loads and shows. The
// build pipeline is independent of this: it pre-builds EVERY county above each
// quarter, so any county added to a region (by editing this file today, by the
// county-picker map in v13) already has real bar-chart data waiting. Regions
// only decide which county files the app fetches. (Node-safe: no browser
// globals — shared with the build scripts.)
export const REGIONS = [
  { id: 'home', name: 'Home', counties: ['US-CA-067', 'US-CA-017', 'US-CA-061'] },
  { id: 'humboldt', name: 'Humboldt', counties: ['US-CA-023'] },
  // Yosemite: Mariposa + Tuolumne hold every road-accessible park hotspot —
  // Mariposa the Valley (Yosemite Valley, Wawona, El Portal, Big Meadow) and
  // Tuolumne the high country (Tuolumne Meadows, Hetch Hetchy, Hodgdon Meadow).
  // The park's Madera/Mono portions are trail-only wilderness; those counties'
  // top spots are foothill/east-side, not the park, so they're left out to keep
  // the region park-focused. Both files are PRECACHED in sw.js (small, ~470 KB)
  // so the region works offline in a park with famously poor cell signal.
  { id: 'yosemite', name: 'Yosemite', counties: ['US-CA-043', 'US-CA-109'] },
];
