// =============================================================================
// ROADMAP — planned features, shown in the About (ⓘ) panel above "What's new".
// =============================================================================
// Edit this alongside changelog.js each release: ship a feature → delete its
// entry here and describe it in the new changelog entry. Keep items short,
// user-facing, and honest — only things actually planned, in planned order.
// =============================================================================

export const ROADMAP = [
  { title: 'Pick your own target birds',
    detail: 'choose the species you actually want to photograph and have the score reflect that, instead of one fixed photoability rating for everyone — your list, your ranking.' },
  { title: 'Deeper hotspot coverage',
    detail: 'raise the per-county depth in the data build so spots like Ice House Reservoir make the cut (today only a county’s top hotspots ship; the next data refresh can go deeper).' },
  // v20 shipped the map landmarks (rivers, roads, lakes, parks, coastline),
  // county-name labels, the colour key and tap-to-explain scores. Still on the
  // list from that request: the fussier, messier land-use layers.
  { title: 'More map landmarks',
    detail: 'closed / restricted areas and school campuses on the county map, where the data is clean enough to help rather than clutter — offline like the rest of the basemap.' },
];
