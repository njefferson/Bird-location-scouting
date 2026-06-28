// =============================================================================
// HABITAT VOCABULARY
// =============================================================================
// The canonical habitat keys shared by hotspots (which habitats a place has)
// and species (how strongly a bird associates with each). Keep this list and
// the keys used in species.js / hotspots.js in sync.
// =============================================================================

export const HABITATS = {
  riparian:  { label: 'Riparian',         blurb: 'River woodland: cottonwood/willow gallery along the American River.' },
  oak:       { label: 'Oak woodland',     blurb: 'Blue/valley oak savanna and foothill oak — the box’s dominant habitat.' },
  lake:      { label: 'Open water',       blurb: 'Reservoirs and the river itself: Folsom, Natoma, deep American River.' },
  marsh:     { label: 'Freshwater marsh', blurb: 'Tules, cattails and pond edges — Mather, Effie Yeaw sloughs.' },
  chaparral: { label: 'Foothill scrub',   blurb: 'Chamise/manzanita chaparral and brushy edges in the lower foothills.' },
  conifer:   { label: 'Montane conifer',  blurb: 'Pine/fir at the NE corner around Sly Park / Pollock Pines.' },
  grassland: { label: 'Grassland',        blurb: 'Annual grassland and oak savanna openings; raptor and meadowlark country.' },
  urban:     { label: 'Park / edge',      blurb: 'Mowed parkland, picnic areas and suburban edge habitat.' },
};

export const HABITAT_KEYS = Object.keys(HABITATS);
