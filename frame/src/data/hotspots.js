// =============================================================================
// HOTSPOT LAYER (Layer A scaffold — the places)
// =============================================================================
// The top 30 eBird hotspots inside the box (lat 38.55–38.74, lng -121.32 to
// -120.53), ranked by all-time species (coverage), with REAL eBird location IDs
// pulled from /ref/hotspot/geo. Names + coordinates are eBird's; habitats are
// hand-inferred; access notes are brief local guidance.
//
// locId is REAL for every hotspot, so per-hotspot live overlays work and the
// bar-chart download maps to the correct place. This file is now the CURATED
// OVERLAY: model/regions.js loads the active region's per-county data files
// (data/counties/<code>.json, real freq + checklist counts keyed by locId) and,
// where a locId matches an entry here, attaches this hotspot's friendly id,
// habitats and access notes. freqByMonth / checklistsByMonth stay null here.
// =============================================================================

/** @typedef {import('./species.js').Habitat} Habitat */

export const BOX = {
  swLat: 38.55, swLng: -121.32,
  neLat: 38.74, neLng: -120.53,
};

export function boxCenter(box = BOX) {
  return { lat: (box.swLat + box.neLat) / 2, lng: (box.swLng + box.neLng) / 2 };
}
export function inBox(lat, lng, box = BOX) {
  return lat >= box.swLat && lat <= box.neLat && lng >= box.swLng && lng <= box.neLng;
}
// Map handoff links — BOTH providers, never just one.
// FIELD-FOUND BUG (v20, Ice House trip): the old `query=lat,lng(Label)` hybrid
// is a dead syntax. Google silently DROPS the coordinates, text-searches the
// label, and can land 40 km away ("Granite Springs Rd"). The official URL APIs
// accept coordinates OR text, never both mixed:
//   Google Maps URL API:  /maps/search/?api=1&query=<lat>%2C<lng>   (exact pin)
//   Apple Maps:           /?ll=<lat>,<lng>&q=<name>  (q labels the ll pin)
export function hotspotMapLinks(h) {
  return {
    apple: `https://maps.apple.com/?ll=${h.lat},${h.lng}&q=${encodeURIComponent(h.name)}`,
    google: `https://www.google.com/maps/search/?api=1&query=${h.lat}%2C${h.lng}`,
  };
}

const ARP = 'American River Parkway access. County regional park; paid parking at most lots; paved bike path + dirt river-edge trails. Dawn best.';
const FOLSOM = 'Folsom Lake State Rec Area. Day-use entry fee. Open water plus oak/grassland shoreline — bring reach, birds are often far out.';
const NATOMA = 'Lake Natoma (State Rec Area). Calm water for grebes, cormorants, Osprey and wintering ducks; day-use fee at developed accesses.';
const FOOTHILL = 'Foothill grassland & oak roadside birding (El Dorado / Sacramento Co. line). Raptors, meadowlarks, quail, bluebirds.';

export const HOTSPOTS = [
  { id: 'beals-point', name: 'Folsom Lake SRA — Beals Point', locId: 'L370941', lat: 38.721, lng: -121.167, county: 'US-CA-067', habitats: ['lake', 'oak', 'grassland'], access: FOLSOM, freqByMonth: null, checklistsByMonth: null },
  { id: 'sailor-bar', name: 'American River Parkway — Sailor Bar', locId: 'L225847', lat: 38.634, lng: -121.236, county: 'US-CA-067', habitats: ['riparian', 'lake', 'grassland'], access: ARP, freqByMonth: null, checklistsByMonth: null },
  { id: 'folsom-point', name: 'Folsom Lake SRA — Folsom Point', locId: 'L370942', lat: 38.699, lng: -121.127, county: 'US-CA-067', habitats: ['lake', 'oak', 'grassland'], access: FOLSOM, freqByMonth: null, checklistsByMonth: null },
  { id: 'nimbus-hatchery', name: 'ARP — Nimbus Fish Hatchery to Upper Sunrise', locId: 'L374927', lat: 38.634, lng: -121.225, county: 'US-CA-067', habitats: ['riparian', 'lake'], access: ARP, freqByMonth: null, checklistsByMonth: null },
  { id: 'mather-lake', name: 'Mather Lake', locId: 'L459813', lat: 38.555, lng: -121.256, county: 'US-CA-067', habitats: ['marsh', 'lake', 'grassland', 'oak'], access: 'Mather-area marsh & open water — the best tule marsh in the box. Herons, rails, blackbirds, raptors over grassland. County park, low/no fee.', freqByMonth: null, checklistsByMonth: null },
  { id: 'sacramento-bar', name: 'American River Parkway — Sacramento Bar', locId: 'L225843', lat: 38.628, lng: -121.282, county: 'US-CA-067', habitats: ['riparian', 'lake'], access: ARP, freqByMonth: null, checklistsByMonth: null },
  { id: 'ancil-hoffman', name: 'ARP — Ancil Hoffman Park', locId: 'L225811', lat: 38.612, lng: -121.307, county: 'US-CA-067', habitats: ['riparian', 'oak'], access: ARP + ' Oak woodland + river; adjacent to Effie Yeaw.', freqByMonth: null, checklistsByMonth: null },
  { id: 'upper-sunrise', name: 'American River Parkway — Upper Sunrise', locId: 'L225853', lat: 38.634, lng: -121.248, county: 'US-CA-067', habitats: ['riparian', 'lake'], access: ARP, freqByMonth: null, checklistsByMonth: null },
  { id: 'lake-natoma', name: 'Lake Natoma', locId: 'L469761', lat: 38.645, lng: -121.196, county: 'US-CA-067', habitats: ['lake', 'riparian'], access: NATOMA, freqByMonth: null, checklistsByMonth: null },
  { id: 'mississippi-bar', name: 'Mississippi Bar', locId: 'L4003339', lat: 38.650, lng: -121.203, county: 'US-CA-067', habitats: ['riparian', 'lake', 'oak'], access: 'Lower American River / Lake Natoma north side. Oak savanna meets shoreline; free dirt lots, quiet trails.', freqByMonth: null, checklistsByMonth: null },
  { id: 'effie-yeaw', name: 'ARP — Effie Yeaw Nature Center', locId: 'L200506', lat: 38.617, lng: -121.312, county: 'US-CA-067', habitats: ['riparian', 'oak', 'marsh'], access: 'Nature preserve in Ancil Hoffman Park (Carmichael). Vehicle fee; flat dirt loops. Famous for Wood Duck, deer, confiding oak-woodland birds. Dawn best.', freqByMonth: null, checklistsByMonth: null },
  { id: 'lower-sunrise', name: 'American River Parkway — Lower Sunrise', locId: 'L225850', lat: 38.627, lng: -121.275, county: 'US-CA-067', habitats: ['riparian', 'lake'], access: ARP, freqByMonth: null, checklistsByMonth: null },
  { id: 'deer-creek-bridge', name: 'Deer Creek Bridge — Latrobe / Cothrin Ranch Rd.', locId: 'L3305338', lat: 38.601, lng: -121.023, county: 'US-CA-017', habitats: ['grassland', 'oak', 'riparian'], access: FOOTHILL, freqByMonth: null, checklistsByMonth: null },
  { id: 'snipes-pershing', name: 'Folsom Lake SRA — Snipes-Pershing Ravine', locId: 'L12317874', lat: 38.666, lng: -121.194, county: 'US-CA-067', habitats: ['oak', 'lake', 'chaparral'], access: FOLSOM + ' Oak/chaparral ravine + bluffs.', freqByMonth: null, checklistsByMonth: null },
  { id: 'payen-ed', name: 'Payen Rd. (El Dorado Co.)', locId: 'L1350365', lat: 38.613, lng: -121.069, county: 'US-CA-017', habitats: ['grassland', 'oak'], access: FOOTHILL, freqByMonth: null, checklistsByMonth: null },
  { id: 'bass-lake-ed', name: 'Bass Lake (El Dorado Co.)', locId: 'L479842', lat: 38.678, lng: -121.021, county: 'US-CA-017', habitats: ['lake', 'oak', 'grassland'], access: 'Foothill reservoir + oak woodland (El Dorado Hills). Trail loop; waterbirds plus oak-woodland species.', freqByMonth: null, checklistsByMonth: null },
  { id: 'rossmoor-bar', name: 'American River Parkway — Rossmoor Bar', locId: 'L225848', lat: 38.623, lng: -121.295, county: 'US-CA-067', habitats: ['riparian', 'lake'], access: ARP, freqByMonth: null, checklistsByMonth: null },
  { id: 'sly-park', name: 'Sly Park Rec Area (Jenkinson Lake)', locId: 'L486310', lat: 38.721, lng: -120.563, county: 'US-CA-017', habitats: ['conifer', 'lake', 'oak'], access: 'Montane NE corner (~3,500 ft, Pollock Pines). Vehicle fee. Pine/fir around Jenkinson Lake — the only conifer site in the box (Steller’s Jay, etc.). Snow possible in winter.', freqByMonth: null, checklistsByMonth: null },
  { id: 'willow-springs', name: 'Willow Springs Reservoir Park', locId: 'L6380007', lat: 38.653, lng: -121.144, county: 'US-CA-017', habitats: ['lake', 'oak', 'grassland'], access: 'Suburban-edge reservoir park (El Dorado Hills). Open water + oak edge; easy paved access.', freqByMonth: null, checklistsByMonth: null },
  { id: 'pennsylvania-ave', name: 'ARP — Pennsylvania Ave. access', locId: 'L2041730', lat: 38.633, lng: -121.272, county: 'US-CA-067', habitats: ['riparian', 'lake'], access: ARP, freqByMonth: null, checklistsByMonth: null },
  { id: 'young-wo', name: 'Lake Natoma — Young Wo Cir. access', locId: 'L873108', lat: 38.672, lng: -121.188, county: 'US-CA-067', habitats: ['lake', 'riparian'], access: NATOMA, freqByMonth: null, checklistsByMonth: null },
  { id: 'nimbus-flat', name: 'Lake Natoma — Nimbus Flat access', locId: 'L1041983', lat: 38.636, lng: -121.216, county: 'US-CA-067', habitats: ['lake', 'riparian'], access: NATOMA + ' Closest paved water access; good for diving ducks & Osprey.', freqByMonth: null, checklistsByMonth: null },
  { id: 'sailor-bar-olive', name: 'ARP — Sailor Bar, Olive Ave. access', locId: 'L1328770', lat: 38.639, lng: -121.250, county: 'US-CA-067', habitats: ['riparian', 'lake'], access: ARP, freqByMonth: null, checklistsByMonth: null },
  { id: 'folsom-peninsula', name: 'Folsom Lake SRA — Peninsula', locId: 'L1858179', lat: 38.736, lng: -121.126, county: 'US-CA-061', habitats: ['lake', 'oak', 'grassland'], access: FOLSOM + ' Remote NE arm; long but birdy oak/grassland approach.', freqByMonth: null, checklistsByMonth: null },
  { id: 'n-mather-wetland', name: 'N Mather Dr. — wetland', locId: 'L796889', lat: 38.569, lng: -121.279, county: 'US-CA-067', habitats: ['marsh', 'grassland'], access: 'Mather-area seasonal wetland & grassland. Shorebirds, waterfowl, raptors; roadside viewing.', freqByMonth: null, checklistsByMonth: null },
  { id: 'black-miners-bar', name: 'Lake Natoma — Black Miners Bar', locId: 'L386465', lat: 38.680, lng: -121.186, county: 'US-CA-067', habitats: ['lake', 'riparian', 'oak'], access: NATOMA, freqByMonth: null, checklistsByMonth: null },
  { id: 'soil-born-farms', name: 'Soil Born Farms', locId: 'L3328558', lat: 38.598, lng: -121.317, county: 'US-CA-067', habitats: ['riparian', 'oak', 'grassland'], access: 'American River bottomland farm & riparian edge (Rancho Cordova). Free; trail access off Chase Dr.', freqByMonth: null, checklistsByMonth: null },
  { id: 'sailor-bar-pond', name: 'ARP — Sailor Bar, fish pond area', locId: 'L1132427', lat: 38.641, lng: -121.237, county: 'US-CA-067', habitats: ['riparian', 'lake', 'marsh'], access: ARP + ' Ponds add marsh/waterbird variety.', freqByMonth: null, checklistsByMonth: null },
  { id: 'browns-landing', name: 'Brown’s Landing (Folsom Lake)', locId: 'L969163', lat: 38.712, lng: -121.094, county: 'US-CA-017', habitats: ['lake', 'oak'], access: 'Folsom Lake south-shore access (El Dorado Hills side). Open water + oak; quieter than the main day-use areas.', freqByMonth: null, checklistsByMonth: null },
  { id: 'payen-sac', name: 'Payen Rd. (Sacramento Co.)', locId: 'L479841', lat: 38.617, lng: -121.080, county: 'US-CA-067', habitats: ['grassland', 'oak'], access: FOOTHILL, freqByMonth: null, checklistsByMonth: null },
];


export const HOTSPOTS_BY_ID = Object.fromEntries(HOTSPOTS.map((h) => [h.id, h]));
