// =============================================================================
// SPECIES LAYER (Layer B — "photoability") + inputs for the inference model
// =============================================================================
//
// This file is HAND-CURATED reference data. It contains NO eBird frequency
// numbers — frequency is computed elsewhere (see ../model/inference.js) and is
// always labelled "inferred" until the batch build script swaps in real
// histogram data. The only subjective numbers here are:
//
//   photoability  — how shootable the bird is for a 375mm-equiv reach shooter
//   habitats      — which habitats the species uses, and how strongly (affinity)
//   abundance     — rough relative commonness in the box (prior for the model)
//
// PHOTOABILITY RUBRIC (0–1) — the spec's §4 "can you shoot it" axis.
// Start from 0.5 and adjust:
//   + size / fills the frame at 375mm        (heron, hawk, egret, goose)
//   + perches in the open on exposed snags    (bluebird, phoebe, kingbird)
//   + tolerant of human approach              (acorn woodpecker, scrub-jay)
//   + slow / sits still / predictable         (perched raptor, roosting heron)
//   − tiny / hyperactive / never still        (kinglet, bushtit, gnatcatcher)
//   − stays in dense cover / canopy / reeds   (wrentit, marsh wren, vireo)
//   − flushes at distance                     (rail, snipe, most shorebirds)
// These are deliberately subjective and editable. They are NOT eBird data.
//
// HABITAT KEYS (must match ../data/habitats.js):
//   riparian oak lake marsh chaparral conifer grassland urban
//
// STATUS drives the seasonal curve in inference.js:
//   resident  — present year-round
//   winter    — Nov–Mar peak (wintering)
//   summer    — Apr–Aug peak (breeding)
//   migrant   — Apr–May & Sep–Oct passage bumps
// `monthly` (optional) overrides the status curve with an explicit 12-length
// 0–1 presence array (Jan..Dec) when a species doesn't fit a tidy pattern.
// =============================================================================

/** @typedef {'riparian'|'oak'|'lake'|'marsh'|'chaparral'|'conifer'|'grassland'|'urban'} Habitat */

export const SPECIES = [
  // --- Large waders / open-water birds: top photoability -------------------
  { code: 'grbher3', name: 'Great Blue Heron', photoability: 0.95, status: 'resident', abundance: 0.55,
    habitats: { lake: 0.9, marsh: 0.9, riparian: 0.7, grassland: 0.4 },
    note: 'Huge, sits motionless at the water’s edge — the easiest big subject in the box.' },
  { code: 'greegr', name: 'Great Egret', photoability: 0.92, status: 'resident', abundance: 0.5,
    habitats: { lake: 0.85, marsh: 0.9, riparian: 0.6, grassland: 0.5 },
    note: 'White, large, slow. Stalks shallows in the open.' },
  { code: 'snoegr', name: 'Snowy Egret', photoability: 0.85, status: 'resident', abundance: 0.4,
    habitats: { marsh: 0.85, lake: 0.7, riparian: 0.5 },
    note: 'Smaller, more active than Great Egret but still an open-water shooter.' },
  { code: 'bcnher', name: 'Black-crowned Night-Heron', photoability: 0.8, status: 'resident', abundance: 0.35,
    habitats: { marsh: 0.8, lake: 0.6, riparian: 0.7 },
    note: 'Roosts in the open by day, often low and close. Predictable perch sites.' },
  { code: 'greheron', name: 'Green Heron', photoability: 0.7, status: 'summer', abundance: 0.3,
    habitats: { marsh: 0.8, riparian: 0.7, lake: 0.6 },
    note: 'Small and skulky but works exposed snags over water; reward for patience.' },

  // --- Raptors: large, perch openly, sit still -----------------------------
  { code: 'rethaw', name: 'Red-tailed Hawk', photoability: 0.9, status: 'resident', abundance: 0.7,
    habitats: { oak: 0.9, grassland: 0.95, riparian: 0.6, chaparral: 0.6, urban: 0.5 },
    note: 'Perches on snags, poles and the tallest oaks; tolerant. The default raptor.' },
  { code: 'reshaw', name: 'Red-shouldered Hawk', photoability: 0.88, status: 'resident', abundance: 0.6,
    habitats: { riparian: 0.95, oak: 0.8, urban: 0.6, lake: 0.5 },
    note: 'River-corridor specialist; calls from open limbs, often eye-level over trails.' },
  { code: 'osprey', name: 'Osprey', photoability: 0.85, status: 'resident', abundance: 0.45,
    habitats: { lake: 0.95, riparian: 0.6 },
    note: 'Folsom/Natoma fishery. Perches on snags and pylons; spectacular plunge dives.' },
  { code: 'baleag', name: 'Bald Eagle', photoability: 0.85, status: 'winter', abundance: 0.25,
    habitats: { lake: 0.95, riparian: 0.5 },
    note: 'Folsom Lake winter bird. Big and obvious but often distant — needs reach + luck.' },
  { code: 'whtkit', name: 'White-tailed Kite', photoability: 0.82, status: 'resident', abundance: 0.35,
    habitats: { grassland: 0.95, marsh: 0.6, oak: 0.5 },
    note: 'Hovers over grassland, perches on isolated trees. Pale, photogenic, approachable.' },
  { code: 'amekes', name: 'American Kestrel', photoability: 0.78, status: 'resident', abundance: 0.45,
    habitats: { grassland: 0.9, oak: 0.6, urban: 0.5 },
    note: 'Wires and dead snags over open ground; small, so reach-limited but cooperative.' },
  { code: 'turvul', name: 'Turkey Vulture', photoability: 0.7, status: 'resident', abundance: 0.75,
    habitats: { oak: 0.7, grassland: 0.8, chaparral: 0.7, riparian: 0.6, lake: 0.5 },
    note: 'Always overhead; easy flight shots, less interesting perched.' },

  // --- Gallinaceous / ground: big, walk in the open ------------------------
  { code: 'wiltur', name: 'Wild Turkey', photoability: 0.85, status: 'resident', abundance: 0.65,
    habitats: { oak: 0.95, grassland: 0.7, riparian: 0.6, urban: 0.5 },
    note: 'Large, ground-level, displays in spring. Abundant in foothill oak.' },
  { code: 'califo', name: 'California Quail', photoability: 0.72, status: 'resident', abundance: 0.55,
    habitats: { chaparral: 0.9, oak: 0.7, grassland: 0.6, riparian: 0.5 },
    note: 'Covers run in the open at dawn; males call from low perches. Quick but workable.' },

  // --- Waterfowl: open water, often close at parks -------------------------
  { code: 'mallar3', name: 'Mallard', photoability: 0.7, status: 'resident', abundance: 0.8,
    habitats: { lake: 0.9, marsh: 0.8, riparian: 0.7, urban: 0.6 },
    note: 'Tame at every park pond; useful for light/technique practice.' },
  { code: 'wooduc', name: 'Wood Duck', photoability: 0.8, status: 'resident', abundance: 0.4,
    habitats: { riparian: 0.9, marsh: 0.6, lake: 0.5 },
    note: 'Stunning drake; shy but predictable on shaded sloughs (Effie Yeaw, Mather).' },
  { code: 'commer', name: 'Common Merganser', photoability: 0.72, status: 'resident', abundance: 0.4,
    habitats: { lake: 0.85, riparian: 0.8 },
    note: 'Rides the American River in family lines; close drift-bys from the bank.' },
  { code: 'buffle', name: 'Bufflehead', photoability: 0.68, status: 'winter', abundance: 0.4,
    habitats: { lake: 0.85, marsh: 0.5 },
    note: 'Winter diver; small and restless, but contrasty and fun on calm water.' },
  { code: 'commer2', name: 'Common Goldeneye', photoability: 0.66, status: 'winter', abundance: 0.3,
    habitats: { lake: 0.8, riparian: 0.5 },
    note: 'Winter on Folsom/Natoma; diver, keeps distance.' },
  { code: 'amecoo', name: 'American Coot', photoability: 0.6, status: 'resident', abundance: 0.7,
    habitats: { marsh: 0.85, lake: 0.8, urban: 0.5 },
    note: 'Everywhere on still water; tame but plain.' },
  { code: 'pibgre', name: 'Pied-billed Grebe', photoability: 0.62, status: 'resident', abundance: 0.45,
    habitats: { marsh: 0.85, lake: 0.7 },
    note: 'Small diver on quiet ponds; surfaces close if you stay still.' },
  { code: 'wesgre', name: 'Western Grebe', photoability: 0.66, status: 'winter', abundance: 0.3,
    habitats: { lake: 0.9 },
    note: 'Folsom open water; elegant but usually far from shore.' },
  { code: 'dccor', name: 'Double-crested Cormorant', photoability: 0.66, status: 'resident', abundance: 0.5,
    habitats: { lake: 0.85, riparian: 0.6 },
    note: 'Perches wings-spread on snags and buoys; cooperative at Natoma.' },
  { code: 'cangoo', name: 'Canada Goose', photoability: 0.62, status: 'resident', abundance: 0.75,
    habitats: { lake: 0.8, grassland: 0.7, marsh: 0.6, urban: 0.6 },
    note: 'Large and tame; good for flight/landing sequences.' },

  // --- Woodpeckers: cling in the open, drum on snags -----------------------
  { code: 'acowoo', name: 'Acorn Woodpecker', photoability: 0.85, status: 'resident', abundance: 0.6,
    habitats: { oak: 0.97, riparian: 0.5, urban: 0.5 },
    note: 'Granary oaks, clown face, totally tolerant. A foothill signature shot.' },
  { code: 'nutwoo', name: "Nuttall's Woodpecker", photoability: 0.72, status: 'resident', abundance: 0.5,
    habitats: { oak: 0.9, riparian: 0.7 },
    note: 'Oak-woodland specialist; works trunks at moderate height, fairly approachable.' },
  { code: 'norfli', name: 'Northern Flicker', photoability: 0.74, status: 'resident', abundance: 0.5,
    habitats: { oak: 0.8, riparian: 0.7, grassland: 0.6, urban: 0.5 },
    note: 'Feeds on the ground in the open in winter; big, patterned.' },
  { code: 'dowwoo', name: 'Downy Woodpecker', photoability: 0.6, status: 'resident', abundance: 0.4,
    habitats: { riparian: 0.8, oak: 0.6, urban: 0.5 },
    note: 'Small and busy but low and confiding in willows.' },

  // --- Open-perch songbirds: the bread-and-butter of a reach shooter -------
  { code: 'wesblu', name: 'Western Bluebird', photoability: 0.82, status: 'resident', abundance: 0.55,
    habitats: { oak: 0.9, grassland: 0.7, chaparral: 0.5, urban: 0.5 },
    note: 'Perches low and open on fences and snags; color + cooperation.' },
  { code: 'blkpho', name: 'Black Phoebe', photoability: 0.8, status: 'resident', abundance: 0.65,
    habitats: { riparian: 0.85, lake: 0.7, marsh: 0.7, urban: 0.6 },
    note: 'Sallies from low exposed perches over water; returns to the same spot — ideal.' },
  { code: 'saypho', name: "Say's Phoebe", photoability: 0.78, status: 'winter', abundance: 0.35,
    habitats: { grassland: 0.9, oak: 0.5, urban: 0.5 },
    note: 'Open-country flycatcher on fences and low weeds; warm tones, sits well.' },
  { code: 'weskin', name: 'Western Kingbird', photoability: 0.8, status: 'summer', abundance: 0.45,
    habitats: { grassland: 0.85, oak: 0.6, urban: 0.5 },
    note: 'Summer; conspicuous on wires and fence posts, sallies and returns.' },
  { code: 'butbla', name: "Bullock's Oriole", photoability: 0.7, status: 'summer', abundance: 0.4,
    habitats: { riparian: 0.85, oak: 0.7 },
    note: 'Brilliant orange; sings from the canopy but drops to feeders/blossoms.' },
  { code: 'wesmea', name: 'Western Meadowlark', photoability: 0.72, status: 'resident', abundance: 0.4,
    habitats: { grassland: 0.95, marsh: 0.4 },
    note: 'Sings from fence posts over grassland; flushes if pushed but workable.' },
  { code: 'amerob', name: 'American Robin', photoability: 0.7, status: 'resident', abundance: 0.7,
    habitats: { oak: 0.7, riparian: 0.7, urban: 0.7, grassland: 0.6, conifer: 0.5 },
    note: 'Lawns and fruiting trees; common practice subject.' },
  { code: 'cedwax', name: 'Cedar Waxwing', photoability: 0.7, status: 'winter', abundance: 0.45,
    habitats: { riparian: 0.8, oak: 0.6, urban: 0.6 },
    note: 'Winter flocks strip berries in the open; sleek, but mobile — work the flock.' },
  { code: 'wesszp', name: 'Western Wood-Pewee', photoability: 0.6, status: 'summer', abundance: 0.3,
    habitats: { oak: 0.7, riparian: 0.7, conifer: 0.6 },
    note: 'Exposed dead-twig perches but small and drab.' },

  // --- Jays / corvids / titmice: bold, approachable ------------------------
  { code: 'cowscj1', name: 'California Scrub-Jay', photoability: 0.8, status: 'resident', abundance: 0.7,
    habitats: { oak: 0.85, chaparral: 0.8, urban: 0.7, riparian: 0.5 },
    note: 'Loud, bold, perches in the open; will pose for peanuts.' },
  { code: 'stejay', name: "Steller's Jay", photoability: 0.78, status: 'resident', abundance: 0.35,
    habitats: { conifer: 0.9, oak: 0.5 },
    note: 'Montane edge (Sly Park); confiding at picnic areas, deep blue.' },
  { code: 'oaktit', name: 'Oak Titmouse', photoability: 0.62, status: 'resident', abundance: 0.55,
    habitats: { oak: 0.95, chaparral: 0.5, riparian: 0.4 },
    note: 'Endemic-feel foothill bird; small and active but tame and vocal.' },
  { code: 'commrav', name: 'Common Raven', photoability: 0.62, status: 'resident', abundance: 0.5,
    habitats: { oak: 0.6, grassland: 0.6, chaparral: 0.6, lake: 0.5, urban: 0.5 },
    note: 'Big and glossy; flight and croaking displays, but wary.' },

  // --- Sparrows / towhees / finches: low, open, seasonal -------------------
  { code: 'spotow', name: 'Spotted Towhee', photoability: 0.66, status: 'resident', abundance: 0.6,
    habitats: { chaparral: 0.9, oak: 0.7, riparian: 0.6 },
    note: 'Scratches in leaf litter at the edge; pops up to sing in spring — wait it out.' },
  { code: 'caltow', name: 'California Towhee', photoability: 0.6, status: 'resident', abundance: 0.6,
    habitats: { chaparral: 0.85, urban: 0.7, oak: 0.6 },
    note: 'Plain but fearless; feeds in the open underfoot.' },
  { code: 'whcspa', name: 'White-crowned Sparrow', photoability: 0.66, status: 'winter', abundance: 0.65,
    habitats: { chaparral: 0.7, riparian: 0.6, grassland: 0.6, urban: 0.6 },
    note: 'Winter flocks perch up on the bramble tops in the open; crisp and cooperative.' },
  { code: 'gockin', name: 'Golden-crowned Sparrow', photoability: 0.64, status: 'winter', abundance: 0.6,
    habitats: { chaparral: 0.7, riparian: 0.6, oak: 0.5, urban: 0.5 },
    note: 'Classic NorCal winter sparrow; feeds in the open at the edge.' },
  { code: 'lesgol', name: 'Lesser Goldfinch', photoability: 0.66, status: 'resident', abundance: 0.55,
    habitats: { oak: 0.7, riparian: 0.6, chaparral: 0.6, urban: 0.6 },
    note: 'Feeds on thistle/seed heads in the open; small but sits to feed.' },
  { code: 'houfin', name: 'House Finch', photoability: 0.6, status: 'resident', abundance: 0.7,
    habitats: { urban: 0.8, oak: 0.6, chaparral: 0.6, grassland: 0.5 },
    note: 'Ubiquitous; red males sing from exposed tips.' },

  // --- Hummingbird: tiny but perches and territorial -----------------------
  { code: 'annhum', name: "Anna's Hummingbird", photoability: 0.72, status: 'resident', abundance: 0.6,
    habitats: { urban: 0.8, oak: 0.7, chaparral: 0.7, riparian: 0.6 },
    note: 'Year-round; males perch on bare tips and display — reach-friendly if you find the perch.' },

  // --- Kingfisher: signature riparian subject ------------------------------
  { code: 'belkin1', name: 'Belted Kingfisher', photoability: 0.74, status: 'resident', abundance: 0.4,
    habitats: { riparian: 0.9, lake: 0.8, marsh: 0.6 },
    note: 'Rattles along the river, perches on bare branches over water; wary but patternable.' },

  // --- Warblers: one open one, one skulker (contrast for the model) --------
  { code: 'yerwar', name: 'Yellow-rumped Warbler', photoability: 0.6, status: 'winter', abundance: 0.7,
    habitats: { oak: 0.7, riparian: 0.7, conifer: 0.6, chaparral: 0.5 },
    note: 'Abundant in winter, feeds actively in the open mid-canopy; busy but catchable.' },
  { code: 'comyel', name: 'Common Yellowthroat', photoability: 0.45, status: 'resident', abundance: 0.4,
    habitats: { marsh: 0.9, riparian: 0.5 },
    note: 'Skulks in the tules; sings from reed tops briefly — low odds, high reward.' },

  // --- Low-photoability foils: present but hard to shoot --------------------
  { code: 'bushti', name: 'Bushtit', photoability: 0.3, status: 'resident', abundance: 0.6,
    habitats: { oak: 0.7, chaparral: 0.7, riparian: 0.6, urban: 0.6 },
    note: 'Tiny, never stops moving, travels in mobs. Present everywhere, shootable nowhere.' },
  { code: 'ruckin', name: 'Ruby-crowned Kinglet', photoability: 0.32, status: 'winter', abundance: 0.55,
    habitats: { oak: 0.7, riparian: 0.7, conifer: 0.6 },
    note: 'Frenetic winter mite; flicks constantly. Low keeper rate.' },
  { code: 'wrenti', name: 'Wrentit', photoability: 0.28, status: 'resident', abundance: 0.45,
    habitats: { chaparral: 0.9, oak: 0.4 },
    note: 'Heard far more than seen; stays buried in scrub. The classic "barren-looking but birdy" foil.' },
  { code: 'marwre', name: 'Marsh Wren', photoability: 0.35, status: 'resident', abundance: 0.4,
    habitats: { marsh: 0.95 },
    note: 'Loud in the tules, visible for two seconds at a time.' },
];

/** Quick lookup by eBird species code. */
export const SPECIES_BY_CODE = Object.fromEntries(SPECIES.map((s) => [s.code, s]));
