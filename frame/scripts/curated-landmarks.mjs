// =============================================================================
// curated-landmarks.mjs — the hand-curated landmark list (reservoirs & refuges)
// =============================================================================
// Shared by gen-basemap.mjs (point labels) and gen-water-shapes.mjs (real lake
// polygons from OpenStreetMap). Every entry declares the county (eBird code) it
// must fall in; both generators verify coordinates/polygons against the county
// shapes and fail loudly on a mismatch — labels stay honest.

// Natural Earth is a world dataset: it has Lake Tahoe and Shasta but not the
// reservoirs (Folsom, Natoma, Camanche…) or the wildlife refuges/preserves a
// bird photographer actually navigates by. Those get NAME LABELS at a curated
// lat/lng. HONESTY GUARD: every entry declares the county (eBird code) it must
// fall in; the build point-in-polygon checks each against the county shapes and
// FAILS if any coordinate lands in the wrong county — a label can't drift.
// Entries whose name Natural Earth already labels are dropped at build time.
export const RESERVOIRS = [
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
export const REFUGES = [
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
