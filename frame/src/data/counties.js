// =============================================================================
// COUNTY VOCABULARY — every county the planner can cover: all 58 California
// counties plus the 5 Nevada counties ringing Lake Tahoe / Reno.
// =============================================================================
// Keys are eBird region codes (US-<state>-<3-digit county FIPS>), which is also
// how the per-county data files are named (data/counties/<code>.json) and how
// the live-overlay region queries are addressed. Used by:
//   - scripts/build-counties.mjs  (which counties to enumerate + how deep)
//   - the app's region model      (loading county data, naming)
//   - (v13) the county-picker map (tap a county → toggle its code)
//
// `depth` = how many top-coverage hotspots the build keeps for that county.
// Featured counties (home turf + Humboldt) go deeper than the statewide default.
// =============================================================================

export const DEFAULT_DEPTH = 15;

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
  'US-CA-017': { name: 'El Dorado', depth: 40 },
  'US-CA-019': { name: 'Fresno' },
  'US-CA-021': { name: 'Glenn' },
  'US-CA-023': { name: 'Humboldt', depth: 40 },
  'US-CA-025': { name: 'Imperial' },
  'US-CA-027': { name: 'Inyo' },
  'US-CA-029': { name: 'Kern' },
  'US-CA-031': { name: 'Kings' },
  'US-CA-033': { name: 'Lake' },
  'US-CA-035': { name: 'Lassen' },
  'US-CA-037': { name: 'Los Angeles' },
  'US-CA-039': { name: 'Madera' },
  'US-CA-041': { name: 'Marin' },
  'US-CA-043': { name: 'Mariposa' },
  'US-CA-045': { name: 'Mendocino' },
  'US-CA-047': { name: 'Merced' },
  'US-CA-049': { name: 'Modoc' },
  'US-CA-051': { name: 'Mono' },
  'US-CA-053': { name: 'Monterey' },
  'US-CA-055': { name: 'Napa' },
  'US-CA-057': { name: 'Nevada' },
  'US-CA-059': { name: 'Orange' },
  'US-CA-061': { name: 'Placer', depth: 40 },
  'US-CA-063': { name: 'Plumas' },
  'US-CA-065': { name: 'Riverside' },
  'US-CA-067': { name: 'Sacramento', depth: 40 },
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
  'US-CA-109': { name: 'Tuolumne' },
  'US-CA-111': { name: 'Ventura' },
  'US-CA-113': { name: 'Yolo' },
  'US-CA-115': { name: 'Yuba' },
  // --- Nevada (Tahoe / Reno ring) ----------------------------------------
  'US-NV-005': { name: 'Douglas (NV)' },
  'US-NV-019': { name: 'Lyon (NV)' },
  'US-NV-029': { name: 'Storey (NV)' },
  'US-NV-031': { name: 'Washoe (NV)' },
  'US-NV-510': { name: 'Carson City (NV)' },
};

export function countyDepth(code) {
  return COUNTIES[code]?.depth || DEFAULT_DEPTH;
}

export const COUNTY_CODES = Object.keys(COUNTIES);

// --- Regions ----------------------------------------------------------------
// A region is a named set of counties. This is the single source of truth,
// shared by the app (model/regions.js) and the build (build-counties.mjs), and
// it defines the DEFAULT BUILD SCOPE: `build-counties.mjs build` with no args
// builds exactly the counties that belong to some region here — so data stays
// proportional to where you actually go, and adding a county to a region is
// what makes the pipeline start building it. (Node-safe: no browser globals.)
export const REGIONS = [
  { id: 'home', name: 'Home', counties: ['US-CA-067', 'US-CA-017', 'US-CA-061'] },
  { id: 'humboldt', name: 'Humboldt', counties: ['US-CA-023'] },
];

/** Every county code referenced by any region (the default build scope). */
export const REGION_COUNTY_CODES = [...new Set(REGIONS.flatMap((r) => r.counties))];
