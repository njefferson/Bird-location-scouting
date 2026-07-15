// =============================================================================
// LIST-DRIVEN RANKING — how your lists and filters shape which birds count.
// =============================================================================
// Hotspots are always ranked by PRESENCE (Σ frequency over a working set of
// species). Three independent, opt-in tools narrow that working set. This
// module resolves ALL of them into a single spec the ranked views pass straight
// to rankHotspots(), so cards, planner, map and hotspot detail all agree:
//
//   default            → every curated species
//   Rank by presence   → only your TARGET species
//   New for me         → drop the species you've already SEEN
//   Facet filters      → keep only species matching your icon filters
//
// They compose (AND): with all on you rank spots by the presence of the
// wanted-facet targets you still NEED. Each tool keeps its own standing bar and
// one-tap exit; none ever edits a list.
//
// PHOTO-FIRST (v24): on top of the working set, the default ranking weighs each
// bird's frequency by its facet-derived shootability (model/photo.js) — present
// AND shootable. Exceptions, both deliberate:
//   - "Rank by target presence" promised frequency-only in v22 and keeps that
//     promise: while it's on, the photo weight stands aside.
//   - Turning photo-first off (standing chip / Settings) is the plain-presence
//     exit; every bird then counts equally, exactly as v23 ranked.
// =============================================================================

import { SPECIES } from '../data/species.js';
import { targetsRankActive, targetSubset } from './targets.js';
import { newBirdsActive, isSeen } from './seen.js';
import { facetsActive, applyFacetFilter } from './facets.js';
import { photoFirstOn, shootability } from './photo.js';

/**
 * The species set + weight + active modes the ranked views should use now.
 *   { species, weigh, targetsMode, newMode, facetsMode, photoMode }
 * Pass species AND weigh straight to rankHotspots so every ranked view agrees.
 * photoMode is true only when the photo weight is actually steering the
 * ranking (on, and not suspended by target-presence mode).
 */
export function rankingSpec() {
  const targetsMode = targetsRankActive();
  const newMode = newBirdsActive();
  const facetsMode = facetsActive();
  const photoMode = photoFirstOn() && !targetsMode;
  let species = targetsMode ? targetSubset() : SPECIES;
  if (newMode) species = species.filter((s) => !isSeen(s.name));
  if (facetsMode) species = applyFacetFilter(species);
  return { species, weigh: photoMode ? shootability : null, targetsMode, newMode, facetsMode, photoMode };
}

/** Any list- or filter-driven mode currently steering the ranking? */
export function anyRankingMode() {
  return targetsRankActive() || newBirdsActive() || facetsActive();
}
