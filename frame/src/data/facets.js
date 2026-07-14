// =============================================================================
// FACET VOCABULARY (Layer B, v23) — the objective replacement for photoability
// =============================================================================
// Four hand-curated, CHECKABLE facets per species, keyed by the same eBird
// common name as everything else. These are FACTS about the bird, not a
// judgement of how "shootable" it is — the old subjective 0–1 photoability is
// gone. The UI renders them as tappable icons that double as tri-state filters
// (see model/facets.js) and as per-site brightness rows (a guild is "bright"
// at a hotspot when its birds are actually present there this month).
//
//   guild     — what KIND of bird (12 groups; the section headers in species.js)
//   size      — rough scale by wingspan, tiny songbird → condor (5 bands)
//   nest      — Wingspan-style nesting style (bowl/cavity/ground/platform/wild)
//   behavior  — how it presents in the field: open / mixed / skulker
//               (this is the honest, factual half of what photoability used to
//                smuggle in — a likelihood of being seen, never a promise)
//
// Icons are inline-SVG INNER markup (paths only). Wrap with facetSvg(inner,size)
// so one glyph serves the 22px card rows and the 20px table/mini rows. Stroke =
// currentColor, so the icon's colour is driven entirely by CSS state classes.
// =============================================================================

/** Wrap facet icon inner-markup in a sized <svg>. */
export function facetSvg(inner, size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

// --- GUILD (bird type) ------------------------------------------------------
export const GUILDS = {
  wader:       { key: 'wader',       label: 'Waders',           blurb: 'Herons, egrets, ibis, cranes, bitterns and rails — long-legged birds that stalk shallows and marsh edges.',
    icon: '<path d="M20 5.4 17 5q-4 1.6-3 5"/><ellipse cx="13.6" cy="12.4" rx="2.4" ry="1.7"/><path d="M12.6 14l-1 6M14.8 14l.6 6"/>' },
  waterfowl:   { key: 'waterfowl',   label: 'Waterfowl',        blurb: 'Ducks, geese, swans, mergansers, grebes, coots and loons — birds that float on open water.',
    icon: '<path d="M4 18h16"/><path d="M5 15q1 3 6 3 5 0 6-4"/><circle cx="17" cy="11" r="1.6"/><path d="M18.5 11.4 21 12"/>' },
  raptor:      { key: 'raptor',      label: 'Raptors & owls',   blurb: 'Hawks, eagles, kites, falcons, harriers, vultures and owls — birds of prey, perched or soaring.',
    icon: '<path d="M3 12c4 .4 5-2.6 9-2.6s5 3 9 2.6"/><path d="M12 9.4V7"/><path d="M12 9.4v3.4"/>' },
  shorebird:   { key: 'shorebird',   label: 'Shorebirds',       blurb: 'Plovers, sandpipers, stilts, avocets, curlews and godwits — birds that probe mud and tideline.',
    icon: '<circle cx="11.5" cy="10" r="2.2"/><path d="M13.4 8.7q3 .3 3.6 3.4"/><path d="M10.5 12l-.6 6M12.5 12l.6 6"/>' },
  seabird:     { key: 'seabird',     label: 'Gulls & seabirds', blurb: 'Gulls, terns, pelicans, cormorants and alcids — birds of the coast and open water.',
    icon: '<path d="M3 9q4.5 2.6 9 0M21 9q-4.5 2.6-9 0"/><path d="M4 16q8 3 16 0"/>' },
  gamebird:    { key: 'gamebird',    label: 'Gamebirds',        blurb: 'Turkeys and quail — plump ground birds that walk in the open.',
    icon: '<path d="M6 18q0-6 6-6 5 0 5 5"/><path d="M6 18h11"/><circle cx="15" cy="9.6" r="1.4"/><path d="M15 8.2q1.2-2 0-3.6"/>' },
  dove:        { key: 'dove',        label: 'Doves & pigeons',  blurb: 'Mourning Dove, collared-dove and band-tailed pigeon — plump, small-headed birds of wires and edges.',
    icon: '<ellipse cx="12" cy="12" rx="4" ry="2.6"/><circle cx="16.4" cy="9.8" r="1.5"/><path d="M8 12 4.5 15"/><path d="M4 18h16"/>' },
  woodpecker:  { key: 'woodpecker',  label: 'Woodpeckers',      blurb: 'Woodpeckers, flickers and sapsuckers — birds that cling to trunks and drum on snags.',
    icon: '<path d="M7 4v15"/><path d="M7 9q5-1 5 3.2 0 3-3 3.6"/><path d="M7 9 4.6 7.4"/>' },
  aerial:      { key: 'aerial',      label: 'Swallows & swifts', blurb: 'Swallows and swifts — aerial hunters with swept wings and forked tails.',
    icon: '<path d="M12 9q-6-3-9 .5M12 9q6-3 9 .5"/><path d="M12 9 9.8 15 12 13.2 14.2 15z"/>' },
  hummingbird: { key: 'hummingbird', label: 'Hummingbird',      blurb: "Anna's Hummingbird — tiny, hovering, needle-billed.",
    icon: '<ellipse cx="13" cy="12.5" rx="2.4" ry="1.5" transform="rotate(-18 13 12.5)"/><path d="M15 10.6 19.5 8"/><path d="M9.5 13.4 6.5 16"/><path d="M8.6 10.4q-2 2.2 0 4.4"/>' },
  kingfisher:  { key: 'kingfisher',  label: 'Kingfisher',       blurb: 'Belted Kingfisher — big-headed, crested, dagger-billed hunter over water.',
    icon: '<path d="M9 8q4.4-1 5.4 3.2Q15 15 12 17"/><path d="M9 8q-1-1.8 0-3.4M11.2 6.8q0-2 1.1-3.4"/><path d="M9 10 4.6 9"/>' },
  songbird:    { key: 'songbird',    label: 'Songbirds',        blurb: 'Flycatchers, jays, sparrows, finches, warblers, blackbirds, thrushes and more — the perching birds.',
    icon: '<path d="M9 16q0-5 4-5 3 0 3 3l3-2-2 3q0 3.4-4 3.4"/><path d="M8.4 11 6.2 9.2"/><path d="M11 18.4v-1.8M13 18.4v-1.8"/>' },
};

// --- SIZE (by wingspan) -----------------------------------------------------
// Same perched-bird silhouette at five stepped scales — the SHAPE size is the
// signal, so the bands read in greyscale, not just by colour.
const SIZE_BIRD = '<path fill="currentColor" stroke="none" d="M4 13.2c0-3 2.1-5 5-5 1.6 0 2.9.7 3.7 1.8L18 8.2l-3.6 3.2c.3.6.5 1.3.5 2 0 2.9-2.4 4.2-5.2 4.2C6.9 17.8 4 16.4 4 13.2z"/>';
const sizeGlyph = (k) => `<g transform="translate(12 13) scale(${k}) translate(-11 -13)">${SIZE_BIRD}</g>`;
export const SIZES = {
  xs: { key: 'xs', label: 'Tiny',       band: 'wingspan under 25 cm',  blurb: 'Tiny — hummingbird, kinglet, bushtit scale.',   icon: sizeGlyph(0.4) },
  s:  { key: 's',  label: 'Small',      band: 'wingspan 25–45 cm',     blurb: 'Small songbird — sparrow, phoebe, peep scale.',  icon: sizeGlyph(0.58) },
  m:  { key: 'm',  label: 'Medium',     band: 'wingspan 45–90 cm',     blurb: 'Medium — crow, duck, kingfisher, quail scale.',  icon: sizeGlyph(0.76) },
  l:  { key: 'l',  label: 'Large',      band: 'wingspan 90–150 cm',    blurb: 'Large — egret, hawk, goose, gull scale.',        icon: sizeGlyph(0.94) },
  xl: { key: 'xl', label: 'Very large', band: 'wingspan over 150 cm',  blurb: 'Very large — eagle, pelican, crane, swan, condor scale.', icon: sizeGlyph(1.14) },
};

// --- NEST (Wingspan-style) --------------------------------------------------
export const NESTS = {
  bowl:     { key: 'bowl',     label: 'Bowl',     blurb: 'Cup nest woven in a fork or shrub — most songbirds.',
    icon: '<path d="M5 12.5q7 6 14 0"/><path d="M5 12.5q0-2 2-2M17 10.5q2 0 2 2"/><circle cx="10" cy="13.4" r="1"/><circle cx="13.2" cy="13.6" r="1"/>' },
  cavity:   { key: 'cavity',   label: 'Cavity',   blurb: 'Nests in a hole — woodpeckers, chickadees, bluebirds, some ducks.',
    icon: '<rect x="7" y="3.5" width="10" height="17" rx="1.4"/><circle cx="12" cy="11" r="2.8"/>' },
  ground:   { key: 'ground',   label: 'Ground',   blurb: 'Scrape or mound on the ground — ducks, shorebirds, quail, gulls.',
    icon: '<path d="M4 17h16"/><path d="M7 17q5 3 10 0"/><circle cx="11" cy="16" r="1"/><circle cx="13.5" cy="16.2" r="1"/>' },
  platform: { key: 'platform', label: 'Platform', blurb: 'Stick platform — herons, raptors, cormorants, doves.',
    icon: '<path d="M4 14h16M5.5 17h13"/><path d="M6.5 14 5.5 17M12 14v3M17.5 14l1 3"/><circle cx="10" cy="12.6" r="1"/><circle cx="13" cy="12.6" r="1"/>' },
  wild:     { key: 'wild',     label: 'Wild card', blurb: 'Burrow, mud, cliff, brood-parasite or no real nest — kingfisher, Burrowing Owl, cowbird, swifts.',
    icon: '<path d="M12 4l2.3 4.8 5.2.6-3.9 3.6 1 5.1L12 15.9 7.4 18.7l1-5.1L4.5 9.4l5.2-.6z"/>' },
};

// --- BEHAVIOR (field presentation) ------------------------------------------
export const BEHAVIORS = {
  open:    { key: 'open',    label: 'In the open', blurb: 'Perches or feeds exposed and predictable — you can usually get on it.',
    icon: '<path d="M2.5 12q9.5-7.5 19 0M2.5 12q9.5 7.5 19 0"/><circle cx="12" cy="12" r="3"/>' },
  mixed:   { key: 'mixed',   label: 'In and out',  blurb: 'Uses cover but shows regularly — patience is usually rewarded.',
    icon: '<path d="M2.5 12q9.5-7.5 19 0"/><path d="M2.5 12q9.5 7.5 19 0" stroke-dasharray="2.4 2.4"/><circle cx="12" cy="12" r="2.6"/>' },
  skulker: { key: 'skulker', label: 'Skulker',     blurb: 'Stays buried in cover — brief, chancy appearances.',
    icon: '<path d="M12 20.5v-6.5"/><path d="M12 14q-5.5 0-6.5-5.5Q11 8.5 12 14zM12 14q5.5 0 6.5-5.5Q13 8.5 12 14z"/>' },
};

// Ordered registry the UI iterates. `values` is the vocab map above.
export const FACETS = [
  { key: 'guild',    label: 'Type',     values: GUILDS },
  { key: 'size',     label: 'Size',     values: SIZES },
  { key: 'nest',     label: 'Nest',     values: NESTS },
  { key: 'behavior', label: 'Behavior', values: BEHAVIORS },
];

export const GUILD_KEYS = Object.keys(GUILDS);

/** The vocab entry for a species' value on a facet, or null. */
export function facetEntry(facetKey, s) {
  const facet = FACETS.find((f) => f.key === facetKey);
  if (!facet) return null;
  return facet.values[s[facetKey]] || null;
}

/**
 * The four facet chips for one species: [{ facet, key, label, blurb, icon }].
 * Used by the species panel and the hotspot detail table (informational).
 */
export function speciesFacetIcons(s) {
  return FACETS.map((f) => {
    const v = f.values[s[f.key]];
    return v ? { facet: f.key, facetLabel: f.label, key: v.key, label: v.label, blurb: v.blurb, icon: v.icon } : null;
  }).filter(Boolean);
}
